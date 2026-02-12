import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { answerCallbackQuery, sendTelegramMessage } from '@/lib/modules/any-chat/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Resolve the bot token for a channel: per-channel token OR shared env token
function getBotToken(channel: Record<string, any>): string | null {
  if (channel.bot_token) return channel.bot_token
  if (channel.metadata?.mode === 'shared') return process.env.TELEGRAM_SHARED_BOT_TOKEN || null
  return null
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json()

    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query)
      return NextResponse.json({ ok: true })
    }

    if (update.message) {
      await handleMessage(update.message)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Webhook] Telegram error:', error)
    return NextResponse.json({ ok: true })
  }
}

async function handleMessage(message: Record<string, any>) {
  const chatId = String(message.chat.id)
  const text = message.text || ''

  // Handle /start with optional link code
  if (text.startsWith('/start')) {
    const parts = text.split(' ')
    const linkCode = parts[1]?.trim() || null
    await handleStartCommand(chatId, linkCode)
    return
  }

  // Store inbound message if we can find the channel
  const { data: channel } = await supabase
    .from('chat_channels')
    .select('*')
    .eq('platform', 'telegram')
    .eq('platform_chat_id', chatId)
    .limit(1)
    .maybeSingle()

  if (channel) {
    await supabase.from('chat_messages').insert({
      user_id: channel.user_id,
      channel_id: channel.id,
      direction: 'inbound',
      message_type: 'text',
      content: text,
      platform_message_id: String(message.message_id),
    })
  }
}

async function handleStartCommand(chatId: string, linkCode: string | null) {
  let channel: Record<string, any> | null = null

  if (linkCode) {
    // Shared bot: match by link_code in metadata
    const { data: channels } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('platform', 'telegram')
      .eq('platform_chat_id', '')
      .order('created_at', { ascending: false })

    channel = channels?.find(
      (c: any) => c.metadata?.link_code === linkCode
    ) || null
  }

  if (!channel) {
    // Personal bot: match by empty platform_chat_id (newest first)
    const { data: channels } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('platform', 'telegram')
      .eq('platform_chat_id', '')
      .order('created_at', { ascending: false })

    // For personal bots, pick the first unmatched channel that has a bot_token
    channel = channels?.find((c: any) => !!c.bot_token) || null
  }

  if (!channel) return

  // Update with the chat_id and clear link_code
  const updatedMetadata = { ...channel.metadata }
  delete updatedMetadata.link_code

  await supabase
    .from('chat_channels')
    .update({
      platform_chat_id: chatId,
      metadata: updatedMetadata,
    })
    .eq('id', channel.id)

  // Send welcome message
  const token = getBotToken(channel)
  if (token) {
    const botName = channel.metadata?.bot_name || 'SEO OS'
    await sendTelegramMessage(
      token,
      chatId,
      `Connected to <b>${botName}</b>!\n\nYou will receive notifications and approval requests from SEO OS here.`,
      'HTML'
    )
  }
}

async function handleCallbackQuery(callbackQuery: Record<string, any>) {
  const chatId = String(callbackQuery.message?.chat?.id || '')
  const callbackData = callbackQuery.data || ''
  const callbackQueryId = callbackQuery.id

  const parts = callbackData.split(':')
  if (parts.length < 3) return

  const action = parts[0]
  const recipeId = parts[1]
  const actionId = parts[2]
  const approved = action === 'approve'

  // Find the channel
  const { data: channel } = await supabase
    .from('chat_channels')
    .select('*')
    .eq('platform', 'telegram')
    .eq('platform_chat_id', chatId)
    .limit(1)
    .maybeSingle()

  if (!channel) return

  const token = getBotToken(channel)
  if (!token) return

  // Answer the callback query
  await answerCallbackQuery(token, callbackQueryId, approved ? 'Approved!' : 'Rejected')

  // Store response as inbound message
  await supabase.from('chat_messages').insert({
    user_id: channel.user_id,
    channel_id: channel.id,
    direction: 'inbound',
    message_type: 'approval_response',
    content: approved ? 'Approved' : 'Rejected',
    metadata: { recipe_id: recipeId, action_id: actionId, approved },
    platform_message_id: String(callbackQuery.message?.message_id || ''),
  })

  // Emit event for recipe engine
  await supabase.from('events_log').insert({
    user_id: channel.user_id,
    event_type: 'chat.approval_responded',
    source_module: 'any-chat',
    payload: { recipe_id: recipeId, action_id: actionId, approved, channel_id: channel.id },
    severity: 'info',
    status: 'pending',
    processed_by: [],
  })

  // Send confirmation
  const statusEmoji = approved ? '\u2705' : '\u274c'
  await sendTelegramMessage(
    token,
    chatId,
    `${statusEmoji} Action <b>${approved ? 'approved' : 'rejected'}</b>.`,
    'HTML'
  )
}
