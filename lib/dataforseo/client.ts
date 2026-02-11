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
