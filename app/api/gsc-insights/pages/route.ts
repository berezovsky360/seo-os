import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PageAggregate {
  page: string
  clicks: number
  impressions: number
  ctr: number
  avg_position: number
  query_count: number
}

/**
 * GET /api/gsc-insights/pages
 * Fetch top pages aggregated from GSC query data.
 * Groups by page URL, sums clicks/impressions, averages position.
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
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    if (!site_id) {
      return NextResponse.json(
        { error: 'Missing required query parameter: site_id' },
        { status: 400 }
      )
    }

    // Fetch all rows for this site — we need to aggregate in JS
    // since Supabase client doesn't support GROUP BY
    const { data: rows, error } = await supabase
      .from('gsc_query_data')
      .select('page, clicks, impressions, position')
      .eq('site_id', site_id)

    if (error) {
      console.error('[API] gsc-insights/pages query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch page data' },
        { status: 500 }
      )
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ pages: [] })
    }

    // Aggregate by page
    const pageMap = new Map<string, { clicks: number; impressions: number; positionSum: number; count: number }>()

    for (const row of rows) {
      const page = row.page || 'unknown'
      const existing = pageMap.get(page)

      if (existing) {
        existing.clicks += row.clicks
        existing.impressions += row.impressions
        existing.positionSum += Number(row.position)
        existing.count += 1
      } else {
        pageMap.set(page, {
          clicks: row.clicks,
          impressions: row.impressions,
          positionSum: Number(row.position),
          count: 1,
        })
      }
    }

    // Build result array, calculate CTR and avg position
    const pages: PageAggregate[] = Array.from(pageMap.entries())
      .map(([page, data]) => ({
        page,
        clicks: data.clicks,
        impressions: data.impressions,
        ctr: data.impressions > 0
          ? Math.round((data.clicks / data.impressions) * 10000) / 10000
          : 0,
        avg_position: Math.round((data.positionSum / data.count) * 100) / 100,
        query_count: data.count,
      }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, limit)

    return NextResponse.json({ pages })
  } catch (error) {
    console.error('[API] gsc-insights/pages error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
