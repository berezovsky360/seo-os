import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CompetitorAnatomyModule } from '@/lib/modules/competitor-anatomy'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/competitor-anatomy/instant-audit — Run instant single-page audit
export async function POST(request: NextRequest) {
  try {
    const { url, user_id } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

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

    const module = new CompetitorAnatomyModule()
    const result = await module.executeAction('instant_audit', { url }, {
      supabase,
      userId: user_id,
      apiKeys: { dataforseo: dfsCredentials },
      emitEvent: async () => {},
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Instant audit error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Instant audit failed' },
      { status: 500 }
    )
  }
}

// GET /api/competitor-anatomy/instant-audit — List past audits
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('onpage_instant_audits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ audits: data || [] })
  } catch (error) {
    console.error('List audits error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list audits' },
      { status: 500 }
    )
  }
}
