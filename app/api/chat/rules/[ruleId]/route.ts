import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    const { ruleId } = await params
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const allowed: Record<string, any> = {}
    if (body.event_pattern !== undefined) allowed.event_pattern = body.event_pattern
    if (body.site_id !== undefined) allowed.site_id = body.site_id || null
    if (body.enabled !== undefined) allowed.enabled = body.enabled
    if (body.template !== undefined) allowed.template = body.template || null
    if (body.channel_id !== undefined) allowed.channel_id = body.channel_id

    const { data, error } = await supabase
      .from('chat_notification_rules')
      .update(allowed)
      .eq('id', ruleId)
      .eq('user_id', user.id)
      .select('*, chat_channels(id, channel_name, platform)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rule: data })
  } catch (error) {
    console.error('[API] PUT /chat/rules/[ruleId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    const { ruleId } = await params
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('chat_notification_rules')
      .delete()
      .eq('id', ruleId)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /chat/rules/[ruleId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
