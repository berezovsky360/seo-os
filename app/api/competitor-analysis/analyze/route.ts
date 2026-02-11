import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createDataForSEOClient } from '@/lib/dataforseo/client'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/competitor-analysis/analyze
// Body: { competitor_id: string }
export async function POST(request: NextRequest) {
  try {
    const { competitor_id } = await request.json()
    if (!competitor_id) {
      return NextResponse.json({ error: 'competitor_id is required' }, { status: 400 })
    }

    // Get competitor
    const { data: competitor, error: compError } = await supabase
      .from('competitors')
      .select('*')
      .eq('id', competitor_id)
      .single()

    if (compError || !competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })
    }

    // Get DataForSEO key
    const { data: keyRow } = await supabase
      .from('api_keys')
      .select('encrypted_value')
      .eq('user_id', competitor.user_id)
      .eq('key_type', 'dataforseo')
      .single()

    if (!keyRow) {
      return NextResponse.json({ error: 'DataForSEO API key not configured' }, { status: 400 })
    }

    const encryptionKey = getEncryptionKey()
    const dfsCredentials = await decrypt(keyRow.encrypted_value, encryptionKey)
    const client = createDataForSEOClient(dfsCredentials)

    // Fetch ranked keywords
    const keywords = await client.getRankedKeywords(
      competitor.domain,
      2643,
      'ru',
      500
    )

    // Upsert keywords
    if (keywords.length > 0) {
      const rows = keywords.map(kw => ({
        competitor_id,
        keyword: kw.keyword_data.keyword,
        search_volume: kw.keyword_data.search_volume,
        position: kw.ranked_serp_element.serp_item.rank_group,
        url: kw.ranked_serp_element.serp_item.url,
        keyword_difficulty: kw.keyword_data.keyword_difficulty,
        last_checked_at: new Date().toISOString(),
      }))

      const { error: upsertError } = await supabase
        .from('competitor_keywords')
        .upsert(rows, { onConflict: 'competitor_id,keyword' })

      if (upsertError) {
        console.error('Upsert error:', upsertError)
      }
    }

    // Update competitor stats
    await supabase
      .from('competitors')
      .update({
        last_synced_at: new Date().toISOString(),
        ranked_keywords_count: keywords.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', competitor_id)

    return NextResponse.json({
      success: true,
      keywords_found: keywords.length,
      domain: competitor.domain,
    })
  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
