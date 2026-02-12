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
      .from('chat_notification_rules')
      .select('*, chat_channels(id, channel_name, platform)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rules: data || [] })
  } catch (error) {
    console.error('[API] GET /chat/rules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { channel_id, event_pattern, site_id, template } = body

    if (!channel_id || !event_pattern) {
      return NextResponse.json({ error: 'channel_id and event_pattern are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('chat_notification_rules')
      .insert({
        user_id: user.id,
        channel_id,
        event_pattern,
        site_id: site_id || null,
        template: template || null,
      })
      .select('*, chat_channels(id, channel_name, platform)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rule: data })
  } catch (error) {
    console.error('[API] POST /chat/rules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
