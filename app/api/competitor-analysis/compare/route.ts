import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/competitor-analysis/compare?siteId=xxx&competitorId=yyy
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
      .select('keyword, position, search_volume')
      .eq('competitor_id', competitorId)

    if (ckError) throw ckError

    // Get site keywords with positions
    const { data: siteKeywords, error: skError } = await supabase
      .from('keywords')
      .select('keyword, current_position')
      .eq('site_id', siteId)

    if (skError) throw skError

    const siteMap = new Map(
      (siteKeywords || []).map(k => [k.keyword.toLowerCase(), k.current_position as number | null])
    )

    let winning = 0
    let losing = 0
    const overlapping: {
      keyword: string
      your_position: number
      competitor_position: number
      search_volume: number | null
      winning: boolean
    }[] = []

    for (const ck of compKeywords || []) {
      const sitePos = siteMap.get(ck.keyword.toLowerCase())
      if (sitePos != null && ck.position != null) {
        const isWinning = sitePos <= ck.position
        if (isWinning) winning++
        else losing++
        overlapping.push({
          keyword: ck.keyword,
          your_position: sitePos,
          competitor_position: ck.position,
          search_volume: ck.search_volume,
          winning: isWinning,
        })
      }
    }

    overlapping.sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0))

    return NextResponse.json({
      overlapping: overlapping.slice(0, 100),
      winning,
      losing,
      total: overlapping.length,
    })
  } catch (error) {
    console.error('Compare API error:', error)
    return NextResponse.json({ error: 'Failed to compare rankings' }, { status: 500 })
  }
}
