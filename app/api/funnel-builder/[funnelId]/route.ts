import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — single funnel with full graph
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ funnelId: string }> }
) {
  const { funnelId } = await params

  const { data, error } = await supabase
    .from('funnels')
    .select('*')
    .eq('id', funnelId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// PUT — update funnel
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ funnelId: string }> }
) {
  const { funnelId } = await params
  const body = await request.json()

  const allowed = ['name', 'description', 'status', 'graph', 'config', 'site_id']
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('funnels')
    .update(updates)
    .eq('id', funnelId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — delete funnel
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ funnelId: string }> }
) {
  const { funnelId } = await params

  const { error } = await supabase
    .from('funnels')
    .delete()
    .eq('id', funnelId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
