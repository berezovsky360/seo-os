/**
 * Competitor Anatomy Module — Page-level technical SEO analysis via DataForSEO On-Page API.
 *
 * Actions:
 * - start_crawl: Launch a full crawl of a competitor domain
 * - check_crawl_status: Poll crawl progress and update summary
 * - fetch_pages: Retrieve per-page SEO data from a completed crawl
 * - fetch_duplicates: Get duplicate tags and content pages
 * - fetch_redirects: Get redirect chains detected during crawl
 * - instant_audit: Quick single-page audit (no full crawl)
 * - estimate_cost: Calculate expected crawl cost
 */

import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'
import type { CoreEvent, EventType, ModuleId, ApiKeyType } from '@/lib/core/events'
import {
  estimateOnPageCost,
  type OnPageTaskConfig,
} from '@/lib/dataforseo/client'
import { createLoggedDataForSEOClient } from '@/lib/dataforseo/logged-client'

export class CompetitorAnatomyModule implements SEOModule {
  id: ModuleId = 'competitor-anatomy'
  name = 'Competitor Anatomy'
  description = 'Page-level technical SEO analysis via DataForSEO On-Page API: crawl, audit, and benchmark competitor sites.'
  icon = 'Microscope'

  emittedEvents: EventType[] = [
    'anatomy.crawl_started',
    'anatomy.crawl_progress',
    'anatomy.crawl_completed',
    'anatomy.crawl_failed',
    'anatomy.instant_audit_completed',
    'anatomy.issues_found',
  ]

  handledEvents: EventType[] = []

  actions: ModuleAction[] = [
    {
      id: 'start_crawl',
      name: 'Start Site Crawl',
      description: 'Launch a full crawl of a competitor domain via On-Page API',
      params: [
        { name: 'target_domain', type: 'string', label: 'Domain', required: true },
        { name: 'max_crawl_pages', type: 'number', label: 'Max Pages', required: false, default: 100 },
        { name: 'enable_javascript', type: 'boolean', label: 'Enable JavaScript', required: false, default: false },
        { name: 'load_resources', type: 'boolean', label: 'Load Resources', required: false, default: false },
        { name: 'site_id', type: 'string', label: 'Site ID', required: false },
        { name: 'competitor_id', type: 'string', label: 'Competitor ID', required: false },
      ],
    },
    {
      id: 'check_crawl_status',
      name: 'Check Crawl Status',
      description: 'Poll crawl progress and update summary',
      params: [
        { name: 'crawl_id', type: 'string', label: 'Crawl ID', required: true },
      ],
    },
    {
      id: 'fetch_pages',
      name: 'Fetch Crawled Pages',
      description: 'Retrieve per-page SEO data from a completed crawl',
      params: [
        { name: 'crawl_id', type: 'string', label: 'Crawl ID', required: true },
        { name: 'limit', type: 'number', label: 'Limit', required: false, default: 100 },
        { name: 'offset', type: 'number', label: 'Offset', required: false, default: 0 },
      ],
    },
    {
      id: 'fetch_duplicates',
      name: 'Fetch Duplicates',
      description: 'Get duplicate titles, descriptions, and content pages',
      params: [
        { name: 'crawl_id', type: 'string', label: 'Crawl ID', required: true },
      ],
    },
    {
      id: 'fetch_redirects',
      name: 'Fetch Redirect Chains',
      description: 'Get redirect chains detected during crawl',
      params: [
        { name: 'crawl_id', type: 'string', label: 'Crawl ID', required: true },
      ],
    },
    {
      id: 'instant_audit',
      name: 'Instant Page Audit',
      description: 'Quick single-page audit without full crawl',
      params: [
        { name: 'url', type: 'string', label: 'Page URL', required: true },
      ],
    },
    {
      id: 'estimate_cost',
      name: 'Estimate Crawl Cost',
      description: 'Calculate expected cost before starting a crawl',
      params: [
        { name: 'max_crawl_pages', type: 'number', label: 'Max Pages', required: true },
        { name: 'enable_javascript', type: 'boolean', label: 'JS', required: false },
        { name: 'load_resources', type: 'boolean', label: 'Resources', required: false },
        { name: 'enable_browser_rendering', type: 'boolean', label: 'Browser Rendering', required: false },
        { name: 'enable_content_parsing', type: 'boolean', label: 'Content Parsing', required: false },
      ],
    },
  ]

  requiredKeys: ApiKeyType[] = ['dataforseo']

  sidebar: ModuleSidebarConfig = {
    section: 'Monitoring',
    sectionColor: 'bg-violet-500',
    label: 'Anatomy',
    viewState: 'competitor-anatomy',
    order: 2,
  }

  async handleEvent(_event: CoreEvent, _context: ModuleContext): Promise<CoreEvent | null> {
    return null
  }

  async executeAction(
    actionId: string,
    params: Record<string, any>,
    context: ModuleContext,
  ): Promise<Record<string, any>> {
    switch (actionId) {
      case 'start_crawl':
        return this.startCrawl(params, context)
      case 'check_crawl_status':
        return this.checkCrawlStatus(params, context)
      case 'fetch_pages':
        return this.fetchPages(params, context)
      case 'fetch_duplicates':
        return this.fetchDuplicates(params, context)
      case 'fetch_redirects':
        return this.fetchRedirects(params, context)
      case 'instant_audit':
        return this.instantAudit(params, context)
      case 'estimate_cost':
        return this.estimateCost(params)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  // ====== Helpers ======

  private getClient(context: ModuleContext) {
    const dfsKey = context.apiKeys['dataforseo']
    if (!dfsKey) throw new Error('DataForSEO API key not configured')
    return createLoggedDataForSEOClient(dfsKey, context.supabase, context.userId)
  }

  // ====== Action Handlers ======

  private async startCrawl(
    params: Record<string, any>,
    context: ModuleContext,
  ): Promise<Record<string, any>> {
    const { target_domain, max_crawl_pages = 100, enable_javascript = false, load_resources = false, site_id, competitor_id } = params
    if (!target_domain) throw new Error('target_domain is required')

    const client = this.getClient(context)

    const crawlOptions: OnPageTaskConfig = {
      target: target_domain,
      max_crawl_pages,
      enable_javascript,
      load_resources,
    }

    const estimatedCost = estimateOnPageCost({
      maxPages: max_crawl_pages,
      enableJavascript: enable_javascript,
      loadResources: load_resources,
    })

    // Create crawl record
    const { data: crawl, error: crawlError } = await context.supabase
      .from('onpage_crawls')
      .insert({
        user_id: context.userId,
        site_id: site_id || null,
        competitor_id: competitor_id || null,
        target_domain,
        max_crawl_pages,
        crawl_options: crawlOptions,
        estimated_cost: estimatedCost,
        status: 'pending',
      })
      .select('id')
      .single()

    if (crawlError) throw new Error(`Failed to create crawl record: ${crawlError.message}`)

    // Start the crawl task in DataForSEO
    const taskId = await client.createOnPageTask(crawlOptions)

    // Update with task ID and set status to crawling
    await context.supabase
      .from('onpage_crawls')
      .update({
        task_id: taskId,
        status: 'crawling',
        started_at: new Date().toISOString(),
      })
      .eq('id', crawl.id)

    await context.emitEvent({
      event_type: 'anatomy.crawl_started',
      source_module: this.id,
      payload: { crawl_id: crawl.id, target_domain, task_id: taskId },
      severity: 'info',
    })

    return { crawl_id: crawl.id, task_id: taskId, estimated_cost: estimatedCost }
  }

  private async checkCrawlStatus(
    params: Record<string, any>,
    context: ModuleContext,
  ): Promise<Record<string, any>> {
    const { crawl_id } = params
    if (!crawl_id) throw new Error('crawl_id is required')

    const { data: crawl } = await context.supabase
      .from('onpage_crawls')
      .select('task_id, status')
      .eq('id', crawl_id)
      .single()

    if (!crawl?.task_id) throw new Error('Crawl not found or no task ID')

    const client = this.getClient(context)
    const summary = await client.getOnPageSummary(crawl.task_id)

    const maxPages = summary.crawl_status.max_crawl_pages || 1
    const crawled = summary.crawl_status.pages_crawled || 0
    const progress = Math.round((crawled / maxPages) * 100)
    const isFinished = summary.crawl_progress === 'finished'

    const update: Record<string, any> = {
      pages_crawled: crawled,
      pages_total: summary.crawl_status.pages_in_queue + crawled,
      crawl_progress: progress,
      summary,
      updated_at: new Date().toISOString(),
    }

    if (isFinished) {
      update.status = 'completed'
      update.completed_at = new Date().toISOString()
      // Set expiry 3 days from now
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 3)
      update.expires_at = expiresAt.toISOString()
    }

    await context.supabase
      .from('onpage_crawls')
      .update(update)
      .eq('id', crawl_id)

    if (isFinished) {
      await context.emitEvent({
        event_type: 'anatomy.crawl_completed',
        source_module: this.id,
        payload: { crawl_id, pages_crawled: crawled },
        severity: 'info',
      })
    }

    return { crawl_id, progress, pages_crawled: crawled, is_finished: isFinished, summary }
  }

  private async fetchPages(
    params: Record<string, any>,
    context: ModuleContext,
  ): Promise<Record<string, any>> {
    const { crawl_id, limit = 100, offset = 0 } = params
    if (!crawl_id) throw new Error('crawl_id is required')

    const { data: crawl } = await context.supabase
      .from('onpage_crawls')
      .select('task_id')
      .eq('id', crawl_id)
      .single()

    if (!crawl?.task_id) throw new Error('Crawl not found or no task ID')

    const client = this.getClient(context)
    const { items, total } = await client.getOnPagePages(crawl.task_id, limit, offset)

    // Upsert pages to DB
    if (items.length > 0) {
      const rows = items.map(item => {
        const htags = item.meta?.htags || {}
        return {
          crawl_id,
          url: item.url,
          status_code: item.status_code,
          resource_type: item.resource_type,
          media_type: item.media_type,
          size: item.size,
          encoded_size: item.encoded_size,
          total_transfer_size: item.total_transfer_size,
          fetch_time: item.fetch_time,
          onpage_score: item.onpage_score,
          meta_title: item.meta?.title,
          meta_title_length: item.meta?.title?.length ?? null,
          meta_description: item.meta?.description,
          meta_description_length: item.meta?.description?.length ?? null,
          canonical: item.meta?.canonical,
          content_word_count: item.meta?.content?.plain_text_word_count ?? null,
          content_charset: item.meta?.charset,
          h1_count: (htags['h1'] || []).length,
          h2_count: (htags['h2'] || []).length,
          h3_count: (htags['h3'] || []).length,
          h1_text: htags['h1'] || [],
          internal_links_count: item.internal_links_count,
          external_links_count: item.external_links_count,
          broken_links_count: item.broken_links,
          images_count: item.images_count,
          images_without_alt: item.images_without_alt,
          images_size: item.images_size,
          time_to_interactive: item.page_timing?.time_to_interactive ?? null,
          dom_complete: item.page_timing?.dom_complete ?? null,
          largest_contentful_paint: item.page_timing?.largest_contentful_paint ?? null,
          cumulative_layout_shift: item.page_timing?.cumulative_layout_shift ?? null,
          is_indexable: item.is_indexable,
          no_index: item.no_index,
          no_follow: item.no_follow,
          checks: item.checks,
          page_timing: item.page_timing,
          last_modified: item.last_modified,
        }
      })

      await context.supabase
        .from('onpage_pages')
        .upsert(rows, { onConflict: 'crawl_id,url' })
    }

    return { stored: items.length, total }
  }

  private async fetchDuplicates(
    params: Record<string, any>,
    context: ModuleContext,
  ): Promise<Record<string, any>> {
    const { crawl_id } = params
    if (!crawl_id) throw new Error('crawl_id is required')

    const { data: crawl } = await context.supabase
      .from('onpage_crawls')
      .select('task_id')
      .eq('id', crawl_id)
      .single()

    if (!crawl?.task_id) throw new Error('Crawl not found or no task ID')

    const client = this.getClient(context)

    const [titleDups, descDups, contentDups] = await Promise.all([
      client.getOnPageDuplicateTags(crawl.task_id, 'title'),
      client.getOnPageDuplicateTags(crawl.task_id, 'description'),
      client.getOnPageDuplicateContent(crawl.task_id),
    ])

    const rows: any[] = []

    for (const dup of titleDups) {
      const pages = dup.pages || []
      for (let i = 0; i < pages.length; i++) {
        for (let j = i + 1; j < pages.length; j++) {
          rows.push({ crawl_id, duplicate_type: 'title', url_1: pages[i].url, url_2: pages[j].url, similarity: 100 })
        }
      }
    }

    for (const dup of descDups) {
      const pages = dup.pages || []
      for (let i = 0; i < pages.length; i++) {
        for (let j = i + 1; j < pages.length; j++) {
          rows.push({ crawl_id, duplicate_type: 'description', url_1: pages[i].url, url_2: pages[j].url, similarity: 100 })
        }
      }
    }

    for (const dup of contentDups) {
      const pages = dup.pages || []
      for (let i = 0; i < pages.length; i++) {
        for (let j = i + 1; j < pages.length; j++) {
          rows.push({ crawl_id, duplicate_type: 'content', url_1: pages[i].url, url_2: pages[j].url, similarity: null })
        }
      }
    }

    if (rows.length > 0) {
      await context.supabase.from('onpage_duplicates').insert(rows)
    }

    return { title_duplicates: titleDups.length, description_duplicates: descDups.length, content_duplicates: contentDups.length, total_pairs: rows.length }
  }

  private async fetchRedirects(
    params: Record<string, any>,
    context: ModuleContext,
  ): Promise<Record<string, any>> {
    const { crawl_id } = params
    if (!crawl_id) throw new Error('crawl_id is required')

    const { data: crawl } = await context.supabase
      .from('onpage_crawls')
      .select('task_id')
      .eq('id', crawl_id)
      .single()

    if (!crawl?.task_id) throw new Error('Crawl not found or no task ID')

    const client = this.getClient(context)
    const redirects = await client.getOnPageRedirectChains(crawl.task_id)

    const rows = redirects.map(r => ({
      crawl_id,
      from_url: r.url,
      to_url: r.redirect_url,
      redirect_code: r.status_code,
      chain_length: r.chain?.length ?? 1,
      is_redirect_loop: r.is_redirect_loop,
    }))

    if (rows.length > 0) {
      await context.supabase.from('onpage_redirects').insert(rows)
    }

    return { total_redirects: rows.length }
  }

  private async instantAudit(
    params: Record<string, any>,
    context: ModuleContext,
  ): Promise<Record<string, any>> {
    const { url } = params
    if (!url) throw new Error('url is required')

    const client = this.getClient(context)
    const page = await client.getInstantPages(url)

    const htags = page.meta?.htags || {}

    const { data: audit } = await context.supabase
      .from('onpage_instant_audits')
      .insert({
        user_id: context.userId,
        url: page.url,
        onpage_score: page.onpage_score,
        meta_title: page.meta?.title,
        meta_description: page.meta?.description,
        content_word_count: page.meta?.content?.plain_text_word_count ?? null,
        h1_count: (htags['h1'] || []).length,
        internal_links: page.internal_links_count,
        external_links: page.external_links_count,
        images_count: page.images_count,
        images_without_alt: page.images_without_alt,
        status_code: page.status_code,
        is_indexable: page.is_indexable,
        checks: page.checks,
        page_timing: page.page_timing,
        raw_result: page,
      })
      .select('id')
      .single()

    await context.emitEvent({
      event_type: 'anatomy.instant_audit_completed',
      source_module: this.id,
      payload: { url, onpage_score: page.onpage_score, audit_id: audit?.id },
      severity: 'info',
    })

    return {
      audit_id: audit?.id,
      url: page.url,
      onpage_score: page.onpage_score,
      status_code: page.status_code,
      meta_title: page.meta?.title,
      meta_description: page.meta?.description,
      word_count: page.meta?.content?.plain_text_word_count ?? 0,
      h1_count: (htags['h1'] || []).length,
      internal_links: page.internal_links_count,
      external_links: page.external_links_count,
      images_count: page.images_count,
      images_without_alt: page.images_without_alt,
      is_indexable: page.is_indexable,
      checks: page.checks,
      page_timing: page.page_timing,
    }
  }

  private estimateCost(params: Record<string, any>): Record<string, any> {
    const cost = estimateOnPageCost({
      maxPages: params.max_crawl_pages || 100,
      enableJavascript: params.enable_javascript,
      loadResources: params.load_resources,
      enableBrowserRendering: params.enable_browser_rendering,
      enableContentParsing: params.enable_content_parsing,
      enableKeywordDensity: params.enable_keyword_density,
    })

    return { estimated_cost: cost, max_crawl_pages: params.max_crawl_pages || 100 }
  }
}
