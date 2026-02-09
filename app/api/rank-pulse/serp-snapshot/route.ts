import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'
import { coreDispatcher } from '@/lib/core/dispatcher'
import { RankPulseModule } from '@/lib/modules/rank-pulse'
import type { ModuleContext } from '@/lib/core/module-interface'
import type { CoreEvent } from '@/lib/core/events'

/**
 * POST /api/rank-pulse/serp-snapshot
 * Take a full SERP snapshot for a keyword via DataForSEO.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { keyword, site_id, location_code, language_code } = body

    if (!keyword) {
      return NextResponse.json(
        { error: 'Missing required field: keyword' },
        { status: 400 }
      )
    }

    // 3. Build service-role Supabase client
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 4. Decrypt the DataForSEO API key
    const { data: keyRow } = await serviceClient
      .from('api_keys')
      .select('encrypted_value')
      .eq('user_id', user.id)
      .eq('key_type', 'dataforseo')
      .single()

    if (!keyRow) {
      return NextResponse.json(
        { error: 'DataForSEO API key not configured' },
        { status: 400 }
      )
    }

    const encryptionKey = getEncryptionKey()
    const decryptedKey = await decrypt(keyRow.encrypted_value, encryptionKey)

    // 5. Build ModuleContext
    const context: ModuleContext = {
      userId: user.id,
      siteId: site_id,
      apiKeys: { dataforseo: decryptedKey },
      supabase: serviceClient,
      emitEvent: async (event: CoreEvent) => {
        await coreDispatcher.dispatch(event, user.id)
      },
    }

    // 6. Instantiate the module and execute the snapshot action
    const module = new RankPulseModule()
    const result = await module.executeAction(
      'snapshot_serp',
      {
        keyword,
        site_id: site_id || undefined,
        location_code: location_code || undefined,
        language_code: language_code || undefined,
      },
      context
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] rank-pulse/serp-snapshot error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
