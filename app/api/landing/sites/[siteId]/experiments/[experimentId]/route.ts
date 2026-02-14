import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ siteId: string; experimentId: string }> }
) {
  const { siteId, experimentId } = await params

  const { data, error } = await supabase
    .from('landing_experiments')
    .select('*')
    .eq('id', experimentId)
    .eq('landing_site_id', siteId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; experimentId: string }> }
) {
  const { siteId, experimentId } = await params
  const body = await request.json()

  const allowed: Record<string, any> = {}
  const fields = ['name', 'status', 'goal_type', 'goal_selector', 'started_at', 'ended_at', 'winner_variant_key']
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f]
  }

  // Auto-set started_at when status changes to 'running'
  if (body.status === 'running' && !body.started_at) {
    allowed.started_at = new Date().toISOString()
  }

  // Auto-set ended_at when status changes to 'completed'
  if (body.status === 'completed' && !body.ended_at) {
    allowed.ended_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('landing_experiments')
    .update(allowed)
    .eq('id', experimentId)
    .eq('landing_site_id', siteId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ siteId: string; experimentId: string }> }
) {
  const { siteId, experimentId } = await params

  const { error } = await supabase
    .from('landing_experiments')
    .delete()
    .eq('id', experimentId)
    .eq('landing_site_id', siteId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
