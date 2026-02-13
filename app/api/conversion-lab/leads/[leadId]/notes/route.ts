import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserId(): Promise<string | null> {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  return user?.id || null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leadId } = await params

  // Verify ownership
  const { data: lead } = await serviceSupabase
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .eq('user_id', userId)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const { data, error } = await serviceSupabase
    .from('lead_notes')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leadId } = await params
  const body = await request.json()

  if (!body.content) return NextResponse.json({ error: 'content is required' }, { status: 400 })

  // Verify ownership
  const { data: lead } = await serviceSupabase
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .eq('user_id', userId)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const { data, error } = await serviceSupabase
    .from('lead_notes')
    .insert({
      lead_id: leadId,
      user_id: userId,
      content: body.content,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also log as interaction
  await serviceSupabase
    .from('lead_interactions')
    .insert({
      lead_id: leadId,
      event_type: 'note',
      event_data: { content: body.content.substring(0, 100) },
    })

  return NextResponse.json(data, { status: 201 })
}
