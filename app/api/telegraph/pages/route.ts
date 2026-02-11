import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getPageViews } from '@/lib/modules/telegraph/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/telegraph/pages
 * List published Telegraph pages
 */
export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const { data, error } = await supabase
      .from('telegraph_pages')
      .select('*, telegraph_accounts(short_name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 })
    }

    return NextResponse.json({ success: true, pages: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/telegraph/pages
 * Refresh views for all pages (batch)
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: pages } = await supabase
      .from('telegraph_pages')
      .select('id, path')
      .eq('user_id', user.id)

    if (!pages?.length) {
      return NextResponse.json({ success: true, updated: 0 })
    }

    let updated = 0
    for (const page of pages) {
      try {
        const result = await getPageViews(page.path)
        await supabase
          .from('telegraph_pages')
          .update({
            views: result.views,
            last_views_check: new Date().toISOString(),
          })
          .eq('id', page.id)
        updated++
      } catch {
        // Skip failed pages
      }
    }

    return NextResponse.json({ success: true, updated, total: pages.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
