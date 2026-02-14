import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — aggregated analytics per node
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ funnelId: string }> }
) {
  const { funnelId } = await params
  const from = request.nextUrl.searchParams.get('from')
  const to = request.nextUrl.searchParams.get('to')

  let query = supabase
    .from('funnel_events')
    .select('node_id, event_type')
    .eq('funnel_id', funnelId)

  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate counts by node_id + event_type
  const counts: Record<string, Record<string, number>> = {}
  for (const row of data || []) {
    if (!counts[row.node_id]) counts[row.node_id] = {}
    counts[row.node_id][row.event_type] = (counts[row.node_id][row.event_type] || 0) + 1
  }

  // Flatten to array
  const result = Object.entries(counts).flatMap(([nodeId, types]) =>
    Object.entries(types).map(([eventType, count]) => ({
      node_id: nodeId,
      event_type: eventType,
      count,
    }))
  )

  return NextResponse.json(result)
}
