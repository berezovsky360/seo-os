import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { verifyBot, setTelegramWebhook } from '@/lib/modules/any-chat/telegram'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const mode = body.mode || 'personal' // 'personal' | 'shared'

    if (mode === 'shared') {
      return handleSharedBot(user.id)
    }

    return handlePersonalBot(user.id, body.bot_token)
  } catch (error) {
    console.error('[API] POST /chat/telegram/connect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handlePersonalBot(userId: string, botToken: string) {
  if (!botToken) {
    return NextResponse.json({ error: 'bot_token is required' }, { status: 400 })
  }

  const verification = await verifyBot(botToken)
  if (!verification.ok) {
    return NextResponse.json({ error: 'Invalid bot token' }, { status: 400 })
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/chat/telegram/webhook`
  await setTelegramWebhook(botToken, webhookUrl)

  const { data: channel, error } = await supabase
    .from('chat_channels')
    .insert({
      user_id: userId,
      platform: 'telegram',
      platform_chat_id: '',
      bot_token: botToken,
      channel_name: verification.botName || 'Telegram Bot',
      metadata: {
        bot_username: verification.botUsername,
        bot_name: verification.botName,
        mode: 'personal',
      },
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    channel,
    bot_username: verification.botUsername,
    bot_name: verification.botName,
    mode: 'personal',
  })
}

async function handleSharedBot(userId: string) {
  const sharedToken = process.env.TELEGRAM_SHARED_BOT_TOKEN
  if (!sharedToken) {
    return NextResponse.json({ error: 'Shared bot not configured' }, { status: 500 })
  }

  // Verify shared bot is alive
  const verification = await verifyBot(sharedToken)
  if (!verification.ok) {
    return NextResponse.json({ error: 'Shared bot is unavailable' }, { status: 500 })
  }

  // Ensure webhook is set for shared bot
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/chat/telegram/webhook`
  await setTelegramWebhook(sharedToken, webhookUrl)

  // Generate a unique link code
  const linkCode = crypto.randomBytes(4).toString('hex') // 8-char hex

  const { data: channel, error } = await supabase
    .from('chat_channels')
    .insert({
      user_id: userId,
      platform: 'telegram',
      platform_chat_id: '',
      bot_token: null, // shared bot — token from env
      channel_name: `SEO OS Bot`,
      metadata: {
        bot_username: verification.botUsername,
        bot_name: verification.botName,
        mode: 'shared',
        link_code: linkCode,
      },
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    channel,
    bot_username: verification.botUsername,
    bot_name: verification.botName,
    link_code: linkCode,
    mode: 'shared',
  })
}
