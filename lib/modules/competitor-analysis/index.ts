/**
 * Competitor Analysis Module — Deep competitive intelligence via DataForSEO Labs.
 *
 * Actions:
 * - run_analysis: Fetch ranked keywords for a competitor domain
 * - check_keyword_gaps: Find keywords where competitor ranks but you do not
 * - compare_rankings: Compare positions for overlapping keywords
 * - fetch_overview: Get domain rank, traffic, keyword distribution
 * - fetch_top_pages: Get highest-traffic pages for a competitor
 * - discover_competitors: Auto-discover competing domains
 * - content_gap: Content gap via domain intersection API
 * - deep_analysis: Full analysis (overview + keywords + top pages)
 * - precheck: Quick domain overview for cost estimation
 */

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'
import { createDataForSEOClient, estimateLabsCost } from '@/lib/dataforseo/client'

export class CompetitorAnalysisModule implements SEOModule {
  id = 'competitor-analysis' as const
  name = 'Competitor Analysis'
  description = 'Deep competitive intelligence: domain overview, top pages, content gaps, and auto-discovery via DataForSEO.'
  icon = 'Swords'

  emittedEvents: EventType[] = [
    'competitor.analysis_completed',
    'competitor.new_threat',
    'competitor.keyword_gap_found',
    'competitor.overview_fetched',
    'competitor.top_pages_fetched',
    'competitor.competitors_discovered',
    'competitor.content_gap_analyzed',
    'competitor.deep_analysis_completed',
  ]

  handledEvents: EventType[] = []

  actions: ModuleAction[] = [
    {
      id: 'run_analysis',
      name: 'Run Competitor Analysis',
      description: 'Fetch ranked keywords for a competitor domain via DataForSEO',
      params: [
        { name: 'competitor_id', type: 'string', label: 'Competitor ID', required: true },
      ],
    },
    {
      id: 'check_keyword_gaps',
      name: 'Check Keyword Gaps',
      description: 'Find keywords where competitor ranks but you do not',
      params: [
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
        { name: 'competitor_id', type: 'string', label: 'Competitor ID', required: true },
      ],
    },
    {
      id: 'compare_rankings',
      name: 'Compare Rankings',
      description: 'Compare your positions against a competitor for overlapping keywords',
      params: [
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
        { name: 'competitor_id', type: 'string', label: 'Competitor ID', required: true },
      ],
    },
    {
      id: 'fetch_overview',
      name: 'Fetch Domain Overview',
      description: 'Get domain rank, traffic, keyword distribution via DataForSEO Labs',
      params: [
        { name: 'competitor_id', type: 'string', label: 'Competitor ID', required: true },
      ],
    },
    {
      id: 'fetch_top_pages',
      name: 'Fetch Top Pages',
      description: 'Get highest-traffic pages for a competitor domain',
      params: [
        { name: 'competitor_id', type: 'string', label: 'Competitor ID', required: true },
        { name: 'limit', type: 'number', label: 'Page Limit', required: false, default: 100 },
      ],
    },
    {
      id: 'discover_competitors',
      name: 'Discover Competitors',
      description: 'Auto-discover competing domains based on keyword overlap',
      params: [
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
      ],
    },
    {
      id: 'content_gap',
      name: 'Content Gap Analysis',
      description: 'Find keywords competitor ranks for that you do not (via domain intersection)',
      params: [
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
        { name: 'competitor_id', type: 'string', label: 'Competitor ID', required: true },
      ],
    },
    {
      id: 'deep_analysis',
      name: 'Run Deep Analysis',
      description: 'Full competitor analysis: overview + keywords + top pages in one call',
      params: [
        { name: 'competitor_id', type: 'string', label: 'Competitor ID', required: true },
      ],
    },
    {
      id: 'precheck',
      name: 'Pre-Check Analysis Cost',
      description: 'Quick domain overview to estimate analysis scope and cost',
      params: [
        { name: 'domain', type: 'string', label: 'Domain', required: true },
      ],
    },
  ]

  requiredKeys: ApiKeyType[] = ['dataforseo']

  sidebar: ModuleSidebarConfig = {
    section: 'Monitoring',
    sectionColor: 'bg-violet-500',
    label: 'Competitors',
    viewState: 'competitor-analysis',
    order: 1,
  }

  async handleEvent(_event: CoreEvent, _context: ModuleContext): Promise<CoreEvent | null> {
    return null
  }

  async executeAction(
    actionId: string,
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    switch (actionId) {
      case 'run_analysis':
        return this.runAnalysis(params, context)
      case 'check_keyword_gaps':
        return this.checkKeywordGaps(params, context)
      case 'compare_rankings':
        return this.compareRankings(params, context)
      case 'fetch_overview':
        return this.fetchOverview(params, context)
      case 'fetch_top_pages':
        return this.fetchTopPages(params, context)
      case 'discover_competitors':
        return this.discoverCompetitors(params, context)
      case 'content_gap':
        return this.contentGap(params, context)
      case 'deep_analysis':
        return this.deepAnalysis(params, context)
      case 'precheck':
        return this.precheck(params, context)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  // ====== Helpers ======

  private getClient(context: ModuleContext) {
    const dfsKey = context.apiKeys['dataforseo']
    if (!dfsKey) throw new Error('DataForSEO API key not configured')
    return createDataForSEOClient(dfsKey)
  }

  private async getCompetitor(competitorId: string, context: ModuleContext) {
    const { data: competitor } = await context.supabase
      .from('competitors')
      .select('*')
      .eq('id', competitorId)
      .single()
    if (!competitor) throw new Error('Competitor not found')
    return competitor
  }

  private async getSiteUrl(siteId: string, context: ModuleContext): Promise<string> {
    const { data: site } = await context.supabase
      .from('sites')
      .select('url')
      .eq('id', siteId)
      .single()
    if (!site) throw new Error('Site not found')
    return site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }

  // ====== Existing Actions ======

  private async runAnalysis(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const competitorId = params.competitor_id
    if (!competitorId) throw new Error('competitor_id is required')

    const competitor = await this.getCompetitor(competitorId, context)
    const client = this.getClient(context)
    const loc = competitor.location_code || 2643
    const lang = competitor.language_code || 'ru'

    const keywords = await client.getRankedKeywords(competitor.domain, loc, lang, 500)

    if (keywords.length > 0) {
      const rows = keywords.map(kw => ({
        competitor_id: competitorId,
        keyword: kw.keyword_data.keyword,
        search_volume: kw.keyword_data.search_volume,
        position: kw.ranked_serp_element.serp_item.rank_group,
        url: kw.ranked_serp_element.serp_item.url,
        keyword_difficulty: kw.keyword_data.keyword_difficulty,
        last_checked_at: new Date().toISOString(),
      }))

      await context.supabase
        .from('competitor_keywords')
        .upsert(rows, { onConflict: 'competitor_id,keyword' })
    }

    await context.supabase
      .from('competitors')
      .update({
        last_synced_at: new Date().toISOString(),
        ranked_keywords_count: keywords.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', competitorId)

    await context.emitEvent({
      event_type: 'competitor.analysis_completed',
      source_module: 'competitor-analysis',
      payload: { competitor_id: competitorId, domain: competitor.domain, keywords_found: keywords.length },
      site_id: competitor.site_id,
    })

    return { keywords_found: keywords.length, domain: competitor.domain }
  }

  private async checkKeywordGaps(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { site_id, competitor_id } = params
    if (!site_id || !competitor_id) throw new Error('site_id and competitor_id are required')

    const { data: compKeywords } = await context.supabase
      .from('competitor_keywords')
      .select('keyword, search_volume, position')
      .eq('competitor_id', competitor_id)
      .order('search_volume', { ascending: false })
      .limit(200)

    const { data: siteKeywords } = await context.supabase
      .from('keywords')
      .select('keyword')
      .eq('site_id', site_id)

    const siteKeywordSet = new Set((siteKeywords || []).map(k => k.keyword.toLowerCase()))

    const gaps = (compKeywords || []).filter(
      ck => !siteKeywordSet.has(ck.keyword.toLowerCase())
    )

    if (gaps.length > 10) {
      await context.emitEvent({
        event_type: 'competitor.keyword_gap_found',
        source_module: 'competitor-analysis',
        payload: { site_id, competitor_id, gap_count: gaps.length, top_gaps: gaps.slice(0, 5).map(g => g.keyword) },
        site_id,
      })
    }

    return { gaps: gaps.slice(0, 50), count: gaps.length }
  }

  private async compareRankings(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { site_id, competitor_id } = params
    if (!site_id || !competitor_id) throw new Error('site_id and competitor_id are required')

    const { data: compKeywords } = await context.supabase
      .from('competitor_keywords')
      .select('keyword, position, search_volume')
      .eq('competitor_id', competitor_id)

    const { data: siteKeywords } = await context.supabase
      .from('keywords')
      .select('keyword, current_position')
      .eq('site_id', site_id)

    const siteMap = new Map((siteKeywords || []).map(k => [k.keyword.toLowerCase(), k.current_position]))

    let winning = 0
    let losing = 0
    const overlapping: any[] = []

    for (const ck of compKeywords || []) {
      const sitePos = siteMap.get(ck.keyword.toLowerCase())
      if (sitePos != null && ck.position != null) {
        const isWinning = sitePos <= ck.position
        if (isWinning) winning++
        else losing++
        overlapping.push({
          keyword: ck.keyword,
          your_position: sitePos,
          competitor_position: ck.position,
          search_volume: ck.search_volume,
          winning: isWinning,
        })
      }
    }

    overlapping.sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0))

    if (losing > winning) {
      await context.emitEvent({
        event_type: 'competitor.new_threat',
        source_module: 'competitor-analysis',
        payload: { site_id, competitor_id, winning, losing, overlapping_count: overlapping.length },
        site_id,
        severity: losing > winning * 2 ? 'warning' : 'info',
      })
    }

    return { overlapping: overlapping.slice(0, 50), winning, losing, total: overlapping.length }
  }

  // ====== New Actions ======

  private async fetchOverview(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const competitorId = params.competitor_id
    if (!competitorId) throw new Error('competitor_id is required')

    const competitor = await this.getCompetitor(competitorId, context)
    const client = this.getClient(context)
    const loc = competitor.location_code || 2643
    const lang = competitor.language_code || 'ru'

    const overview = await client.getDomainOverview(competitor.domain, loc, lang)

    const top3 = overview.organic.pos_1 + overview.organic.pos_2_3
    const top10 = top3 + overview.organic.pos_4_10
    const top100 = overview.organic.count

    // Update competitor record
    await context.supabase
      .from('competitors')
      .update({
        domain_rank: overview.domain_rank,
        organic_etv: overview.organic.etv,
        organic_keywords_total: overview.organic.count,
        keywords_top3: top3,
        keywords_top10: top10,
        keywords_top100: top100,
        referring_domains: overview.backlinks_info.referring_domains,
        backlinks_count: overview.backlinks_info.backlinks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', competitorId)

    // Upsert daily snapshot
    await context.supabase
      .from('competitor_snapshots')
      .upsert({
        competitor_id: competitorId,
        domain_rank: overview.domain_rank,
        organic_etv: overview.organic.etv,
        organic_keywords_total: overview.organic.count,
        keywords_top3: top3,
        keywords_top10: top10,
        keywords_top100: top100,
        referring_domains: overview.backlinks_info.referring_domains,
        backlinks_count: overview.backlinks_info.backlinks,
        snapshot_date: new Date().toISOString().split('T')[0],
      }, { onConflict: 'competitor_id,snapshot_date' })

    await context.emitEvent({
      event_type: 'competitor.overview_fetched',
      source_module: 'competitor-analysis',
      payload: {
        competitor_id: competitorId,
        domain: competitor.domain,
        domain_rank: overview.domain_rank,
        organic_etv: overview.organic.etv,
        keywords_total: overview.organic.count,
      },
      site_id: competitor.site_id,
    })

    return {
      domain: competitor.domain,
      domain_rank: overview.domain_rank,
      organic_etv: overview.organic.etv,
      organic_keywords_total: overview.organic.count,
      keywords_top3: top3,
      keywords_top10: top10,
      keywords_top100: top100,
      referring_domains: overview.backlinks_info.referring_domains,
      backlinks_count: overview.backlinks_info.backlinks,
      organic_details: overview.organic,
    }
  }

  private async fetchTopPages(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const competitorId = params.competitor_id
    if (!competitorId) throw new Error('competitor_id is required')
    const limit = params.limit || 100

    const competitor = await this.getCompetitor(competitorId, context)
    const client = this.getClient(context)
    const loc = competitor.location_code || 2643
    const lang = competitor.language_code || 'ru'

    const pages = await client.getTopPages(competitor.domain, loc, lang, limit)

    if (pages.length > 0) {
      const rows = pages.map(p => ({
        competitor_id: competitorId,
        page_url: p.page_address,
        etv: p.metrics.organic.etv,
        keywords_count: p.metrics.organic.count,
        top3_count: p.metrics.organic.pos_1 + p.metrics.organic.pos_2_3,
        top10_count: p.metrics.organic.pos_1 + p.metrics.organic.pos_2_3 + p.metrics.organic.pos_4_10,
        last_checked_at: new Date().toISOString(),
      }))

      await context.supabase
        .from('competitor_top_pages')
        .upsert(rows, { onConflict: 'competitor_id,page_url' })
    }

    await context.emitEvent({
      event_type: 'competitor.top_pages_fetched',
      source_module: 'competitor-analysis',
      payload: { competitor_id: competitorId, domain: competitor.domain, pages_found: pages.length },
      site_id: competitor.site_id,
    })

    return { pages_found: pages.length, domain: competitor.domain }
  }

  private async discoverCompetitors(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const siteId = params.site_id
    if (!siteId) throw new Error('site_id is required')

    const siteDomain = await this.getSiteUrl(siteId, context)
    const client = this.getClient(context)

    // Get site language for location settings
    const { data: site } = await context.supabase
      .from('sites')
      .select('language')
      .eq('id', siteId)
      .single()

    const lang = site?.language || 'ru'
    const loc = lang === 'en' ? 2840 : 2643

    const discovered = await client.getCompetitorsDomain(siteDomain, loc, lang, 20)

    if (discovered.length > 0) {
      const rows = discovered.map(d => ({
        site_id: siteId,
        user_id: context.userId,
        discovered_domain: d.domain,
        intersections: d.intersections,
        organic_etv: d.full_domain_metrics.organic.etv,
        organic_keywords: d.full_domain_metrics.organic.count,
        avg_position: d.avg_position,
        discovered_at: new Date().toISOString(),
      }))

      await context.supabase
        .from('competitor_discoveries')
        .upsert(rows, { onConflict: 'site_id,discovered_domain' })
    }

    await context.emitEvent({
      event_type: 'competitor.competitors_discovered',
      source_module: 'competitor-analysis',
      payload: { site_id: siteId, discovered_count: discovered.length },
      site_id: siteId,
    })

    return { discovered_count: discovered.length, competitors: discovered }
  }

  private async contentGap(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { site_id, competitor_id } = params
    if (!site_id || !competitor_id) throw new Error('site_id and competitor_id are required')

    const competitor = await this.getCompetitor(competitor_id, context)
    const siteDomain = await this.getSiteUrl(site_id, context)
    const client = this.getClient(context)
    const loc = competitor.location_code || 2643
    const lang = competitor.language_code || 'ru'

    const gaps = await client.getDomainIntersection(
      competitor.domain,
      siteDomain,
      loc,
      lang,
      200
    )

    if (gaps.length > 10) {
      await context.emitEvent({
        event_type: 'competitor.content_gap_analyzed',
        source_module: 'competitor-analysis',
        payload: {
          site_id,
          competitor_id,
          gap_count: gaps.length,
          top_keywords: gaps.slice(0, 5).map(g => g.keyword),
        },
        site_id,
      })
    }

    return {
      gaps: gaps.map(g => ({
        keyword: g.keyword,
        search_volume: g.search_volume,
        keyword_difficulty: g.keyword_difficulty,
        competitor_position: g.first_domain_position,
        competitor_url: g.first_domain_url,
      })),
      total: gaps.length,
    }
  }

  private async deepAnalysis(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const competitorId = params.competitor_id
    if (!competitorId) throw new Error('competitor_id is required')

    // Run all three analyses
    const overviewResult = await this.fetchOverview({ competitor_id: competitorId }, context)
    const keywordsResult = await this.runAnalysis({ competitor_id: competitorId }, context)
    const topPagesResult = await this.fetchTopPages({ competitor_id: competitorId, limit: 100 }, context)

    await context.emitEvent({
      event_type: 'competitor.deep_analysis_completed',
      source_module: 'competitor-analysis',
      payload: {
        competitor_id: competitorId,
        domain: overviewResult.domain,
        domain_rank: overviewResult.domain_rank,
        keywords_found: keywordsResult.keywords_found,
        pages_found: topPagesResult.pages_found,
      },
      site_id: (await this.getCompetitor(competitorId, context)).site_id,
    })

    return {
      overview: overviewResult,
      keywords_found: keywordsResult.keywords_found,
      pages_found: topPagesResult.pages_found,
    }
  }

  private async precheck(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const domain = params.domain
    if (!domain) throw new Error('domain is required')

    const client = this.getClient(context)
    const overview = await client.getDomainOverview(domain)

    const keywordsCount = overview.organic.count
    const top3 = overview.organic.pos_1 + overview.organic.pos_2_3
    const top10 = top3 + overview.organic.pos_4_10

    // Calculate real cost based on DataForSEO pricing
    const rankedKeywordsRows = Math.min(keywordsCount, 500)
    const costEstimate = estimateLabsCost({
      domainOverview: true,
      rankedKeywords: rankedKeywordsRows,
      topPages: 100,
    })

    // Get current balance
    let balance = 0
    try {
      const balanceInfo = await client.getBalance()
      balance = balanceInfo.balance
    } catch {
      // Balance check is optional
    }

    return {
      domain,
      domain_rank: overview.domain_rank,
      organic_etv: overview.organic.etv,
      organic_keywords_total: overview.organic.count,
      keywords_top3: top3,
      keywords_top10: top10,
      referring_domains: overview.backlinks_info.referring_domains,
      backlinks_count: overview.backlinks_info.backlinks,
      cost_breakdown: costEstimate.breakdown,
      estimated_credits: costEstimate.total,
      balance,
    }
  }
}
