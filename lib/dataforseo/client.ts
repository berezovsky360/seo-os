/**
 * DataForSEO API Client
 *
 * Provides access to SERP data, keyword volumes, and ranked keywords.
 * Auth: Basic (login:password). Base URL: https://api.dataforseo.com/v3
 */

// ====== Types ======

export interface DataForSEOConfig {
  login: string
  password: string
}

export interface SERPItem {
  type: string                    // 'organic', 'featured_snippet', 'local_pack', etc.
  rank_group: number              // Position among organic results (1, 2, 3...)
  rank_absolute: number           // Absolute position including all SERP features
  domain: string
  url: string
  title: string
  description: string
  breadcrumb: string | null
}

export interface SERPResult {
  keyword: string
  check_url: string
  items_count: number
  items: SERPItem[]
  se_results_count: number
}

export interface KeywordVolumeData {
  keyword: string
  search_volume: number | null
  competition: number | null       // 0–1 scale
  competition_level: string | null // LOW, MEDIUM, HIGH
  cpc: number | null
  monthly_searches: { year: number; month: number; search_volume: number }[] | null
}

export interface RankedKeywordItem {
  keyword_data: {
    keyword: string
    search_volume: number | null
    keyword_difficulty: number | null
  }
  ranked_serp_element: {
    serp_item: {
      rank_group: number
      url: string
    }
  }
}

export interface DataForSEOBalance {
  balance: number
  currency: string
}

// ====== DataForSEO Labs Types ======

export interface DomainOverview {
  organic: {
    etv: number
    count: number
    is_up: number
    is_down: number
    is_new: number
    is_lost: number
    pos_1: number
    pos_2_3: number
    pos_4_10: number
    pos_11_20: number
    pos_21_30: number
    pos_31_40: number
    pos_41_50: number
    pos_51_60: number
    pos_61_70: number
    pos_71_80: number
    pos_81_90: number
    pos_91_100: number
  }
  organic_is_paid: number
  domain_rank: number
  backlinks_info: {
    referring_domains: number
    backlinks: number
  }
}

export interface TopPageItem {
  page_address: string
  main_domain: string
  metrics: {
    organic: {
      etv: number
      count: number
      pos_1: number
      pos_2_3: number
      pos_4_10: number
    }
  }
}

export interface DiscoveredCompetitorItem {
  domain: string
  avg_position: number
  sum_position: number
  intersections: number
  full_domain_metrics: {
    organic: { etv: number; count: number }
  }
}

export interface DomainIntersectionItem {
  keyword: string
  search_volume: number | null
  keyword_difficulty: number | null
  first_domain_position: number | null
  second_domain_position: number | null
  first_domain_url: string | null
}

// ====== On-Page API Types ======

export interface OnPageTaskConfig {
  target: string
  max_crawl_pages?: number
  load_resources?: boolean
  enable_javascript?: boolean
  enable_browser_rendering?: boolean
  enable_content_parsing?: boolean
  calculate_keyword_density?: boolean
  store_raw_html?: boolean
  custom_user_agent?: string
}

export interface OnPageSummary {
  crawl_progress: string
  crawl_status: {
    max_crawl_pages: number
    pages_in_queue: number
    pages_crawled: number
  }
  crawl_gateway_address: string
  page_metrics: Record<string, any>
  domain_info: {
    name: string
    cms: string | null
    ip: string
    server: string
    crawl_start: string
    crawl_end: string | null
  }
}

export interface OnPagePageItem {
  url: string
  status_code: number
  resource_type: string
  media_type: string
  size: number
  encoded_size: number
  total_transfer_size: number
  fetch_time: number
  meta: {
    title: string | null
    description: string | null
    charset: string | null
    canonical: string | null
    htags: Record<string, string[]>
    content: {
      plain_text_size: number
      plain_text_rate: number
      plain_text_word_count: number
    } | null
  }
  page_timing: {
    time_to_interactive: number | null
    dom_complete: number | null
    largest_contentful_paint: number | null
    cumulative_layout_shift: number | null
  } | null
  onpage_score: number
  checks: Record<string, boolean>
  content_encoding: string | null
  internal_links_count: number
  external_links_count: number
  broken_links: number
  images_count: number
  images_without_alt: number
  images_size: number
  is_indexable: boolean
  no_index: boolean
  no_follow: boolean
  last_modified: string | null
}

export interface OnPageDuplicateItem {
  accumulator: string
  pages: { url: string }[]
  total_count: number
}

export interface OnPageRedirectItem {
  url: string
  redirect_url: string
  status_code: number
  is_redirect_loop: boolean
  chain: { url: string; status_code: number }[]
}

// ====== Cost Estimation Utilities ======

export function estimateOnPageCost(config: {
  maxPages: number
  loadResources?: boolean
  enableJavascript?: boolean
  enableBrowserRendering?: boolean
  enableContentParsing?: boolean
  enableKeywordDensity?: boolean
}): number {
  const baseCostPerPage = 0.000125
  let coefficient = 1
  if (config.enableBrowserRendering) {
    coefficient += 33
  } else {
    if (config.loadResources) coefficient += 2
    if (config.enableJavascript) coefficient += 9
  }
  if (config.enableContentParsing) coefficient += 1
  if (config.enableKeywordDensity) coefficient += 1
  return config.maxPages * baseCostPerPage * coefficient
}

export function estimateLabsCost(config: {
  domainOverview?: boolean
  rankedKeywords?: number
  topPages?: number
  domainIntersection?: number
  competitorsDomain?: boolean
}): { breakdown: Record<string, number>; total: number } {
  const BASE = 0.01
  const PER_ROW = 0.0001
  const breakdown: Record<string, number> = {}

  if (config.domainOverview) {
    breakdown['Domain Overview'] = BASE + (5 * PER_ROW)
  }
  if (config.rankedKeywords) {
    breakdown['Ranked Keywords'] = BASE + (config.rankedKeywords * PER_ROW)
  }
  if (config.topPages) {
    breakdown['Top Pages'] = BASE + (config.topPages * PER_ROW)
  }
  if (config.domainIntersection) {
    breakdown['Domain Intersection'] = BASE + (config.domainIntersection * PER_ROW)
  }
  if (config.competitorsDomain) {
    breakdown['Competitors Domain'] = BASE + (20 * PER_ROW)
  }

  const total = Object.values(breakdown).reduce((s, v) => s + v, 0)
  return { breakdown, total }
}

// ====== Errors ======

export class DataForSEOError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public apiCode?: number,
  ) {
    super(message)
    this.name = 'DataForSEOError'
  }
}

// ====== Client ======

export class DataForSEOClient {
  private baseUrl = 'https://api.dataforseo.com/v3'
  private auth: string

  constructor(config: DataForSEOConfig) {
    this.auth = 'Basic ' + Buffer.from(`${config.login}:${config.password}`).toString('base64')
  }

  // Core request wrapper with error handling
  private async request<T>(endpoint: string, body: any[], method: 'POST' | 'GET' = 'POST'): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
    }
    if (method === 'POST' && body.length > 0) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)

    if (response.status === 429) {
      throw new DataForSEOError('Rate limit exceeded. Please wait before retrying.', 429)
    }

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      throw new DataForSEOError(`DataForSEO API error: ${response.status} ${text}`, response.status)
    }

    const data = await response.json()

    if (data.status_code !== 20000) {
      throw new DataForSEOError(
        data.status_message || 'DataForSEO API returned an error',
        response.status,
        data.status_code,
      )
    }

    return data
  }

  /**
   * Check SERP positions for a batch of keywords.
   * Batches into groups of 100 (API limit per request).
   */
  async checkPositions(
    keywords: string[],
    locationCode: number = 2643,
    languageCode: string = 'ru',
  ): Promise<Map<string, SERPResult>> {
    const results = new Map<string, SERPResult>()
    if (keywords.length === 0) return results

    // Batch into groups of 100
    const batches: string[][] = []
    for (let i = 0; i < keywords.length; i += 100) {
      batches.push(keywords.slice(i, i + 100))
    }

    for (const batch of batches) {
      const tasks = batch.map(keyword => ({
        keyword,
        location_code: locationCode,
        language_code: languageCode,
        device: 'desktop',
        os: 'windows',
        depth: 100,
      }))

      const data = await this.request<any>('/serp/google/organic/live/advanced', tasks)

      if (data.tasks) {
        for (const task of data.tasks) {
          if (task.status_code !== 20000 || !task.result?.[0]) continue

          const result = task.result[0]
          const keyword = task.data?.keyword || ''

          results.set(keyword, {
            keyword,
            check_url: result.check_url || '',
            items_count: result.items_count || 0,
            se_results_count: result.se_results_count || 0,
            items: (result.items || []).map((item: any) => ({
              type: item.type || 'organic',
              rank_group: item.rank_group || 0,
              rank_absolute: item.rank_absolute || 0,
              domain: item.domain || '',
              url: item.url || '',
              title: item.title || '',
              description: item.description || '',
              breadcrumb: item.breadcrumb || null,
            })),
          })
        }
      }
    }

    return results
  }

  /**
   * Get search volume data for keywords.
   * Batches into groups of 700 (API limit).
   */
  async getSearchVolume(
    keywords: string[],
    locationCode: number = 2643,
    languageCode: string = 'ru',
  ): Promise<KeywordVolumeData[]> {
    const results: KeywordVolumeData[] = []
    if (keywords.length === 0) return results

    // Batch into groups of 700
    const batches: string[][] = []
    for (let i = 0; i < keywords.length; i += 700) {
      batches.push(keywords.slice(i, i + 700))
    }

    for (const batch of batches) {
      const data = await this.request<any>(
        '/keywords_data/google_ads/search_volume/live',
        [{ keywords: batch, location_code: locationCode, language_code: languageCode }],
      )

      if (data.tasks?.[0]?.result) {
        for (const item of data.tasks[0].result) {
          results.push({
            keyword: item.keyword || '',
            search_volume: item.search_volume ?? null,
            competition: item.competition ?? null,
            competition_level: item.competition_level ?? null,
            cpc: item.cpc ?? null,
            monthly_searches: item.monthly_searches ?? null,
          })
        }
      }
    }

    return results
  }

  /**
   * Discover what keywords a domain ranks for.
   */
  async getRankedKeywords(
    domain: string,
    locationCode: number = 2643,
    languageCode: string = 'ru',
    limit: number = 100,
  ): Promise<RankedKeywordItem[]> {
    const data = await this.request<any>(
      '/dataforseo_labs/google/ranked_keywords/live',
      [{
        target: domain,
        location_code: locationCode,
        language_code: languageCode,
        limit,
        order_by: ['ranked_serp_element.serp_item.rank_group,asc'],
      }],
    )

    const items: RankedKeywordItem[] = []
    if (data.tasks?.[0]?.result?.[0]?.items) {
      for (const item of data.tasks[0].result[0].items) {
        items.push({
          keyword_data: {
            keyword: item.keyword_data?.keyword || '',
            search_volume: item.keyword_data?.keyword_info?.search_volume ?? null,
            keyword_difficulty: item.keyword_data?.keyword_properties?.keyword_difficulty ?? null,
          },
          ranked_serp_element: {
            serp_item: {
              rank_group: item.ranked_serp_element?.serp_item?.rank_group || 0,
              url: item.ranked_serp_element?.serp_item?.relative_url || '',
            },
          },
        })
      }
    }

    return items
  }

  /**
   * Get domain rank overview (traffic, keyword distribution, backlinks).
   */
  async getDomainOverview(
    domain: string,
    locationCode: number = 2643,
    languageCode: string = 'ru',
  ): Promise<DomainOverview> {
    const data = await this.request<any>(
      '/dataforseo_labs/google/domain_rank_overview/live',
      [{ target: domain, location_code: locationCode, language_code: languageCode }],
    )

    const result = data.tasks?.[0]?.result?.[0]
    if (!result) throw new DataForSEOError('No overview data returned', 200)

    const m = result.metrics || {}
    const org = m.organic || {}
    return {
      organic: {
        etv: org.etv ?? 0,
        count: org.count ?? 0,
        is_up: org.is_up ?? 0,
        is_down: org.is_down ?? 0,
        is_new: org.is_new ?? 0,
        is_lost: org.is_lost ?? 0,
        pos_1: org.pos_1 ?? 0,
        pos_2_3: org.pos_2_3 ?? 0,
        pos_4_10: org.pos_4_10 ?? 0,
        pos_11_20: org.pos_11_20 ?? 0,
        pos_21_30: org.pos_21_30 ?? 0,
        pos_31_40: org.pos_31_40 ?? 0,
        pos_41_50: org.pos_41_50 ?? 0,
        pos_51_60: org.pos_51_60 ?? 0,
        pos_61_70: org.pos_61_70 ?? 0,
        pos_71_80: org.pos_71_80 ?? 0,
        pos_81_90: org.pos_81_90 ?? 0,
        pos_91_100: org.pos_91_100 ?? 0,
      },
      organic_is_paid: m.organic_is_paid ?? 0,
      domain_rank: result.domain_rank ?? 0,
      backlinks_info: {
        referring_domains: result.backlinks_info?.referring_domains ?? 0,
        backlinks: result.backlinks_info?.backlinks ?? 0,
      },
    }
  }

  /**
   * Get top pages for a domain sorted by estimated organic traffic.
   */
  async getTopPages(
    domain: string,
    locationCode: number = 2643,
    languageCode: string = 'ru',
    limit: number = 100,
  ): Promise<TopPageItem[]> {
    const data = await this.request<any>(
      '/dataforseo_labs/google/top_pages/live',
      [{
        target: domain,
        location_code: locationCode,
        language_code: languageCode,
        limit,
        order_by: ['metrics.organic.etv,desc'],
      }],
    )

    const items: TopPageItem[] = []
    if (data.tasks?.[0]?.result?.[0]?.items) {
      for (const item of data.tasks[0].result[0].items) {
        const org = item.metrics?.organic || {}
        items.push({
          page_address: item.page_address || '',
          main_domain: item.main_domain || '',
          metrics: {
            organic: {
              etv: org.etv ?? 0,
              count: org.count ?? 0,
              pos_1: org.pos_1 ?? 0,
              pos_2_3: org.pos_2_3 ?? 0,
              pos_4_10: org.pos_4_10 ?? 0,
            },
          },
        })
      }
    }

    return items
  }

  /**
   * Discover competing domains based on keyword overlap.
   */
  async getCompetitorsDomain(
    domain: string,
    locationCode: number = 2643,
    languageCode: string = 'ru',
    limit: number = 20,
  ): Promise<DiscoveredCompetitorItem[]> {
    const data = await this.request<any>(
      '/dataforseo_labs/google/competitors_domain/live',
      [{
        target: domain,
        location_code: locationCode,
        language_code: languageCode,
        limit,
      }],
    )

    const items: DiscoveredCompetitorItem[] = []
    if (data.tasks?.[0]?.result?.[0]?.items) {
      for (const item of data.tasks[0].result[0].items) {
        const org = item.full_domain_metrics?.organic || {}
        items.push({
          domain: item.domain || '',
          avg_position: item.avg_position ?? 0,
          sum_position: item.sum_position ?? 0,
          intersections: item.intersections ?? 0,
          full_domain_metrics: {
            organic: { etv: org.etv ?? 0, count: org.count ?? 0 },
          },
        })
      }
    }

    return items
  }

  /**
   * Get domain intersection — keywords one domain ranks for but another does not.
   */
  async getDomainIntersection(
    competitorDomain: string,
    yourDomain: string,
    locationCode: number = 2643,
    languageCode: string = 'ru',
    limit: number = 200,
  ): Promise<DomainIntersectionItem[]> {
    const data = await this.request<any>(
      '/dataforseo_labs/google/domain_intersection/live',
      [{
        target1: competitorDomain,
        target2: yourDomain,
        location_code: locationCode,
        language_code: languageCode,
        intersections: { '1': 'target1_not_target2' },
        item_types: ['organic'],
        limit,
        order_by: ['first_domain_serp_element.serp_item.keyword_data.keyword_info.search_volume,desc'],
      }],
    )

    const items: DomainIntersectionItem[] = []
    if (data.tasks?.[0]?.result?.[0]?.items) {
      for (const item of data.tasks[0].result[0].items) {
        const kwData = item.first_domain_serp_element?.serp_item?.keyword_data
        const kwInfo = kwData?.keyword_info || {}
        const kwProps = kwData?.keyword_properties || {}
        items.push({
          keyword: kwData?.keyword || '',
          search_volume: kwInfo.search_volume ?? null,
          keyword_difficulty: kwProps.keyword_difficulty ?? null,
          first_domain_position: item.first_domain_serp_element?.serp_item?.rank_group ?? null,
          second_domain_position: null, // target2 doesn't rank (that's the filter)
          first_domain_url: item.first_domain_serp_element?.serp_item?.relative_url ?? null,
        })
      }
    }

    return items
  }

  // ====== On-Page API Methods ======

  /**
   * Create an On-Page crawl task.
   */
  async createOnPageTask(config: OnPageTaskConfig): Promise<string> {
    const task: Record<string, any> = {
      target: config.target,
      max_crawl_pages: config.max_crawl_pages ?? 100,
    }
    if (config.load_resources !== undefined) task.load_resources = config.load_resources
    if (config.enable_javascript !== undefined) task.enable_javascript = config.enable_javascript
    if (config.enable_browser_rendering !== undefined) task.enable_browser_rendering = config.enable_browser_rendering
    if (config.enable_content_parsing !== undefined) task.enable_content_parsing = config.enable_content_parsing
    if (config.calculate_keyword_density !== undefined) task.calculate_keyword_density = config.calculate_keyword_density
    if (config.store_raw_html !== undefined) task.store_raw_html = config.store_raw_html
    if (config.custom_user_agent) task.custom_user_agent = config.custom_user_agent

    const data = await this.request<any>('/on_page/task_post', [task])
    const taskId = data.tasks?.[0]?.id
    if (!taskId) throw new DataForSEOError('No task ID returned from On-Page API', 200)
    return taskId
  }

  /**
   * Get On-Page crawl summary (progress + aggregate metrics).
   */
  async getOnPageSummary(taskId: string): Promise<OnPageSummary> {
    const data = await this.request<any>(`/on_page/summary/${taskId}`, [], 'GET')
    const result = data.tasks?.[0]?.result?.[0]
    if (!result) throw new DataForSEOError('No summary data returned', 200)

    return {
      crawl_progress: result.crawl_progress || 'in_progress',
      crawl_status: {
        max_crawl_pages: result.crawl_status?.max_crawl_pages ?? 0,
        pages_in_queue: result.crawl_status?.pages_in_queue ?? 0,
        pages_crawled: result.crawl_status?.pages_crawled ?? 0,
      },
      crawl_gateway_address: result.crawl_gateway_address || '',
      page_metrics: result.page_metrics || {},
      domain_info: {
        name: result.domain_info?.name || '',
        cms: result.domain_info?.cms ?? null,
        ip: result.domain_info?.ip || '',
        server: result.domain_info?.server || '',
        crawl_start: result.domain_info?.crawl_start || '',
        crawl_end: result.domain_info?.crawl_end ?? null,
      },
    }
  }

  /**
   * Get per-page SEO data from a completed crawl.
   */
  async getOnPagePages(
    taskId: string,
    limit: number = 100,
    offset: number = 0,
    filters?: any[],
  ): Promise<{ items: OnPagePageItem[]; total: number }> {
    const body: Record<string, any> = { id: taskId, limit, offset }
    if (filters && filters.length > 0) body.filters = filters

    const data = await this.request<any>('/on_page/pages', [body])
    const result = data.tasks?.[0]?.result?.[0]

    const items: OnPagePageItem[] = []
    if (result?.items) {
      for (const item of result.items) {
        const meta = item.meta || {}
        const htags = meta.htags || {}
        const content = meta.content || {}
        const timing = item.page_timing || {}

        items.push({
          url: item.url || '',
          status_code: item.status_code ?? 0,
          resource_type: item.resource_type || '',
          media_type: item.media_type || '',
          size: item.size ?? 0,
          encoded_size: item.encoded_size ?? 0,
          total_transfer_size: item.total_transfer_size ?? 0,
          fetch_time: item.fetch_timing?.duration ?? 0,
          meta: {
            title: meta.title ?? null,
            description: meta.description ?? null,
            charset: meta.charset ?? null,
            canonical: meta.canonical ?? null,
            htags,
            content: content.plain_text_word_count != null ? {
              plain_text_size: content.plain_text_size ?? 0,
              plain_text_rate: content.plain_text_rate ?? 0,
              plain_text_word_count: content.plain_text_word_count ?? 0,
            } : null,
          },
          page_timing: timing.time_to_interactive != null ? {
            time_to_interactive: timing.time_to_interactive ?? null,
            dom_complete: timing.dom_complete ?? null,
            largest_contentful_paint: timing.largest_contentful_paint ?? null,
            cumulative_layout_shift: timing.cumulative_layout_shift ?? null,
          } : null,
          onpage_score: item.onpage_score ?? 0,
          checks: item.checks || {},
          content_encoding: item.content_encoding ?? null,
          internal_links_count: item.internal_links_count ?? 0,
          external_links_count: item.external_links_count ?? 0,
          broken_links: item.broken_links ?? 0,
          images_count: item.images_count ?? 0,
          images_without_alt: item.images_without_alt ?? 0,
          images_size: item.images_size ?? 0,
          is_indexable: item.is_indexable ?? true,
          no_index: item.meta?.robots?.is_no_index ?? false,
          no_follow: item.meta?.robots?.is_no_follow ?? false,
          last_modified: item.last_modified ?? null,
        })
      }
    }

    return { items, total: result?.total_items_count ?? items.length }
  }

  /**
   * Get duplicate title or description tags from a crawl.
   */
  async getOnPageDuplicateTags(
    taskId: string,
    type: 'title' | 'description' = 'title',
  ): Promise<OnPageDuplicateItem[]> {
    const data = await this.request<any>('/on_page/duplicate_tags', [{
      id: taskId,
      type,
      limit: 100,
    }])

    const items: OnPageDuplicateItem[] = []
    const result = data.tasks?.[0]?.result?.[0]
    if (result?.items) {
      for (const item of result.items) {
        items.push({
          accumulator: item.accumulator || '',
          pages: (item.pages || []).map((p: any) => ({ url: p.url || '' })),
          total_count: item.total_count ?? 0,
        })
      }
    }
    return items
  }

  /**
   * Get duplicate content pages from a crawl.
   */
  async getOnPageDuplicateContent(taskId: string): Promise<OnPageDuplicateItem[]> {
    const data = await this.request<any>('/on_page/duplicate_content', [{
      id: taskId,
      limit: 100,
    }])

    const items: OnPageDuplicateItem[] = []
    const result = data.tasks?.[0]?.result?.[0]
    if (result?.items) {
      for (const item of result.items) {
        items.push({
          accumulator: item.accumulator || '',
          pages: (item.pages || []).map((p: any) => ({ url: p.url || '' })),
          total_count: item.total_count ?? 0,
        })
      }
    }
    return items
  }

  /**
   * Get redirect chains detected during a crawl.
   */
  async getOnPageRedirectChains(taskId: string): Promise<OnPageRedirectItem[]> {
    const data = await this.request<any>('/on_page/redirect_chains', [{
      id: taskId,
      limit: 100,
    }])

    const items: OnPageRedirectItem[] = []
    const result = data.tasks?.[0]?.result?.[0]
    if (result?.items) {
      for (const item of result.items) {
        items.push({
          url: item.url || '',
          redirect_url: item.redirect_url || '',
          status_code: item.status_code ?? 301,
          is_redirect_loop: item.is_redirect_loop ?? false,
          chain: (item.chain || []).map((c: any) => ({
            url: c.url || '',
            status_code: c.status_code ?? 0,
          })),
        })
      }
    }
    return items
  }

  /**
   * Instant single-page SEO audit (no full crawl needed).
   */
  async getInstantPages(url: string): Promise<OnPagePageItem> {
    const data = await this.request<any>('/on_page/instant_pages', [{
      url,
      enable_javascript: false,
      load_resources: false,
    }])

    const result = data.tasks?.[0]?.result?.[0]?.items?.[0]
    if (!result) throw new DataForSEOError('No instant page data returned', 200)

    const meta = result.meta || {}
    const htags = meta.htags || {}
    const content = meta.content || {}
    const timing = result.page_timing || {}

    return {
      url: result.url || url,
      status_code: result.status_code ?? 0,
      resource_type: result.resource_type || 'html',
      media_type: result.media_type || '',
      size: result.size ?? 0,
      encoded_size: result.encoded_size ?? 0,
      total_transfer_size: result.total_transfer_size ?? 0,
      fetch_time: result.fetch_timing?.duration ?? 0,
      meta: {
        title: meta.title ?? null,
        description: meta.description ?? null,
        charset: meta.charset ?? null,
        canonical: meta.canonical ?? null,
        htags,
        content: content.plain_text_word_count != null ? {
          plain_text_size: content.plain_text_size ?? 0,
          plain_text_rate: content.plain_text_rate ?? 0,
          plain_text_word_count: content.plain_text_word_count ?? 0,
        } : null,
      },
      page_timing: {
        time_to_interactive: timing.time_to_interactive ?? null,
        dom_complete: timing.dom_complete ?? null,
        largest_contentful_paint: timing.largest_contentful_paint ?? null,
        cumulative_layout_shift: timing.cumulative_layout_shift ?? null,
      },
      onpage_score: result.onpage_score ?? 0,
      checks: result.checks || {},
      content_encoding: result.content_encoding ?? null,
      internal_links_count: result.internal_links_count ?? 0,
      external_links_count: result.external_links_count ?? 0,
      broken_links: result.broken_links ?? 0,
      images_count: result.images_count ?? 0,
      images_without_alt: result.images_without_alt ?? 0,
      images_size: result.images_size ?? 0,
      is_indexable: result.is_indexable ?? true,
      no_index: result.meta?.robots?.is_no_index ?? false,
      no_follow: result.meta?.robots?.is_no_follow ?? false,
      last_modified: result.last_modified ?? null,
    }
  }

  /**
   * Get account balance info.
   */
  async getBalance(): Promise<DataForSEOBalance> {
    const data = await this.request<any>('/appendix/user_data', [], 'GET')

    const result = data.tasks?.[0]?.result?.[0]
    return {
      balance: result?.money?.balance ?? 0,
      currency: result?.money?.currency ?? 'USD',
    }
  }
}

// ====== Factory ======

/**
 * Create a DataForSEO client from the stored key format "login:password".
 */
export function createDataForSEOClient(loginPassword: string): DataForSEOClient {
  const colonIndex = loginPassword.indexOf(':')
  if (colonIndex === -1) {
    throw new Error('Invalid DataForSEO key format. Expected "login:password"')
  }
  const login = loginPassword.slice(0, colonIndex)
  const password = loginPassword.slice(colonIndex + 1)
  return new DataForSEOClient({ login, password })
}
