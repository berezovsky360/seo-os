/**
 * Logged DataForSEO Client — wraps DataForSEOClient and logs every API call
 * to the ai_usage_log table for the Usage Dashboard.
 */

import {
  DataForSEOClient,
  createDataForSEOClient,
  type SERPResult,
  type KeywordVolumeData,
  type RankedKeywordItem,
  type DomainOverview,
  type TopPageItem,
  type DiscoveredCompetitorItem,
  type DomainIntersectionItem,
  type OnPageTaskConfig,
  type OnPageSummary,
  type OnPagePageItem,
  type OnPageDuplicateItem,
  type OnPageRedirectItem,
  type DataForSEOBalance,
} from './client'

import {
  estimateSerpCost,
  estimateSearchVolumeCost,
  estimateLabsCallCost,
  estimateInstantPageCost,
  DFS_USER_DATA_COST,
} from './pricing'

import type { SupabaseClient } from '@supabase/supabase-js'

export class LoggedDataForSEOClient {
  private client: DataForSEOClient
  private supabase: SupabaseClient
  private userId: string

  constructor(loginPassword: string, supabase: SupabaseClient, userId: string) {
    this.client = createDataForSEOClient(loginPassword)
    this.supabase = supabase
    this.userId = userId
  }

  private async logUsage(
    action: string,
    model: string,
    estimatedCost: number,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    try {
      await this.supabase.from('ai_usage_log').insert({
        user_id: this.userId,
        service: 'dataforseo',
        action,
        model,
        prompt_tokens: null,
        output_tokens: null,
        total_tokens: null,
        estimated_cost: estimatedCost,
        metadata,
      })
    } catch (err) {
      console.error('[LoggedDataForSEOClient] Failed to log usage:', err)
    }
  }

  // ====== SERP API ======

  async checkPositions(
    keywords: string[],
    locationCode: number = 2643,
    languageCode: string = 'ru',
  ): Promise<Map<string, SERPResult>> {
    const result = await this.client.checkPositions(keywords, locationCode, languageCode)
    await this.logUsage('rank_check', 'dataforseo/serp', estimateSerpCost(keywords.length), {
      keyword_count: keywords.length,
      location_code: locationCode,
      language_code: languageCode,
    })
    return result
  }

  // ====== Keywords Data API ======

  async getSearchVolume(
    keywords: string[],
    locationCode: number = 2643,
    languageCode: string = 'ru',
  ): Promise<KeywordVolumeData[]> {
    const result = await this.client.getSearchVolume(keywords, locationCode, languageCode)
    await this.logUsage('search_volume', 'dataforseo/keywords', estimateSearchVolumeCost(keywords.length), {
      keyword_count: keywords.length,
      location_code: locationCode,
    })
    return result
  }

  // ====== Labs API ======

  async getRankedKeywords(
    domain: string,
    locationCode: number = 2643,
    languageCode: string = 'ru',
    limit: number = 100,
  ): Promise<RankedKeywordItem[]> {
    const result = await this.client.getRankedKeywords(domain, locationCode, languageCode, limit)
    await this.logUsage('ranked_keywords', 'dataforseo/labs', estimateLabsCallCost(result.length), {
      domain,
      rows_returned: result.length,
      limit,
    })
    return result
  }

  async getDomainOverview(
    domain: string,
    locationCode: number = 2643,
    languageCode: string = 'ru',
  ): Promise<DomainOverview> {
    const result = await this.client.getDomainOverview(domain, locationCode, languageCode)
    await this.logUsage('domain_overview', 'dataforseo/labs', estimateLabsCallCost(5), {
      domain,
    })
    return result
  }

  async getTopPages(
    domain: string,
    locationCode: number = 2643,
    languageCode: string = 'ru',
    limit: number = 100,
  ): Promise<TopPageItem[]> {
    const result = await this.client.getTopPages(domain, locationCode, languageCode, limit)
    await this.logUsage('top_pages', 'dataforseo/labs', estimateLabsCallCost(result.length), {
      domain,
      rows_returned: result.length,
      limit,
    })
    return result
  }

  async getCompetitorsDomain(
    domain: string,
    locationCode: number = 2643,
    languageCode: string = 'ru',
    limit: number = 20,
  ): Promise<DiscoveredCompetitorItem[]> {
    const result = await this.client.getCompetitorsDomain(domain, locationCode, languageCode, limit)
    await this.logUsage('competitors_domain', 'dataforseo/labs', estimateLabsCallCost(result.length), {
      domain,
      rows_returned: result.length,
    })
    return result
  }

  async getDomainIntersection(
    competitorDomain: string,
    yourDomain: string,
    locationCode: number = 2643,
    languageCode: string = 'ru',
    limit: number = 200,
  ): Promise<DomainIntersectionItem[]> {
    const result = await this.client.getDomainIntersection(competitorDomain, yourDomain, locationCode, languageCode, limit)
    await this.logUsage('domain_intersection', 'dataforseo/labs', estimateLabsCallCost(result.length), {
      competitor_domain: competitorDomain,
      your_domain: yourDomain,
      rows_returned: result.length,
    })
    return result
  }

  // ====== On-Page API ======

  async createOnPageTask(config: OnPageTaskConfig): Promise<string> {
    const result = await this.client.createOnPageTask(config)
    // Cost is per crawled page; we log the estimated cost at task creation
    const { estimateOnPageCost } = await import('./client')
    const cost = estimateOnPageCost({
      maxPages: config.max_crawl_pages ?? 100,
      loadResources: config.load_resources,
      enableJavascript: config.enable_javascript,
      enableBrowserRendering: config.enable_browser_rendering,
      enableContentParsing: config.enable_content_parsing,
      enableKeywordDensity: config.calculate_keyword_density,
    })
    await this.logUsage('onpage_crawl', 'dataforseo/onpage', cost, {
      target: config.target,
      max_pages: config.max_crawl_pages ?? 100,
      task_id: result,
    })
    return result
  }

  async getOnPageSummary(taskId: string): Promise<OnPageSummary> {
    return this.client.getOnPageSummary(taskId)
  }

  async getOnPagePages(
    taskId: string,
    limit: number = 100,
    offset: number = 0,
    filters?: any[],
  ): Promise<{ items: OnPagePageItem[]; total: number }> {
    return this.client.getOnPagePages(taskId, limit, offset, filters)
  }

  async getOnPageDuplicateTags(
    taskId: string,
    type: 'title' | 'description' = 'title',
  ): Promise<OnPageDuplicateItem[]> {
    return this.client.getOnPageDuplicateTags(taskId, type)
  }

  async getOnPageDuplicateContent(taskId: string): Promise<OnPageDuplicateItem[]> {
    return this.client.getOnPageDuplicateContent(taskId)
  }

  async getOnPageRedirectChains(taskId: string): Promise<OnPageRedirectItem[]> {
    return this.client.getOnPageRedirectChains(taskId)
  }

  async getInstantPages(url: string): Promise<OnPagePageItem> {
    const result = await this.client.getInstantPages(url)
    await this.logUsage('instant_audit', 'dataforseo/onpage', estimateInstantPageCost(), {
      url,
    })
    return result
  }

  // ====== Account ======

  async getBalance(): Promise<DataForSEOBalance> {
    const result = await this.client.getBalance()
    // getBalance is free, log for tracking purposes
    await this.logUsage('balance_check', 'dataforseo/account', DFS_USER_DATA_COST, {})
    return result
  }
}

/**
 * Create a logged DataForSEO client from the stored key format "login:password".
 */
export function createLoggedDataForSEOClient(
  loginPassword: string,
  supabase: SupabaseClient,
  userId: string,
): LoggedDataForSEOClient {
  return new LoggedDataForSEOClient(loginPassword, supabase, userId)
}
