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
