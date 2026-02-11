import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createPage } from '@/lib/modules/telegraph/client'
import { coreDispatcher } from '@/lib/core/dispatcher'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/telegraph/publish
 * Publish a page to Telegraph
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { account_id, title, html_content, site_id, source_article_id, source_item_id } = body

    if (!account_id || !title || !html_content) {
      return NextResponse.json(
        { error: 'account_id, title, and html_content are required' },
        { status: 400 }
      )
    }

    // Get account
    const { data: account } = await supabase
      .from('telegraph_accounts')
      .select('access_token, author_name, author_url')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Publish to Telegraph
    const page = await createPage(
      account.access_token,
      title,
      html_content,
      account.author_name,
      account.author_url
    )

    // Store in database
    const { data: pageRecord, error } = await supabase
      .from('telegraph_pages')
      .insert({
        user_id: user.id,
        account_id,
        site_id: site_id || null,
        path: page.path,
        url: page.url,
        title: page.title,
        source_article_id: source_article_id || null,
        source_item_id: source_item_id || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to store page record' }, { status: 500 })
    }

    // Emit event
    await coreDispatcher.dispatch({
      event_type: 'telegraph.page_created',
      source_module: 'telegraph',
      payload: { path: page.path, url: page.url, title: page.title },
      site_id: site_id || undefined,
    }, user.id)

    // Update account page count (non-critical)
    const { data: acctData } = await supabase
      .from('telegraph_accounts')
      .select('page_count')
      .eq('id', account_id)
      .single()
    if (acctData) {
      await supabase
        .from('telegraph_accounts')
        .update({ page_count: (acctData.page_count || 0) + 1 })
        .eq('id', account_id)
    }

    return NextResponse.json({
      success: true,
      page: {
        id: pageRecord.id,
        path: page.path,
        url: page.url,
        title: page.title,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
