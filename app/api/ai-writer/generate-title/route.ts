import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'
import { coreDispatcher } from '@/lib/core/dispatcher'
import { AIWriterModule } from '@/lib/modules/ai-writer'
import { calculateCost, DEFAULT_MODEL } from '@/lib/modules/ai-writer/pricing'
import { checkBudget } from '@/lib/utils/usage-budget'
import type { ModuleContext } from '@/lib/core/module-interface'
import type { CoreEvent } from '@/lib/core/events'

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { post_id, site_id, persona_id, keyword, tone, model: requestModel } = body
    if (!post_id || !site_id) {
      return NextResponse.json({ error: 'Missing post_id or site_id' }, { status: 400 })
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

    // Fetch user's model preference from modules_config
    const { data: moduleConfig } = await serviceClient
      .from('modules_config')
      .select('settings')
      .eq('user_id', user.id)
      .eq('module_id', 'ai-writer')
      .single()

    const model = requestModel || moduleConfig?.settings?.model || DEFAULT_MODEL

    const context: ModuleContext = {
      userId: user.id,
      siteId: site_id,
      apiKeys: { gemini: decryptedKey },
      supabase: serviceClient,
      emitEvent: async (event: CoreEvent) => { await coreDispatcher.dispatch(event, user.id) },
      settings: { ...moduleConfig?.settings, model },
    }

    // Budget check before expensive call
    const budgetCheck = await checkBudget(serviceClient, user.id, 'gemini')
    if (!budgetCheck.allowed) {
      return NextResponse.json({ error: 'Monthly budget exceeded', budget_warning: budgetCheck }, { status: 429 })
    }

    const module = new AIWriterModule()
    const result = await module.executeAction('generate_title', { post_id, site_id, persona_id, keyword, tone }, context)

    // Log usage
    if (result.usage) {
      const estimated_cost = calculateCost(
        result.usage.model,
        result.usage.prompt_tokens,
        result.usage.output_tokens
      )
      await serviceClient.from('ai_usage_log').insert({
        user_id: user.id,
        service: 'gemini',
        action: 'generate_title',
        model: result.usage.model,
        prompt_tokens: result.usage.prompt_tokens,
        output_tokens: result.usage.output_tokens,
        total_tokens: result.usage.total_tokens,
        estimated_cost,
        metadata: { post_id, site_id, keyword, tone },
      })
      result.estimated_cost = estimated_cost
    }

    // Attach budget warning if approaching limit
    if (budgetCheck.percentage >= 80) {
      result.budget_warning = { percentage: budgetCheck.percentage, currentSpend: budgetCheck.currentSpend, limit: budgetCheck.limit }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] ai-writer/generate-title error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
