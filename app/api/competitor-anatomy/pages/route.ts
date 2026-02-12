import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/competitor-anatomy/pages?crawlId=&limit=&offset=&sort=&filter=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const crawlId = searchParams.get('crawlId')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const sort = searchParams.get('sort') || 'onpage_score'
    const order = searchParams.get('order') || 'desc'
    const resourceType = searchParams.get('resource_type')
    const minScore = searchParams.get('min_score')
    const maxScore = searchParams.get('max_score')
    const minWordCount = searchParams.get('min_word_count')
    const statusCode = searchParams.get('status_code')

    if (!crawlId) {
      return NextResponse.json({ error: 'crawlId is required' }, { status: 400 })
    }

    let query = supabase
      .from('onpage_pages')
      .select('*', { count: 'exact' })
      .eq('crawl_id', crawlId)

    // Filters
    if (resourceType) query = query.eq('resource_type', resourceType)
    if (minScore) query = query.gte('onpage_score', parseFloat(minScore))
    if (maxScore) query = query.lte('onpage_score', parseFloat(maxScore))
    if (minWordCount) query = query.gte('content_word_count', parseInt(minWordCount, 10))
    if (statusCode) query = query.eq('status_code', parseInt(statusCode, 10))

    // Sort
    const ascending = order === 'asc'
    query = query.order(sort, { ascending })

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ pages: data || [], total: count ?? 0 })
  } catch (error) {
    console.error('Get pages error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get pages' },
      { status: 500 }
    )
  }
}
