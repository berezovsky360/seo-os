import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CompetitorAnalysisModule } from '@/lib/modules/competitor-analysis'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/competitor-analysis/precheck
// Body: { domain: string, site_id: string }
export async function POST(request: NextRequest) {
  try {
    const { domain, site_id } = await request.json()
    if (!domain) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 })
    }
    if (!site_id) {
      return NextResponse.json({ error: 'site_id is required' }, { status: 400 })
    }

    // Get user_id from site
    const { data: site } = await supabase
      .from('sites')
      .select('user_id')
      .eq('id', site_id)
      .single()

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const user_id = site.user_id

    const { data: keyRow } = await supabase
      .from('api_keys')
      .select('encrypted_value')
      .eq('user_id', user_id)
      .eq('key_type', 'dataforseo')
      .single()

    if (!keyRow) {
      return NextResponse.json({ error: 'DataForSEO API key not configured' }, { status: 400 })
    }

    const encryptionKey = getEncryptionKey()
    const dfsCredentials = await decrypt(keyRow.encrypted_value, encryptionKey)

    const module = new CompetitorAnalysisModule()
    const result = await module.executeAction('precheck', { domain }, {
      supabase,
      userId: user_id,
      apiKeys: { dataforseo: dfsCredentials },
      emitEvent: async () => {},
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Precheck error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pre-check failed' },
      { status: 500 }
    )
  }
}
