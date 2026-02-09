/**
 * GSC Insights Module — The Auditor.
 *
 * Pulls real click and impression data from Google Search Console.
 * Identifies low-CTR pages for title optimization.
 * Discovers new keywords appearing in search results.
 */

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'
import { createGSCClient, type GSCTokenConfig } from '@/lib/gsc/client'
import { encrypt, getEncryptionKey } from '@/lib/utils/encryption'

export class GSCInsightsModule implements SEOModule {
  id = 'gsc-insights' as const
  name = 'GSC Insights'
  description = 'Pull real clicks and impressions from Google Search Console. Find low-CTR pages and keyword opportunities.'
  icon = 'LineChart'

  emittedEvents: EventType[] = [
    'gsc.data_synced',
    'gsc.low_ctr_found',
    'gsc.impressions_spike',
    'gsc.keyword_discovered',
  ]

  handledEvents: EventType[] = []

  actions: ModuleAction[] = [
    {
      id: 'sync_data',
      name: 'Sync GSC Data',
      description: 'Pull latest search analytics data from Google Search Console',
      params: [
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
        { name: 'days', type: 'number', label: 'Days to fetch', required: false, default: 30 },
      ],
    },
    {
      id: 'find_low_ctr',
      name: 'Find Low CTR Pages',
      description: 'Identify pages with high impressions but low click-through rate',
      params: [
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
        { name: 'max_ctr', type: 'number', label: 'Max CTR (%)', required: false, default: 2 },
        { name: 'min_impressions', type: 'number', label: 'Min Impressions', required: false, default: 100 },
      ],
    },
    {
      id: 'check_impressions',
      name: 'Check Page Impressions',
      description: 'Check if a specific page still gets impressions (is the intent alive?)',
      params: [
        { name: 'url', type: 'string', label: 'Page URL', required: true },
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
      ],
    },
  ]

  requiredKeys: ApiKeyType[] = ['gsc']

  sidebar: ModuleSidebarConfig = {
    section: 'Monitoring',
    sectionColor: 'bg-violet-500',
    label: 'GSC Insights',
    viewState: 'gsc-insights',
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
      case 'sync_data':
        return this.syncData(params, context)
      case 'find_low_ctr':
        return this.findLowCTR(params, context)
      case 'check_impressions':
        return this.checkImpressions(params, context)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  // ====== Helpers ======

  private buildGSCClient(gscKey: string, context: ModuleContext) {
    return createGSCClient(gscKey, async (newToken) => {
      // Re-encrypt updated token and persist
      try {
        const existingToken = JSON.parse(gscKey) as GSCTokenConfig
        const merged = { ...existingToken, ...newToken }
        const encryptionKey = getEncryptionKey()
        const encrypted = await encrypt(JSON.stringify(merged), encryptionKey)
        await context.supabase
          .from('api_keys')
          .update({ encrypted_value: encrypted, updated_at: new Date().toISOString() })
          .eq('user_id', context.userId)
          .eq('key_type', 'gsc')
      } catch {
        // Non-critical: token works for this session
      }
    })
  }

  private formatDate(d: Date): string {
    return d.toISOString().split('T')[0]
  }

  // ====== Action Implementations ======

  private async syncData(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const siteId = params.site_id || context.siteId
    if (!siteId) throw new Error('site_id is required')

    const days = params.days || 30

    // Get site's GSC property
    const { data: site } = await context.supabase
      .from('sites')
      .select('gsc_property, url')
      .eq('id', siteId)
      .single()

    if (!site?.gsc_property) {
      throw new Error('GSC property not configured for this site. Set it in site settings.')
    }

    const gscKey = context.apiKeys['gsc']
    if (!gscKey) throw new Error('GSC API key not configured')

    const client = this.buildGSCClient(gscKey, context)

    // Calculate date range (GSC has ~2-day data lag)
    const endDate = new Date()
    endDate.setDate(endDate.getDate() - 2)
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - days)

    // Phase A: Daily aggregates → daily_stats table
    const dailyData = await client.getSearchAnalytics(
      site.gsc_property,
      this.formatDate(startDate),
      this.formatDate(endDate),
      ['date'],
      5000,
    )

    let dailyUpserted = 0
    for (const row of dailyData) {
      const date = row.keys[0]
      const { error } = await context.supabase.from('daily_stats').upsert({
        site_id: siteId,
        date,
        gsc_clicks: row.clicks,
        gsc_impressions: row.impressions,
        gsc_ctr: Math.round(row.ctr * 10000) / 100, // 0.0345 → 3.45
        gsc_position: Math.round(row.position * 100) / 100,
      }, { onConflict: 'site_id,date' })

      if (!error) dailyUpserted++
    }

    // Phase B: Query-level data → gsc_query_data table
    const queryData = await client.getAllSearchAnalytics(
      site.gsc_property,
      this.formatDate(startDate),
      this.formatDate(endDate),
      ['query', 'page'],
    )

    let queryUpserted = 0
    // Batch upserts (chunks of 500)
    for (let i = 0; i < queryData.length; i += 500) {
      const batch = queryData.slice(i, i + 500).map(row => ({
        site_id: siteId,
        date: this.formatDate(endDate),
        query: row.keys[0],
        page: row.keys[1] || null,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: Math.round(row.ctr * 10000) / 10000,
        position: Math.round(row.position * 100) / 100,
      }))

      const { error } = await context.supabase
        .from('gsc_query_data')
        .upsert(batch, { onConflict: 'site_id,date,query,page' })

      if (!error) queryUpserted += batch.length
    }

    // Phase C: Keyword discovery
    const { data: existingKeywords } = await context.supabase
      .from('keywords')
      .select('keyword')
      .eq('site_id', siteId)

    const existingSet = new Set(
      (existingKeywords || []).map(k => k.keyword.toLowerCase())
    )

    const newQueries = new Map<string, typeof queryData[0]>()
    for (const row of queryData) {
      const query = row.keys[0]
      if (row.impressions >= 50 && !existingSet.has(query.toLowerCase())) {
        if (!newQueries.has(query) || row.impressions > (newQueries.get(query)?.impressions || 0)) {
          newQueries.set(query, row)
        }
      }
    }

    // Emit events for top new keywords (max 20)
    const topNewKeywords = Array.from(newQueries.entries())
      .sort((a, b) => b[1].impressions - a[1].impressions)
      .slice(0, 20)

    for (const [query, data] of topNewKeywords) {
      await context.emitEvent({
        event_type: 'gsc.keyword_discovered',
        source_module: 'gsc-insights',
        payload: {
          query,
          impressions: data.impressions,
          clicks: data.clicks,
          position: data.position,
          page: data.keys[1] || null,
        },
        site_id: siteId,
      })
    }

    await context.emitEvent({
      event_type: 'gsc.data_synced',
      source_module: 'gsc-insights',
      payload: {
        site_id: siteId,
        days_synced: days,
        daily_rows: dailyUpserted,
        query_rows: queryUpserted,
        new_keywords_found: newQueries.size,
      },
      site_id: siteId,
    })

    return {
      daily_rows: dailyUpserted,
      query_rows: queryUpserted,
      new_keywords: newQueries.size,
    }
  }

  private async findLowCTR(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const siteId = params.site_id || context.siteId
    if (!siteId) throw new Error('site_id is required')

    const maxCtr = (params.max_ctr || 2) / 100
    const minImpressions = params.min_impressions || 100

    const { data: rows } = await context.supabase
      .from('gsc_query_data')
      .select('page, clicks, impressions, ctr, position')
      .eq('site_id', siteId)
      .gte('impressions', minImpressions)
      .lte('ctr', maxCtr)
      .order('impressions', { ascending: false })
      .limit(100)

    if (!rows || rows.length === 0) {
      return { pages: [], message: 'No low-CTR pages found' }
    }

    // Group by page
    const pageMap = new Map<string, { clicks: number; impressions: number; ctr: number; position: number; queries: number }>()
    for (const row of rows) {
      const page = row.page || 'unknown'
      const existing = pageMap.get(page)
      if (existing) {
        existing.clicks += row.clicks
        existing.impressions += row.impressions
        existing.queries++
      } else {
        pageMap.set(page, {
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: Number(row.ctr),
          position: Number(row.position),
          queries: 1,
        })
      }
    }

    const pages = Array.from(pageMap.entries())
      .map(([page, data]) => ({
        page,
        clicks: data.clicks,
        impressions: data.impressions,
        ctr: data.impressions > 0 ? data.clicks / data.impressions : 0,
        avg_position: data.position,
        queries: data.queries,
      }))
      .filter(p => p.ctr < maxCtr)
      .sort((a, b) => b.impressions - a.impressions)

    for (const page of pages.slice(0, 10)) {
      await context.emitEvent({
        event_type: 'gsc.low_ctr_found',
        source_module: 'gsc-insights',
        payload: {
          page: page.page,
          clicks: page.clicks,
          impressions: page.impressions,
          ctr: Math.round(page.ctr * 10000) / 100,
          avg_position: page.avg_position,
        },
        site_id: siteId,
        severity: page.impressions >= 500 ? 'warning' : 'info',
      })
    }

    return { pages_found: pages.length, pages }
  }

  private async checkImpressions(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const siteId = params.site_id || context.siteId
    const url = params.url
    if (!siteId || !url) throw new Error('site_id and url are required')

    const { data: rows } = await context.supabase
      .from('gsc_query_data')
      .select('query, clicks, impressions, ctr, position, date')
      .eq('site_id', siteId)
      .eq('page', url)
      .order('impressions', { ascending: false })
      .limit(50)

    if (!rows || rows.length === 0) {
      return {
        url,
        status: 'no_data',
        message: 'No GSC data found for this URL. Sync GSC data first.',
      }
    }

    const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0)
    const totalImpressions = rows.reduce((sum, r) => sum + r.impressions, 0)
    const avgPosition = rows.reduce((sum, r) => sum + Number(r.position), 0) / rows.length

    if (totalImpressions < 10) {
      await context.emitEvent({
        event_type: 'gsc.impressions_spike',
        source_module: 'gsc-insights',
        payload: {
          url,
          total_impressions: totalImpressions,
          total_clicks: totalClicks,
          status: 'low_impressions',
        },
        site_id: siteId,
        severity: 'warning',
      })
    }

    return {
      url,
      total_clicks: totalClicks,
      total_impressions: totalImpressions,
      avg_position: Math.round(avgPosition * 100) / 100,
      queries: rows.length,
      top_queries: rows.slice(0, 10).map(r => ({
        query: r.query,
        clicks: r.clicks,
        impressions: r.impressions,
        position: Number(r.position),
      })),
    }
  }
}
