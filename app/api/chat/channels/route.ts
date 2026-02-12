import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ channels: data || [] })
  } catch (error) {
    console.error('[API] GET /chat/channels error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { platform, platform_chat_id, bot_token, channel_name, metadata } = body

    if (!platform) {
      return NextResponse.json({ error: 'platform is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('chat_channels')
      .insert({
        user_id: user.id,
        platform,
        platform_chat_id: platform_chat_id || '',
        bot_token: bot_token || null,
        channel_name: channel_name || null,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ channel: data })
  } catch (error) {
    console.error('[API] POST /chat/channels error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
