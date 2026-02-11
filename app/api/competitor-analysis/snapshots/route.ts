import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/competitor-analysis/snapshots?competitorId=xxx — historical metric snapshots
export async function GET(request: NextRequest) {
  try {
    const competitorId = request.nextUrl.searchParams.get('competitorId')
    if (!competitorId) {
      return NextResponse.json({ error: 'competitorId query param is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('competitor_snapshots')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('snapshot_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ snapshots: data || [] })
  } catch (error) {
    console.error('Get snapshots error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get snapshots' },
      { status: 500 }
    )
  }
}
