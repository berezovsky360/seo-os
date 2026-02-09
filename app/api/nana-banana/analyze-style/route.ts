import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'
import { coreDispatcher } from '@/lib/core/dispatcher'
import { NanaBananaModule } from '@/lib/modules/nana-banana'
import type { ModuleContext } from '@/lib/core/module-interface'
import type { CoreEvent } from '@/lib/core/events'

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { site_id, image_base64 } = body
    if (!site_id || !image_base64) {
      return NextResponse.json({ error: 'Missing site_id or image_base64' }, { status: 400 })
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: keyRow } = await serviceClient
      .from('api_keys')
      .select('encrypted_value')
      .eq('user_id', user.id)
      .eq('key_type', 'gemini')
      .single()

    if (!keyRow) return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 400 })

    const encryptionKey = getEncryptionKey()
    const decryptedKey = await decrypt(keyRow.encrypted_value, encryptionKey)

    const context: ModuleContext = {
      userId: user.id,
      siteId: site_id,
      apiKeys: { gemini: decryptedKey },
      supabase: serviceClient,
      emitEvent: async (event: CoreEvent) => { await coreDispatcher.dispatch(event, user.id) },
    }

    const module = new NanaBananaModule()
    const result = await module.executeAction('analyze_style', { site_id, image_base64 }, context)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] nana-banana/analyze-style error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
