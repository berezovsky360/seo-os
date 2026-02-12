import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CompetitorAnatomyModule } from '@/lib/modules/competitor-anatomy'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'
import { createBackgroundTask, startTask, updateTaskProgress, completeTask, failTask } from '@/lib/utils/background-tasks'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/competitor-anatomy/crawl — Start a new crawl (fire-and-forget)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      target_domain,
      max_crawl_pages = 100,
      enable_javascript = false,
      load_resources = false,
      site_id,
      competitor_id,
      user_id,
    } = body

    if (!target_domain) {
      return NextResponse.json({ error: 'target_domain is required' }, { status: 400 })
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

    // Create background task and return immediately
    const domain = target_domain.replace(/^https?:\/\//, '')
    const taskId = await createBackgroundTask(
      user_id,
      'onpage_crawl',
      `Site Crawl: ${domain}`,
      { target_domain: domain, max_crawl_pages }
    )

    // Fire-and-forget
    ;(async () => {
      let crawlId: string | null = null

      try {
        await startTask(taskId)

        const encryptionKey = getEncryptionKey()
        const dfsCredentials = await decrypt(keyRow.encrypted_value, encryptionKey)

        const module = new CompetitorAnatomyModule()

        await updateTaskProgress(taskId, 10)

        // Start the crawl
        const crawlResult = await module.executeAction('start_crawl', {
          target_domain: domain,
          max_crawl_pages,
          enable_javascript,
          load_resources,
          site_id,
          competitor_id,
        }, {
          supabase,
          userId: user_id,
          apiKeys: { dataforseo: dfsCredentials },
          emitEvent: async () => {},
        })

        crawlId = crawlResult.crawl_id
        await updateTaskProgress(taskId, 20)

        // Poll until finished (max 30 min)
        const maxAttempts = 180
        let attempt = 0

        while (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 10000)) // 10s intervals
          attempt++

          const status = await module.executeAction('check_crawl_status', { crawl_id: crawlId }, {
            supabase,
            userId: user_id,
            apiKeys: { dataforseo: dfsCredentials },
            emitEvent: async () => {},
          })

          const progress = 20 + Math.round((status.progress / 100) * 50) // 20-70 range
          await updateTaskProgress(taskId, progress)

          if (status.is_finished) break
        }

        // Fetch all pages
        await updateTaskProgress(taskId, 75)
        let offset = 0
        const pageLimit = 100
        let totalFetched = 0

        while (true) {
          const pageResult = await module.executeAction('fetch_pages', {
            crawl_id: crawlId,
            limit: pageLimit,
            offset,
          }, {
            supabase,
            userId: user_id,
            apiKeys: { dataforseo: dfsCredentials },
            emitEvent: async () => {},
          })

          totalFetched += pageResult.stored
          if (pageResult.stored < pageLimit || totalFetched >= pageResult.total) break
          offset += pageLimit
        }

        await updateTaskProgress(taskId, 90)

        // Fetch duplicates and redirects
        await Promise.all([
          module.executeAction('fetch_duplicates', { crawl_id: crawlId }, {
            supabase,
            userId: user_id,
            apiKeys: { dataforseo: dfsCredentials },
            emitEvent: async () => {},
          }),
          module.executeAction('fetch_redirects', { crawl_id: crawlId }, {
            supabase,
            userId: user_id,
            apiKeys: { dataforseo: dfsCredentials },
            emitEvent: async () => {},
          }),
        ])

        await completeTask(taskId, { crawl_id: crawlId, pages_fetched: totalFetched })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Crawl failed'

        // Also update the onpage_crawls record so the UI reflects the failure
        if (crawlId) {
          try {
            await supabase
              .from('onpage_crawls')
              .update({ status: 'failed' })
              .eq('id', crawlId)
          } catch { /* best-effort */ }
        }

        await failTask(taskId, errorMsg)
      }
    })()

    return NextResponse.json({ task_id: taskId, status: 'queued' }, { status: 202 })
  } catch (error) {
    console.error('Crawl start error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start crawl' },
      { status: 500 }
    )
  }
}

// GET /api/competitor-anatomy/crawl — List crawls for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const domain = searchParams.get('domain')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    let query = supabase
      .from('onpage_crawls')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (domain) {
      query = query.eq('target_domain', domain)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ crawls: data || [] })
  } catch (error) {
    console.error('List crawls error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list crawls' },
      { status: 500 }
    )
  }
}
