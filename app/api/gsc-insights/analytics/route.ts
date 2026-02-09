import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/gsc-insights/analytics
 * Fetch daily GSC stats for a site within a date range.
 * Returns clicks, impressions, CTR, and average position per day.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth: server client (uses user's RLS)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const site_id = searchParams.get('site_id')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    if (!site_id) {
      return NextResponse.json(
        { error: 'Missing required query parameter: site_id' },
        { status: 400 }
      )
    }

    // Build query against daily_stats table
    let query = supabase
      .from('daily_stats')
      .select('date, gsc_clicks, gsc_impressions, gsc_ctr, gsc_position')
      .eq('site_id', site_id)

    if (start_date) {
      query = query.gte('date', start_date)
    }

    if (end_date) {
      query = query.lte('date', end_date)
    }

    query = query.order('date', { ascending: true })

    const { data: rows, error } = await query

    if (error) {
      console.error('[API] gsc-insights/analytics query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: 500 }
      )
    }

    return NextResponse.json({ analytics: rows || [] })
  } catch (error) {
    console.error('[API] gsc-insights/analytics error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
