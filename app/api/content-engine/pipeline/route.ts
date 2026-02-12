import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createBackgroundTask, startTask, updateTaskProgress, completeTask, failTask } from '@/lib/utils/background-tasks'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const siteId = request.nextUrl.searchParams.get('site_id')

    let query = supabase
      .from('content_pipeline_runs')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })

    if (siteId) query = query.eq('site_id', siteId)

    const { data, error } = await query.limit(50)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ runs: data || [] })
  } catch (error) {
    console.error('[API] GET /content-engine/pipeline error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { preset, source_item_ids, cluster_id, site_id, persona_id, scheduled_publish_at } = body

    if (!preset) {
      return NextResponse.json({ error: 'preset required' }, { status: 400 })
    }

    // Get API keys
    const { data: keys } = await supabase
      .from('api_keys')
      .select('key_type, encrypted_value')
      .eq('user_id', user.id)
      .in('key_type', ['gemini', 'dataforseo'])

    const apiKeys: Record<string, string> = {}
    for (const key of keys || []) {
      apiKeys[key.key_type] = key.encrypted_value
    }

    if (!apiKeys.gemini) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 400 })
    }

    // Create the pipeline run
    const { data: run, error } = await supabase
      .from('content_pipeline_runs')
      .insert({
        user_id: user.id,
        site_id: site_id || null,
        preset,
        source_item_ids: source_item_ids || [],
        cluster_id: cluster_id || null,
        status: 'generating',
        scheduled_publish_at: scheduled_publish_at || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Start generation in the background by returning immediately
    // The actual pipeline can be tracked via GET /pipeline/[runId]
    // For now, kick off the generation
    const { ContentEngineModule } = await import('@/lib/modules/content-engine')
    const engine = new ContentEngineModule()

    // Build module context
    const context = {
      userId: user.id,
      siteId: site_id || undefined,
      apiKeys,
      supabase,
      emitEvent: async () => {},
    }

    // Create background task for tracking
    const taskId = await createBackgroundTask(
      user.id,
      'content_pipeline',
      `Content Pipeline: ${preset}`,
      { run_id: run.id, preset }
    )

    // Fire-and-forget the generation
    ;(async () => {
      try {
        await startTask(taskId)

        const result = await engine.executeAction('generate_all_sections', {
          item_ids: source_item_ids || [],
          preset,
          persona_id,
          site_id,
        }, context)

        await updateTaskProgress(taskId, 60)

        // After sections are generated, assemble
        await engine.executeAction('assemble_article', {
          run_id: run.id,
          sections: result.sections,
          topic: result.topic,
          keywords: result.keywords,
        }, context)

        await completeTask(taskId, { run_id: run.id })
      } catch (err) {
        await supabase
          .from('content_pipeline_runs')
          .update({ status: 'failed', error: err instanceof Error ? err.message : String(err) })
          .eq('id', run.id)
        await failTask(taskId, err instanceof Error ? err.message : 'Pipeline failed')
      }
    })()

    return NextResponse.json({ run, task_id: taskId }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /content-engine/pipeline error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
