import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'
import { coreDispatcher } from '@/lib/core/dispatcher'
import { AIWriterModule } from '@/lib/modules/ai-writer'
import { calculateCost, DEFAULT_MODEL } from '@/lib/modules/ai-writer/pricing'
import { checkBudget } from '@/lib/utils/usage-budget'
import { createBackgroundTask, startTask, updateTaskProgress, completeTask, failTask } from '@/lib/utils/background-tasks'
import type { ModuleContext } from '@/lib/core/module-interface'
import type { CoreEvent } from '@/lib/core/events'

// POST /api/ai-writer/bulk-generate — fire-and-forget bulk title/description generation
export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { items, action, site_id } = body as {
      items: { id: string; post_id: string; keyword?: string }[]
      action: 'titles' | 'descriptions'
      site_id: string
    }

    if (!items?.length || !action || !site_id) {
      return NextResponse.json({ error: 'Missing items, action, or site_id' }, { status: 400 })
    }
    if (items.length > 200) {
      return NextResponse.json({ error: 'Maximum 200 items per batch' }, { status: 400 })
    }

    const label = action === 'titles' ? 'Titles' : 'Descriptions'
    const taskId = await createBackgroundTask(
      user.id,
      'bulk_generate',
      `Generate ${label} (${items.length} items)`,
      { action, site_id, item_count: items.length }
    )

    const userId = user.id

    // Fire-and-forget
    ;(async () => {
      try {
        await startTask(taskId)

        const serviceClient = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: keyRow } = await serviceClient
          .from('api_keys')
          .select('encrypted_value')
          .eq('user_id', userId)
          .eq('key_type', 'gemini')
          .single()

        if (!keyRow) {
          await failTask(taskId, 'Gemini API key not configured')
          return
        }

        const encryptionKey = getEncryptionKey()
        const decryptedKey = await decrypt(keyRow.encrypted_value, encryptionKey)

        const { data: moduleConfig } = await serviceClient
          .from('modules_config')
          .select('settings')
          .eq('user_id', userId)
          .eq('module_id', 'ai-writer')
          .single()

        const model = moduleConfig?.settings?.model || DEFAULT_MODEL

        const context: ModuleContext = {
          userId,
          siteId: site_id,
          apiKeys: { gemini: decryptedKey },
          supabase: serviceClient,
          emitEvent: async (event: CoreEvent) => { await coreDispatcher.dispatch(event, userId) },
          settings: { ...moduleConfig?.settings, model },
        }

        const module = new AIWriterModule()
        const actionName = action === 'titles' ? 'generate_title' : 'generate_description'
        const resultKey = action === 'titles' ? 'titles' : 'descriptions'

        let successCount = 0
        let failCount = 0
        const results: { id: string; value: string }[] = []

        for (let i = 0; i < items.length; i++) {
          // Budget check per iteration — stop early if exceeded
          const budgetCheck = await checkBudget(serviceClient, userId, 'gemini')
          if (!budgetCheck.allowed) {
            failCount += items.length - i
            break
          }

          const item = items[i]
          try {
            const result = await module.executeAction(actionName, {
              post_id: item.post_id,
              site_id,
              keyword: item.keyword,
            }, context)

            const generated = result[resultKey]?.[0]
            if (generated) {
              // Save directly to DB
              const isWP = item.id.startsWith('wp-')
              const dbId = item.post_id
              const table = isWP ? 'posts' : 'generated_articles'
              const field = action === 'titles' ? 'seo_title' : 'seo_description'

              await serviceClient
                .from(table)
                .update({ [field]: generated })
                .eq('id', dbId)

              results.push({ id: item.id, value: generated })
              successCount++
            } else {
              failCount++
            }

            // Log usage
            if (result.usage) {
              const estimated_cost = calculateCost(
                result.usage.model,
                result.usage.prompt_tokens,
                result.usage.output_tokens
              )
              await serviceClient.from('ai_usage_log').insert({
                user_id: userId,
                service: 'gemini',
                action: `bulk_${actionName}`,
                model: result.usage.model,
                prompt_tokens: result.usage.prompt_tokens,
                output_tokens: result.usage.output_tokens,
                total_tokens: result.usage.total_tokens,
                estimated_cost,
                metadata: { post_id: item.post_id, site_id, keyword: item.keyword },
              })
            }
          } catch (err) {
            console.error(`Bulk ${action} failed for item ${item.id}:`, err)
            failCount++
          }

          const progress = Math.round(((i + 1) / items.length) * 100)
          await updateTaskProgress(taskId, progress)
        }

        await completeTask(taskId, {
          action,
          success: successCount,
          failed: failCount,
          total: items.length,
          results,
        })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Bulk generation failed'
        await failTask(taskId, errorMsg)
      }
    })()

    return NextResponse.json({ task_id: taskId, status: 'queued' }, { status: 202 })
  } catch (error) {
    console.error('[API] ai-writer/bulk-generate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start bulk generation' },
      { status: 500 }
    )
  }
}
