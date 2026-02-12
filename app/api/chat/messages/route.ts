import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { TelegramAdapter } from '@/lib/modules/any-chat/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const telegramAdapter = new TelegramAdapter()

export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('channel_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (channelId) {
      query = query.eq('channel_id', channelId)
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ messages: data || [] })
  } catch (error) {
    console.error('[API] GET /chat/messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { channel_id, text } = body

    if (!channel_id || !text) {
      return NextResponse.json({ error: 'channel_id and text are required' }, { status: 400 })
    }

    // Fetch channel
    const { data: channel } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('id', channel_id)
      .eq('user_id', user.id)
      .single()

    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

    // Resolve bot token: per-channel or shared
    const botToken = channel.bot_token || (channel.metadata?.mode === 'shared' ? process.env.TELEGRAM_SHARED_BOT_TOKEN : null)
    if (!botToken || !channel.platform_chat_id) {
      return NextResponse.json({ error: 'Channel not fully configured (missing chat_id or token)' }, { status: 400 })
    }

    let platformMessageId: string | null = null

    if (channel.platform === 'telegram') {
      const result = await telegramAdapter.sendMessage(
        botToken,
        channel.platform_chat_id,
        text,
        { parse_mode: 'HTML' }
      )
      platformMessageId = result.message_id
    }

    // Store message
    const { data: msg, error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
        channel_id,
        direction: 'outbound',
        message_type: 'text',
        content: text,
        platform_message_id: platformMessageId,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: msg })
  } catch (error) {
    console.error('[API] POST /chat/messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
