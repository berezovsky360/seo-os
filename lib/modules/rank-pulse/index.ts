/**
 * Rank Pulse Module — The Watcher.
 *
 * Monitors keyword positions via DataForSEO.
 * Detects drops, new competitors, and SERP structure changes.
 * Emits events for position changes that trigger Recipes.
 */

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'
import { createDataForSEOClient } from '@/lib/dataforseo/client'

export class RankPulseModule implements SEOModule {
  id = 'rank-pulse' as const
  name = 'Rank Pulse'
  description = 'Monitor keyword positions daily. Detect drops, new competitors, and SERP structure changes.'
  icon = 'BarChart3'

  emittedEvents: EventType[] = [
    'rank.check_completed',
    'rank.position_dropped',
    'rank.position_improved',
    'rank.new_competitor',
    'rank.serp_structure_changed',
  ]

  handledEvents: EventType[] = []

  actions: ModuleAction[] = [
    {
      id: 'check_positions',
      name: 'Check Keyword Positions',
      description: 'Check current positions for all tracked keywords via DataForSEO',
      params: [
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
      ],
    },
    {
      id: 'snapshot_serp',
      name: 'Snapshot SERP',
      description: 'Take a full snapshot of the SERP for a keyword',
      params: [
        { name: 'keyword', type: 'string', label: 'Keyword', required: true },
        { name: 'site_id', type: 'string', label: 'Site ID', required: false },
        { name: 'location_code', type: 'number', label: 'Location Code', required: false, default: 2643 },
        { name: 'language_code', type: 'string', label: 'Language Code', required: false, default: 'ru' },
      ],
    },
  ]

  requiredKeys: ApiKeyType[] = ['dataforseo']

  sidebar: ModuleSidebarConfig = {
    section: 'Monitoring',
    sectionColor: 'bg-violet-500',
    label: 'Rank Pulse',
    viewState: 'rank-pulse',
    order: 0,
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
      case 'check_positions':
        return this.checkPositions(params, context)
      case 'snapshot_serp':
        return this.snapshotSerp(params, context)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  // ====== Action Implementations ======

  private async checkPositions(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const siteId = params.site_id || context.siteId
    if (!siteId) throw new Error('site_id is required')

    // 1. Get site domain for matching in SERP results
    const { data: site } = await context.supabase
      .from('sites')
      .select('url')
      .eq('id', siteId)
      .single()

    if (!site) throw new Error('Site not found')
    const siteUrl = site.url.startsWith('http') ? site.url : `https://${site.url}`
    const siteDomain = new URL(siteUrl).hostname.replace(/^www\./, '')

    // 2. Get all tracked keywords
    const { data: keywords } = await context.supabase
      .from('keywords')
      .select('*')
      .eq('site_id', siteId)

    if (!keywords || keywords.length === 0) {
      return { checked: 0, message: 'No keywords to check' }
    }

    // 3. Build DataForSEO client
    const dfsKey = context.apiKeys['dataforseo']
    if (!dfsKey) throw new Error('DataForSEO API key not configured')
    const client = createDataForSEOClient(dfsKey)

    // 4. Group keywords by (language, location_code) and check
    const groups = new Map<string, typeof keywords>()
    for (const kw of keywords) {
      const key = `${kw.language || 'ru'}:${kw.location_code || 2643}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(kw)
    }

    let checkedCount = 0
    let droppedCount = 0
    let improvedCount = 0

    for (const [groupKey, groupKeywords] of groups) {
      const [lang, locStr] = groupKey.split(':')
      const locationCode = parseInt(locStr)
      const keywordTexts = groupKeywords.map(k => k.keyword)

      const results = await client.checkPositions(keywordTexts, locationCode, lang)

      for (const kw of groupKeywords) {
        const serpResult = results.get(kw.keyword)
        let newPosition: number | null = null

        if (serpResult) {
          // Find our domain in SERP results (organic only)
          const ourResult = serpResult.items.find(item =>
            item.type === 'organic' &&
            item.domain.replace(/^www\./, '').includes(siteDomain)
          )
          newPosition = ourResult ? ourResult.rank_group : null
        }

        const oldPosition = kw.current_position

        // Update keywords table
        await context.supabase
          .from('keywords')
          .update({
            previous_position: oldPosition,
            current_position: newPosition,
            last_checked_at: new Date().toISOString(),
          })
          .eq('id', kw.id)

        // Insert position history
        await context.supabase
          .from('keyword_position_history')
          .upsert({
            keyword_id: kw.id,
            site_id: siteId,
            position: newPosition,
            checked_at: new Date().toISOString().split('T')[0],
          }, { onConflict: 'keyword_id,checked_at' })

        // Detect significant changes (>= 3 positions)
        if (oldPosition != null && newPosition != null) {
          const drop = newPosition - oldPosition
          if (drop >= 3) {
            droppedCount++
            await context.emitEvent({
              event_type: 'rank.position_dropped',
              source_module: 'rank-pulse',
              payload: {
                keyword: kw.keyword,
                keyword_id: kw.id,
                old_position: oldPosition,
                new_position: newPosition,
                drop,
              },
              site_id: siteId,
              severity: drop >= 10 ? 'critical' : 'warning',
            })
          } else if (drop <= -3) {
            improvedCount++
            await context.emitEvent({
              event_type: 'rank.position_improved',
              source_module: 'rank-pulse',
              payload: {
                keyword: kw.keyword,
                keyword_id: kw.id,
                old_position: oldPosition,
                new_position: newPosition,
                improvement: -drop,
              },
              site_id: siteId,
            })
          }
        } else if (oldPosition == null && newPosition != null) {
          improvedCount++
        } else if (oldPosition != null && newPosition == null) {
          droppedCount++
          await context.emitEvent({
            event_type: 'rank.position_dropped',
            source_module: 'rank-pulse',
            payload: {
              keyword: kw.keyword,
              keyword_id: kw.id,
              old_position: oldPosition,
              new_position: null,
              drop: 100,
            },
            site_id: siteId,
            severity: 'critical',
          })
        }

        checkedCount++
      }
    }

    // 5. Emit completion event
    await context.emitEvent({
      event_type: 'rank.check_completed',
      source_module: 'rank-pulse',
      payload: {
        site_id: siteId,
        checked: checkedCount,
        dropped: droppedCount,
        improved: improvedCount,
      },
      site_id: siteId,
    })

    return { checked: checkedCount, dropped: droppedCount, improved: improvedCount }
  }

  private async snapshotSerp(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const keyword = params.keyword
    if (!keyword) throw new Error('keyword is required')

    const locationCode = params.location_code || 2643
    const languageCode = params.language_code || 'ru'
    const siteId = params.site_id || context.siteId

    const dfsKey = context.apiKeys['dataforseo']
    if (!dfsKey) throw new Error('DataForSEO API key not configured')
    const client = createDataForSEOClient(dfsKey)

    const results = await client.checkPositions([keyword], locationCode, languageCode)
    const serpResult = results.get(keyword)

    if (!serpResult) {
      return { keyword, items: [], message: 'No SERP data returned' }
    }

    // Analyze SERP features
    const features = {
      has_featured_snippet: serpResult.items.some(i => i.type === 'featured_snippet'),
      has_local_pack: serpResult.items.some(i => i.type === 'local_pack'),
      has_video: serpResult.items.some(i => i.type === 'video'),
      has_images: serpResult.items.some(i => i.type === 'images'),
      organic_count: serpResult.items.filter(i => i.type === 'organic').length,
      total_results: serpResult.se_results_count,
    }

    // Emit snapshot event (stored in events_log)
    if (siteId) {
      await context.emitEvent({
        event_type: 'rank.serp_structure_changed',
        source_module: 'rank-pulse',
        payload: {
          keyword,
          location_code: locationCode,
          language_code: languageCode,
          features,
          top_10: serpResult.items
            .filter(i => i.type === 'organic')
            .slice(0, 10)
            .map(i => ({
              position: i.rank_group,
              domain: i.domain,
              url: i.url,
              title: i.title,
            })),
        },
        site_id: siteId,
      })
    }

    return {
      keyword,
      features,
      items_count: serpResult.items_count,
      items: serpResult.items,
    }
  }
}
