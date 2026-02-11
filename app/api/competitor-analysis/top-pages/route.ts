import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CompetitorAnalysisModule } from '@/lib/modules/competitor-analysis'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/competitor-analysis/top-pages — fetch from DataForSEO and store
// Body: { competitor_id: string, limit?: number }
export async function POST(request: NextRequest) {
  try {
    const { competitor_id, limit } = await request.json()
    if (!competitor_id) {
      return NextResponse.json({ error: 'competitor_id is required' }, { status: 400 })
    }

    const { data: competitor } = await supabase
      .from('competitors')
      .select('user_id')
      .eq('id', competitor_id)
      .single()

    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })
    }

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

    const module = new CompetitorAnalysisModule()
    const result = await module.executeAction('fetch_top_pages', { competitor_id, limit }, {
      supabase,
      userId: competitor.user_id,
      apiKeys: { dataforseo: dfsCredentials },
      emitEvent: async () => {},
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Top pages error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch top pages' },
      { status: 500 }
    )
  }
}

// GET /api/competitor-analysis/top-pages?competitorId=xxx — read stored pages from DB
export async function GET(request: NextRequest) {
  try {
    const competitorId = request.nextUrl.searchParams.get('competitorId')
    if (!competitorId) {
      return NextResponse.json({ error: 'competitorId query param is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('competitor_top_pages')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('etv', { ascending: false })
      .limit(200)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ pages: data || [] })
  } catch (error) {
    console.error('Get top pages error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get top pages' },
      { status: 500 }
    )
  }
}
