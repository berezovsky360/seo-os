import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/gsc-insights/queries
 * Fetch top search queries for a site from GSC data.
 * Supports sorting, pagination via limit/offset.
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
    const sort = searchParams.get('sort') || 'impressions'
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    if (!site_id) {
      return NextResponse.json(
        { error: 'Missing required query parameter: site_id' },
        { status: 400 }
      )
    }

    // Validate sort column to prevent injection
    const allowedSortColumns = ['impressions', 'clicks', 'ctr', 'position', 'query']
    const sortColumn = allowedSortColumns.includes(sort) ? sort : 'impressions'

    // Query gsc_query_data with count for total
    const { data: rows, error, count } = await supabase
      .from('gsc_query_data')
      .select('query, page, clicks, impressions, ctr, position, date', { count: 'exact' })
      .eq('site_id', site_id)
      .order(sortColumn, { ascending: sortColumn === 'position' })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[API] gsc-insights/queries query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch query data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      queries: rows || [],
      total: count || 0,
    })
  } catch (error) {
    console.error('[API] gsc-insights/queries error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
