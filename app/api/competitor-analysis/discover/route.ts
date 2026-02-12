import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CompetitorAnalysisModule } from '@/lib/modules/competitor-analysis'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'
import { createBackgroundTask, startTask, completeTask, failTask } from '@/lib/utils/background-tasks'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/competitor-analysis/discover — discover competing domains via DataForSEO
// Body: { site_id: string }
export async function POST(request: NextRequest) {
  try {
    const { site_id } = await request.json()
    if (!site_id) {
      return NextResponse.json({ error: 'site_id is required' }, { status: 400 })
    }

    const { data: site } = await supabase
      .from('sites')
      .select('user_id, url')
      .eq('id', site_id)
      .single()

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const { data: keyRow } = await supabase
      .from('api_keys')
      .select('encrypted_value')
      .eq('user_id', site.user_id)
      .eq('key_type', 'dataforseo')
      .single()

    if (!keyRow) {
      return NextResponse.json({ error: 'DataForSEO API key not configured' }, { status: 400 })
    }

    const domain = (site.url || '').replace(/^https?:\/\//, '').replace(/\/$/, '')

    // Create background task and return immediately
    const taskId = await createBackgroundTask(
      site.user_id,
      'competitor_discover',
      `Discover Competitors: ${domain}`,
      { site_id }
    )

    // Fire-and-forget
    ;(async () => {
      try {
        await startTask(taskId)

        const encryptionKey = getEncryptionKey()
        const dfsCredentials = await decrypt(keyRow.encrypted_value, encryptionKey)

        const module = new CompetitorAnalysisModule()
        const result = await module.executeAction('discover_competitors', { site_id }, {
          supabase,
          userId: site.user_id,
          apiKeys: { dataforseo: dfsCredentials },
          emitEvent: async () => {},
        })

        await completeTask(taskId, result)
      } catch (err) {
        await failTask(taskId, err instanceof Error ? err.message : 'Failed to discover competitors')
      }
    })()

    return NextResponse.json({ task_id: taskId, status: 'queued' }, { status: 202 })
  } catch (error) {
    console.error('Discover error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to discover competitors' },
      { status: 500 }
    )
  }
}

// GET /api/competitor-analysis/discover?siteId=xxx — read stored discoveries from DB
export async function GET(request: NextRequest) {
  try {
    const siteId = request.nextUrl.searchParams.get('siteId')
    if (!siteId) {
      return NextResponse.json({ error: 'siteId query param is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('competitor_discoveries')
      .select('*')
      .eq('site_id', siteId)
      .order('intersections', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ discoveries: data || [] })
  } catch (error) {
    console.error('Get discoveries error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get discoveries' },
      { status: 500 }
    )
  }
}
