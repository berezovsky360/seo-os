import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST — record a funnel event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ funnelId: string }> }
) {
  const { funnelId } = await params
  const body = await request.json()

  const { node_id, event_type, visitor_id, lead_id, metadata } = body

  if (!node_id || !event_type) {
    return NextResponse.json({ error: 'node_id and event_type are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('funnel_events')
    .insert({
      funnel_id: funnelId,
      node_id,
      event_type,
      visitor_id: visitor_id || null,
      lead_id: lead_id || null,
      metadata: metadata || {},
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
