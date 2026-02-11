import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/rank-pulse/summary — aggregated keyword stats across all sites
export async function GET() {
  try {
    const { data: keywords, error } = await supabase
      .from('keywords')
      .select('id, current_position, previous_position')

    if (error) throw error

    const all = keywords || []
    const total = all.length
    const withPosition = all.filter(k => k.current_position !== null)
    const avgPosition = withPosition.length > 0
      ? Math.round((withPosition.reduce((sum, k) => sum + k.current_position!, 0) / withPosition.length) * 10) / 10
      : 0

    let improved = 0
    let dropped = 0

    for (const k of all) {
      if (k.current_position !== null && k.previous_position !== null) {
        if (k.current_position < k.previous_position) improved++
        else if (k.current_position > k.previous_position) dropped++
      }
    }

    return NextResponse.json({
      total,
      avgPosition,
      improved,
      dropped,
    })
  } catch (error) {
    console.error('Rank Pulse summary error:', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
