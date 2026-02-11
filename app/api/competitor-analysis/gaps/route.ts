import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/competitor-analysis/gaps?siteId=xxx&competitorId=yyy
export async function GET(request: NextRequest) {
  try {
    const siteId = request.nextUrl.searchParams.get('siteId')
    const competitorId = request.nextUrl.searchParams.get('competitorId')

    if (!siteId || !competitorId) {
      return NextResponse.json({ error: 'siteId and competitorId are required' }, { status: 400 })
    }

    // Get competitor keywords
    const { data: compKeywords, error: ckError } = await supabase
      .from('competitor_keywords')
      .select('keyword, search_volume, position, url, keyword_difficulty')
      .eq('competitor_id', competitorId)
      .order('search_volume', { ascending: false })
      .limit(200)

    if (ckError) throw ckError

    // Get site's own keywords
    const { data: siteKeywords, error: skError } = await supabase
      .from('keywords')
      .select('keyword')
      .eq('site_id', siteId)

    if (skError) throw skError

    const siteKeywordSet = new Set(
      (siteKeywords || []).map(k => k.keyword.toLowerCase())
    )

    // Gaps = competitor has it, site doesn't
    const gaps = (compKeywords || [])
      .filter(ck => !siteKeywordSet.has(ck.keyword.toLowerCase()))
      .slice(0, 100)

    return NextResponse.json({ gaps, total: gaps.length })
  } catch (error) {
    console.error('Gaps API error:', error)
    return NextResponse.json({ error: 'Failed to compute keyword gaps' }, { status: 500 })
  }
}
