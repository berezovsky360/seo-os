import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CompetitorAnalysisModule } from '@/lib/modules/competitor-analysis'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/competitor-analysis/overview
// Body: { competitor_id: string }
export async function POST(request: NextRequest) {
  try {
    const { competitor_id } = await request.json()
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
    const result = await module.executeAction('fetch_overview', { competitor_id }, {
      supabase,
      userId: competitor.user_id,
      apiKeys: { dataforseo: dfsCredentials },
      emitEvent: async () => {},
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Overview error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch overview' },
      { status: 500 }
    )
  }
}
