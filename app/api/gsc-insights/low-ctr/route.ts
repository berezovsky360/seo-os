import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface LowCTRPage {
  page: string
  clicks: number
  impressions: number
  ctr: number
  avg_position: number
  query_count: number
}

/**
 * GET /api/gsc-insights/low-ctr
 * Find pages with high impressions but low click-through rate.
 * Useful for identifying title/meta description optimization opportunities.
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
    const max_ctr = parseFloat(searchParams.get('max_ctr') || '2')
    const min_impressions = parseInt(searchParams.get('min_impressions') || '100', 10)

    if (!site_id) {
      return NextResponse.json(
        { error: 'Missing required query parameter: site_id' },
        { status: 400 }
      )
    }

    // Convert percentage to decimal for comparison (e.g. 2% -> 0.02)
    const maxCtrDecimal = max_ctr / 100

    // Query rows where impressions >= min and ctr <= threshold
    const { data: rows, error } = await supabase
      .from('gsc_query_data')
      .select('page, clicks, impressions, ctr, position')
      .eq('site_id', site_id)
      .gte('impressions', min_impressions)
      .lte('ctr', maxCtrDecimal)

    if (error) {
      console.error('[API] gsc-insights/low-ctr query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch low CTR data' },
        { status: 500 }
      )
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ pages: [] })
    }

    // Group by page and aggregate
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

    // Recalculate CTR per page and filter
    const pages: LowCTRPage[] = Array.from(pageMap.entries())
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
      .filter(p => p.ctr < maxCtrDecimal)
      .sort((a, b) => b.impressions - a.impressions)

    return NextResponse.json({ pages })
  } catch (error) {
    console.error('[API] gsc-insights/low-ctr error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
