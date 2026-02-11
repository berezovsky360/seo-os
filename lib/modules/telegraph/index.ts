// Telegraph Module — Publish articles to telegra.ph for instant indexation

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'
import * as telegraph from './client'

export class TelegraphModule implements SEOModule {
  id = 'telegraph' as const
  name = 'Telegraph'
  description = 'Publish articles to Telegraph (telegra.ph) for instant indexation and content seeding.'
  icon = 'Send'

  emittedEvents: EventType[] = [
    'telegraph.page_created',
    'telegraph.page_updated',
    'telegraph.page_views_fetched',
  ]

  handledEvents: EventType[] = [
    'swipe.approved',
    'swipe.super_liked',
    'engine.article_assembled',
  ]

  actions: ModuleAction[] = [
    {
      id: 'create_account',
      name: 'Create Telegraph Account',
      description: 'Create a new Telegraph account and store the access token',
      params: [
        { name: 'short_name', type: 'string', label: 'Short Name', required: true },
        { name: 'author_name', type: 'string', label: 'Author Name', required: false },
        { name: 'author_url', type: 'string', label: 'Author URL', required: false },
      ],
    },
    {
      id: 'publish_page',
      name: 'Publish to Telegraph',
      description: 'Publish an HTML article to Telegraph',
      params: [
        { name: 'account_id', type: 'string', label: 'Account', required: true },
        { name: 'title', type: 'string', label: 'Title', required: true },
        { name: 'html_content', type: 'string', label: 'HTML Content', required: true },
        { name: 'site_id', type: 'string', label: 'Site ID', required: false },
      ],
    },
    {
      id: 'edit_page',
      name: 'Edit Telegraph Page',
      description: 'Update an existing Telegraph page',
      params: [
        { name: 'page_id', type: 'string', label: 'Page ID (DB)', required: true },
        { name: 'title', type: 'string', label: 'Title', required: true },
        { name: 'html_content', type: 'string', label: 'HTML Content', required: true },
      ],
    },
    {
      id: 'get_views',
      name: 'Get Page Views',
      description: 'Fetch view count for a Telegraph page',
      params: [
        { name: 'page_id', type: 'string', label: 'Page ID (DB)', required: true },
      ],
    },
    {
      id: 'list_pages',
      name: 'List Published Pages',
      description: 'List all published Telegraph pages',
      params: [
        { name: 'limit', type: 'number', label: 'Limit', required: false, default: 50 },
      ],
    },
  ]

  requiredKeys: ApiKeyType[] = []

  sidebar: ModuleSidebarConfig = {
    section: 'Publishing',
    sectionColor: 'bg-sky-500',
    label: 'Telegraph',
    viewState: 'telegraph',
    order: 1,
  }

  async handleEvent(event: CoreEvent, context: ModuleContext): Promise<CoreEvent | null> {
    // Auto-publish on swipe.approved or swipe.super_liked
    if (event.event_type === 'swipe.approved' || event.event_type === 'swipe.super_liked') {
      // Check if user has a telegraph account
      const { data: accounts } = await context.supabase
        .from('telegraph_accounts')
        .select('id, access_token, author_name, author_url')
        .eq('user_id', context.userId)
        .limit(1)

      if (!accounts?.length) return null

      const account = accounts[0]
      const { item_id, item_title } = event.payload

      // Get item content
      const { data: item } = await context.supabase
        .from('content_items')
        .select('title, content, url')
        .eq('id', item_id)
        .single()

      if (!item?.content) return null

      const htmlContent = item.content + (item.url ? `<p><a href="${item.url}">Source</a></p>` : '')

      try {
        const page = await telegraph.createPage(
          account.access_token,
          item.title || item_title,
          htmlContent,
          account.author_name,
          account.author_url
        )

        await context.supabase
          .from('telegraph_pages')
          .insert({
            user_id: context.userId,
            account_id: account.id,
            site_id: event.site_id || null,
            path: page.path,
            url: page.url,
            title: page.title,
            source_item_id: item_id,
          })

        return {
          event_type: 'telegraph.page_created',
          source_module: 'telegraph',
          payload: { path: page.path, url: page.url, title: page.title, source: 'swipe' },
          site_id: event.site_id,
        }
      } catch {
        return null
      }
    }

    return null
  }

  async executeAction(
    actionId: string,
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    switch (actionId) {
      case 'create_account': return this.createAccount(params, context)
      case 'publish_page': return this.publishPage(params, context)
      case 'edit_page': return this.editPage(params, context)
      case 'get_views': return this.getViews(params, context)
      case 'list_pages': return this.listPages(params, context)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  private async createAccount(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { short_name, author_name, author_url } = params
    if (!short_name) throw new Error('short_name is required')

    const account = await telegraph.createAccount(short_name, author_name, author_url)

    const { data } = await context.supabase
      .from('telegraph_accounts')
      .insert({
        user_id: context.userId,
        short_name: account.short_name,
        author_name: account.author_name || null,
        author_url: account.author_url || null,
        access_token: account.access_token,
      })
      .select()
      .single()

    return { account_id: data?.id, short_name: account.short_name }
  }

  private async publishPage(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { account_id, title, html_content, site_id, source_article_id, source_item_id } = params
    if (!account_id || !title || !html_content) throw new Error('account_id, title, and html_content are required')

    const { data: account } = await context.supabase
      .from('telegraph_accounts')
      .select('access_token, author_name, author_url')
      .eq('id', account_id)
      .eq('user_id', context.userId)
      .single()

    if (!account) throw new Error('Telegraph account not found')

    const page = await telegraph.createPage(
      account.access_token,
      title,
      html_content,
      account.author_name,
      account.author_url
    )

    await context.supabase
      .from('telegraph_pages')
      .insert({
        user_id: context.userId,
        account_id,
        site_id: site_id || null,
        path: page.path,
        url: page.url,
        title: page.title,
        source_article_id: source_article_id || null,
        source_item_id: source_item_id || null,
      })

    await context.emitEvent({
      event_type: 'telegraph.page_created',
      source_module: 'telegraph',
      payload: { path: page.path, url: page.url, title: page.title },
      site_id,
    })

    return { path: page.path, url: page.url, title: page.title }
  }

  private async editPage(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { page_id, title, html_content } = params
    if (!page_id || !title || !html_content) throw new Error('page_id, title, and html_content are required')

    const { data: pageRecord } = await context.supabase
      .from('telegraph_pages')
      .select('path, account_id')
      .eq('id', page_id)
      .eq('user_id', context.userId)
      .single()

    if (!pageRecord) throw new Error('Page not found')

    const { data: account } = await context.supabase
      .from('telegraph_accounts')
      .select('access_token, author_name, author_url')
      .eq('id', pageRecord.account_id)
      .single()

    if (!account) throw new Error('Telegraph account not found')

    const page = await telegraph.editPage(
      account.access_token,
      pageRecord.path,
      title,
      html_content,
      account.author_name,
      account.author_url
    )

    await context.supabase
      .from('telegraph_pages')
      .update({ title: page.title, updated_at: new Date().toISOString() })
      .eq('id', page_id)

    await context.emitEvent({
      event_type: 'telegraph.page_updated',
      source_module: 'telegraph',
      payload: { path: page.path, url: page.url, title: page.title },
    })

    return { path: page.path, url: page.url, title: page.title }
  }

  private async getViews(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { page_id } = params
    if (!page_id) throw new Error('page_id is required')

    const { data: pageRecord } = await context.supabase
      .from('telegraph_pages')
      .select('path')
      .eq('id', page_id)
      .eq('user_id', context.userId)
      .single()

    if (!pageRecord) throw new Error('Page not found')

    const result = await telegraph.getPageViews(pageRecord.path)

    await context.supabase
      .from('telegraph_pages')
      .update({ views: result.views, last_views_check: new Date().toISOString() })
      .eq('id', page_id)

    return { page_id, views: result.views }
  }

  private async listPages(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const limit = params.limit || 50

    const { data: pages } = await context.supabase
      .from('telegraph_pages')
      .select('*')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return { pages: pages || [], count: pages?.length || 0 }
  }
}
