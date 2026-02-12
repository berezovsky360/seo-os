import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('id', channelId)
      .eq('user_id', user.id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    return NextResponse.json({ channel: data })
  } catch (error) {
    console.error('[API] GET /chat/channels/[channelId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const allowed: Record<string, any> = {}
    if (body.channel_name !== undefined) allowed.channel_name = body.channel_name
    if (body.is_active !== undefined) allowed.is_active = body.is_active

    const { data, error } = await supabase
      .from('chat_channels')
      .update(allowed)
      .eq('id', channelId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ channel: data })
  } catch (error) {
    console.error('[API] PUT /chat/channels/[channelId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('chat_channels')
      .delete()
      .eq('id', channelId)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /chat/channels/[channelId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
