import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'
import { GSCInsightsModule } from '@/lib/modules/gsc-insights'
import { coreDispatcher } from '@/lib/core/dispatcher'
import type { ModuleContext } from '@/lib/core/module-interface'
import type { CoreEvent } from '@/lib/core/events'

/**
 * POST /api/gsc-insights/sync
 * Trigger a GSC data sync for a given site.
 * Pulls daily stats + query-level data from Google Search Console.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth: get user from Supabase server client
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { site_id, days } = body

    if (!site_id) {
      return NextResponse.json(
        { error: 'Missing required field: site_id' },
        { status: 400 }
      )
    }

    // Create service role client for DB writes
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Decrypt the GSC API key from api_keys table
    const { data: keyRow, error: keyError } = await serviceClient
      .from('api_keys')
      .select('encrypted_value')
      .eq('user_id', user.id)
      .eq('key_type', 'gsc')
      .single()

    if (keyError || !keyRow) {
      return NextResponse.json(
        { error: 'GSC API key not configured. Add your Google Search Console credentials first.' },
        { status: 400 }
      )
    }

    const encryptionKey = getEncryptionKey()
    const gscKey = await decrypt(keyRow.encrypted_value, encryptionKey)

    // Build ModuleContext manually
    const context: ModuleContext = {
      userId: user.id,
      siteId: site_id,
      apiKeys: { gsc: gscKey },
      supabase: serviceClient,
      emitEvent: async (event: CoreEvent) => {
        await coreDispatcher.dispatch(event, user.id)
      },
    }

    // Instantiate GSCInsightsModule and execute sync_data action
    const module = new GSCInsightsModule()
    const result = await module.executeAction('sync_data', { site_id, days }, context)

    return NextResponse.json({
      status: 'synced',
      daily_rows: result.daily_rows,
      query_rows: result.query_rows,
      new_keywords: result.new_keywords,
    })
  } catch (error) {
    console.error('[API] gsc-insights/sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
