/**
 * Competitor Analysis Module
 *
 * Tracks competitor domains, discovers keyword gaps, and compares rankings.
 * Uses DataForSEO's getRankedKeywords API for domain intelligence.
 */

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'
import { createDataForSEOClient } from '@/lib/dataforseo/client'

export class CompetitorAnalysisModule implements SEOModule {
  id = 'competitor-analysis' as const
  name = 'Competitor Analysis'
  description = 'Track competitor domains, discover keyword gaps, and compare rankings via DataForSEO.'
  icon = 'Swords'

  emittedEvents: EventType[] = [
    'competitor.analysis_completed',
    'competitor.new_threat',
    'competitor.keyword_gap_found',
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
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  private async runAnalysis(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const competitorId = params.competitor_id
    if (!competitorId) throw new Error('competitor_id is required')

    // Get competitor record
    const { data: competitor } = await context.supabase
      .from('competitors')
      .select('*')
      .eq('id', competitorId)
      .single()

    if (!competitor) throw new Error('Competitor not found')

    // Build DataForSEO client
    const dfsKey = context.apiKeys['dataforseo']
    if (!dfsKey) throw new Error('DataForSEO API key not configured')
    const client = createDataForSEOClient(dfsKey)

    // Fetch ranked keywords for the competitor domain
    const keywords = await client.getRankedKeywords(
      competitor.domain,
      2643, // default location
      'ru', // default language
      500   // limit
    )

    // Upsert keywords into competitor_keywords
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

    // Update competitor stats
    await context.supabase
      .from('competitors')
      .update({
        last_synced_at: new Date().toISOString(),
        ranked_keywords_count: keywords.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', competitorId)

    // Emit completion event
    await context.emitEvent({
      event_type: 'competitor.analysis_completed',
      source_module: 'competitor-analysis',
      payload: {
        competitor_id: competitorId,
        domain: competitor.domain,
        keywords_found: keywords.length,
      },
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

    // Get competitor keywords
    const { data: compKeywords } = await context.supabase
      .from('competitor_keywords')
      .select('keyword, search_volume, position')
      .eq('competitor_id', competitor_id)
      .order('search_volume', { ascending: false })
      .limit(200)

    // Get site's own keywords
    const { data: siteKeywords } = await context.supabase
      .from('keywords')
      .select('keyword')
      .eq('site_id', site_id)

    const siteKeywordSet = new Set((siteKeywords || []).map(k => k.keyword.toLowerCase()))

    // Find gaps (competitor has, site doesn't)
    const gaps = (compKeywords || []).filter(
      ck => !siteKeywordSet.has(ck.keyword.toLowerCase())
    )

    if (gaps.length > 10) {
      await context.emitEvent({
        event_type: 'competitor.keyword_gap_found',
        source_module: 'competitor-analysis',
        payload: {
          site_id,
          competitor_id,
          gap_count: gaps.length,
          top_gaps: gaps.slice(0, 5).map(g => g.keyword),
        },
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

    // Get competitor keywords
    const { data: compKeywords } = await context.supabase
      .from('competitor_keywords')
      .select('keyword, position, search_volume')
      .eq('competitor_id', competitor_id)

    // Get site keywords
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
        payload: {
          site_id,
          competitor_id,
          winning,
          losing,
          overlapping_count: overlapping.length,
        },
        site_id,
        severity: losing > winning * 2 ? 'warning' : 'info',
      })
    }

    return { overlapping: overlapping.slice(0, 50), winning, losing, total: overlapping.length }
  }
}
