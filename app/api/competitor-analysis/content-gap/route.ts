import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CompetitorAnalysisModule } from '@/lib/modules/competitor-analysis'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/competitor-analysis/content-gap
// Body: { site_id: string, competitor_id: string }
export async function POST(request: NextRequest) {
  try {
    const { site_id, competitor_id } = await request.json()
    if (!site_id || !competitor_id) {
      return NextResponse.json({ error: 'site_id and competitor_id are required' }, { status: 400 })
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
    const result = await module.executeAction('content_gap', { site_id, competitor_id }, {
      supabase,
      userId: competitor.user_id,
      apiKeys: { dataforseo: dfsCredentials },
      emitEvent: async () => {},
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Content gap error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Content gap analysis failed' },
      { status: 500 }
    )
  }
}
