// Content Engine Module — AI-powered news pipeline with RSS ingestion,
// scoring, fact extraction, clustering, and modular content generation.

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'
import { parseFeed } from './rss-parser'
import { scoreItem } from './scoring'
import { extractFacts } from './extractor'
import { factCheck } from './fact-checker'
import { embedItems, clusterItems } from './clustering'
import { generateAllSections, assembleArticle } from './generator'
import type { ContentPreset, ExtractedFact } from './types'

export class ContentEngineModule implements SEOModule {
  id = 'content-engine' as const
  name = 'Content Engine'
  description = 'AI news pipeline: RSS ingestion, scoring, fact extraction, clustering, and modular content generation.'
  icon = 'Newspaper'

  emittedEvents: EventType[] = [
    'engine.feed_polled',
    'engine.items_scored',
    'engine.facts_extracted',
    'engine.facts_checked',
    'engine.items_clustered',
    'engine.sections_generated',
    'engine.article_assembled',
    'engine.article_published',
    'engine.pipeline_completed',
    'engine.pipeline_failed',
  ]

  handledEvents: EventType[] = []

  actions: ModuleAction[] = [
    {
      id: 'poll_feed',
      name: 'Poll RSS Feed',
      description: 'Fetch and parse a single RSS feed, inserting new items',
      params: [
        { name: 'feed_id', type: 'string', label: 'Feed ID', required: true },
      ],
    },
    {
      id: 'poll_all_feeds',
      name: 'Poll All Feeds',
      description: 'Poll all enabled RSS feeds for new content',
      params: [
        { name: 'site_id', type: 'string', label: 'Site ID', required: false },
      ],
    },
    {
      id: 'score_item',
      name: 'Score Item',
      description: 'Rate a single item for SEO + viral appeal using Gemini Flash',
      params: [
        { name: 'item_id', type: 'string', label: 'Item ID', required: true },
      ],
    },
    {
      id: 'score_batch',
      name: 'Score Batch',
      description: 'Score all unscored content items',
      params: [
        { name: 'limit', type: 'number', label: 'Max items', required: false, default: 20 },
      ],
    },
    {
      id: 'extract_facts',
      name: 'Extract Facts',
      description: 'Extract key facts and keywords from content items',
      params: [
        { name: 'item_ids', type: 'string', label: 'Item IDs (comma-separated)', required: false },
        { name: 'limit', type: 'number', label: 'Max items', required: false, default: 10 },
      ],
    },
    {
      id: 'fact_check',
      name: 'Fact Check',
      description: 'Verify extracted facts via DataForSEO SERP results',
      params: [
        { name: 'item_ids', type: 'string', label: 'Item IDs (comma-separated)', required: false },
      ],
    },
    {
      id: 'embed_items',
      name: 'Generate Embeddings',
      description: 'Generate vector embeddings for content items',
      params: [
        { name: 'limit', type: 'number', label: 'Max items', required: false, default: 50 },
      ],
    },
    {
      id: 'cluster_items',
      name: 'Cluster Items',
      description: 'Group content items into semantic clusters',
      params: [
        { name: 'site_id', type: 'string', label: 'Site ID', required: false },
      ],
    },
    {
      id: 'generate_section',
      name: 'Generate Section',
      description: 'Generate a single content section (intro, body, FAQ, etc.)',
      params: [
        { name: 'section_type', type: 'select', label: 'Section Type', required: true, options: [
          { label: 'Zero-Click', value: 'zero_click' },
          { label: 'Introduction', value: 'intro' },
          { label: 'Body', value: 'body' },
          { label: 'Glossary', value: 'glossary' },
          { label: 'FAQ', value: 'faq' },
          { label: 'Conclusion', value: 'conclusion' },
        ]},
        { name: 'item_ids', type: 'string', label: 'Source Item IDs', required: true },
        { name: 'preset', type: 'select', label: 'Preset', required: true, options: [
          { label: 'Full Article (2000+ words)', value: 'full-article' },
          { label: 'News Post (500-800 words)', value: 'news-post' },
        ]},
      ],
    },
    {
      id: 'generate_all_sections',
      name: 'Generate All Sections',
      description: 'Generate all content sections for a complete article',
      params: [
        { name: 'item_ids', type: 'string', label: 'Source Item IDs', required: true },
        { name: 'preset', type: 'select', label: 'Preset', required: true, options: [
          { label: 'Full Article (2000+ words)', value: 'full-article' },
          { label: 'News Post (500-800 words)', value: 'news-post' },
        ]},
        { name: 'persona_id', type: 'string', label: 'Persona', required: false },
        { name: 'site_id', type: 'string', label: 'Site ID', required: false },
      ],
    },
    {
      id: 'assemble_article',
      name: 'Assemble Article',
      description: 'Combine generated sections into a final HTML article',
      params: [
        { name: 'run_id', type: 'string', label: 'Pipeline Run ID', required: true },
      ],
    },
    {
      id: 'generate_image',
      name: 'Generate Cover Image',
      description: 'Generate a cover image via Nana Banana pipeline',
      params: [
        { name: 'run_id', type: 'string', label: 'Pipeline Run ID', required: true },
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
      ],
    },
    {
      id: 'publish_to_wp',
      name: 'Publish to WordPress',
      description: 'Save article and publish to WordPress',
      params: [
        { name: 'run_id', type: 'string', label: 'Pipeline Run ID', required: true },
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
      ],
    },
    {
      id: 'run_full_pipeline',
      name: 'Run Full Pipeline',
      description: 'End-to-end: poll feeds, score, extract, generate, publish',
      params: [
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
        { name: 'preset', type: 'select', label: 'Preset', required: true, options: [
          { label: 'Full Article (2000+ words)', value: 'full-article' },
          { label: 'News Post (500-800 words)', value: 'news-post' },
        ]},
        { name: 'min_score', type: 'number', label: 'Minimum Score', required: false, default: 60 },
        { name: 'persona_id', type: 'string', label: 'Persona', required: false },
      ],
    },
  ]

  requiredKeys: ApiKeyType[] = ['gemini']

  sidebar: ModuleSidebarConfig = {
    section: 'Content',
    sectionColor: 'bg-yellow-500',
    label: 'Content Engine',
    viewState: 'content-engine',
    order: 3,
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
      case 'poll_feed': return this.pollFeed(params, context)
      case 'poll_all_feeds': return this.pollAllFeeds(params, context)
      case 'score_item': return this.scoreItem(params, context)
      case 'score_batch': return this.scoreBatch(params, context)
      case 'extract_facts': return this.extractFacts(params, context)
      case 'fact_check': return this.factCheckAction(params, context)
      case 'embed_items': return this.embedItems(params, context)
      case 'cluster_items': return this.clusterItemsAction(params, context)
      case 'generate_section': return this.generateSectionAction(params, context)
      case 'generate_all_sections': return this.generateAllSectionsAction(params, context)
      case 'assemble_article': return this.assembleArticleAction(params, context)
      case 'generate_image': return this.generateImageAction(params, context)
      case 'publish_to_wp': return this.publishToWP(params, context)
      case 'run_full_pipeline': return this.runFullPipeline(params, context)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  // ====== Action Implementations ======

  private async pollFeed(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { feed_id } = params
    if (!feed_id) throw new Error('feed_id is required')

    const { data: feed } = await context.supabase
      .from('content_feeds')
      .select('*')
      .eq('id', feed_id)
      .eq('user_id', context.userId)
      .single()

    if (!feed) throw new Error('Feed not found')

    const items = await parseFeed(feed.feed_url)
    let newCount = 0

    for (const item of items) {
      const { error } = await context.supabase
        .from('content_items')
        .upsert(
          {
            user_id: context.userId,
            feed_id: feed.id,
            guid: item.guid,
            title: item.title,
            url: item.link,
            content: item.content,
            published_at: item.pubDate,
            status: 'ingested',
          },
          { onConflict: 'feed_id,guid', ignoreDuplicates: true }
        )

      if (!error) newCount++
    }

    // Update feed metadata
    await context.supabase
      .from('content_feeds')
      .update({
        last_polled_at: new Date().toISOString(),
        last_item_count: items.length,
      })
      .eq('id', feed.id)

    await context.emitEvent({
      event_type: 'engine.feed_polled',
      source_module: 'content-engine',
      payload: { feed_id: feed.id, feed_name: feed.name, total_items: items.length, new_items: newCount },
      site_id: feed.site_id,
    })

    return { feed_id: feed.id, total_items: items.length, new_items: newCount }
  }

  private async pollAllFeeds(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    let query = context.supabase
      .from('content_feeds')
      .select('id')
      .eq('user_id', context.userId)
      .eq('enabled', true)

    if (params.site_id) {
      query = query.eq('site_id', params.site_id)
    }

    const { data: feeds } = await query
    if (!feeds?.length) return { feeds_polled: 0, total_new_items: 0 }

    let totalNew = 0
    for (const feed of feeds) {
      const result = await this.pollFeed({ feed_id: feed.id }, context)
      totalNew += result.new_items || 0
    }

    return { feeds_polled: feeds.length, total_new_items: totalNew }
  }

  private async scoreItem(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { item_id } = params
    if (!item_id) throw new Error('item_id is required')

    const geminiKey = context.apiKeys['gemini']
    if (!geminiKey) throw new Error('Gemini API key not configured')

    const { data: item } = await context.supabase
      .from('content_items')
      .select('id, title, content')
      .eq('id', item_id)
      .eq('user_id', context.userId)
      .single()

    if (!item) throw new Error('Item not found')

    const score = await scoreItem(item.title, item.content || '', geminiKey)

    await context.supabase
      .from('content_items')
      .update({
        seo_score: score.seo_score,
        viral_score: score.viral_score,
        combined_score: score.combined_score,
        score_reasoning: score.reasoning,
        status: 'scored',
      })
      .eq('id', item.id)

    return { item_id: item.id, ...score }
  }

  private async scoreBatch(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const limit = params.limit || 20
    const geminiKey = context.apiKeys['gemini']
    if (!geminiKey) throw new Error('Gemini API key not configured')

    const { data: items } = await context.supabase
      .from('content_items')
      .select('id, title, content')
      .eq('user_id', context.userId)
      .eq('status', 'ingested')
      .limit(limit)

    if (!items?.length) return { scored: 0 }

    let scored = 0
    for (const item of items) {
      try {
        const score = await scoreItem(item.title, item.content || '', geminiKey)
        await context.supabase
          .from('content_items')
          .update({
            seo_score: score.seo_score,
            viral_score: score.viral_score,
            combined_score: score.combined_score,
            score_reasoning: score.reasoning,
            status: 'scored',
          })
          .eq('id', item.id)
        scored++
      } catch {
        // Skip items that fail
      }
    }

    await context.emitEvent({
      event_type: 'engine.items_scored',
      source_module: 'content-engine',
      payload: { scored, total: items.length },
    })

    return { scored, total: items.length }
  }

  private async extractFacts(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const geminiKey = context.apiKeys['gemini']
    if (!geminiKey) throw new Error('Gemini API key not configured')

    const limit = params.limit || 10
    let query = context.supabase
      .from('content_items')
      .select('id, title, content')
      .eq('user_id', context.userId)

    if (params.item_ids) {
      const ids = typeof params.item_ids === 'string' ? params.item_ids.split(',') : params.item_ids
      query = query.in('id', ids)
    } else {
      query = query.eq('status', 'scored').order('combined_score', { ascending: false }).limit(limit)
    }

    const { data: items } = await query
    if (!items?.length) return { extracted: 0 }

    let extracted = 0
    for (const item of items) {
      try {
        const result = await extractFacts(item.title, item.content || '', geminiKey)
        await context.supabase
          .from('content_items')
          .update({
            extracted_facts: result.facts,
            extracted_keywords: result.keywords,
            status: 'extracted',
          })
          .eq('id', item.id)
        extracted++
      } catch {
        // Skip items that fail
      }
    }

    await context.emitEvent({
      event_type: 'engine.facts_extracted',
      source_module: 'content-engine',
      payload: { extracted, total: items.length },
    })

    return { extracted, total: items.length }
  }

  private async factCheckAction(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const dataforseoKey = context.apiKeys['dataforseo']
    if (!dataforseoKey) throw new Error('DataForSEO API key not configured')

    let query = context.supabase
      .from('content_items')
      .select('id, extracted_facts')
      .eq('user_id', context.userId)
      .eq('status', 'extracted')
      .is('fact_check_results', null)

    if (params.item_ids) {
      const ids = typeof params.item_ids === 'string' ? params.item_ids.split(',') : params.item_ids
      query = query.in('id', ids)
    }

    const { data: items } = await query.limit(5)
    if (!items?.length) return { checked: 0 }

    let checked = 0
    for (const item of items) {
      const facts = (item.extracted_facts || []) as ExtractedFact[]
      if (!facts.length) continue

      try {
        const results = await factCheck(facts, dataforseoKey)
        await context.supabase
          .from('content_items')
          .update({ fact_check_results: results })
          .eq('id', item.id)
        checked++
      } catch {
        // Skip items that fail
      }
    }

    await context.emitEvent({
      event_type: 'engine.facts_checked',
      source_module: 'content-engine',
      payload: { checked, total: items.length },
    })

    return { checked, total: items.length }
  }

  private async embedItems(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const geminiKey = context.apiKeys['gemini']
    if (!geminiKey) throw new Error('Gemini API key not configured')

    const limit = params.limit || 50
    const { data: items } = await context.supabase
      .from('content_items')
      .select('id, title, content')
      .eq('user_id', context.userId)
      .is('embedding', null)
      .limit(limit)

    if (!items?.length) return { embedded: 0 }

    const embedded = await embedItems(items, geminiKey, context.supabase)
    return { embedded, total: items.length }
  }

  private async clusterItemsAction(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const geminiKey = context.apiKeys['gemini']
    if (!geminiKey) throw new Error('Gemini API key not configured')

    const clusters = await clusterItems(
      context.userId,
      params.site_id || context.siteId || null,
      context.supabase,
      geminiKey
    )

    await context.emitEvent({
      event_type: 'engine.items_clustered',
      source_module: 'content-engine',
      payload: { clusters_created: clusters.length },
    })

    return { clusters_created: clusters.length, clusters: clusters.map((c) => ({ id: c.id, label: c.label, item_count: c.item_count })) }
  }

  private async generateSectionAction(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const geminiKey = context.apiKeys['gemini']
    if (!geminiKey) throw new Error('Gemini API key not configured')

    const { section_type, item_ids, preset } = params
    if (!section_type || !item_ids) throw new Error('section_type and item_ids required')

    const ids = typeof item_ids === 'string' ? item_ids.split(',') : item_ids
    const { data: items } = await context.supabase
      .from('content_items')
      .select('title, extracted_facts, extracted_keywords')
      .in('id', ids)

    if (!items?.length) throw new Error('No items found')

    const allFacts = items.flatMap((i) => (i.extracted_facts || []) as ExtractedFact[])
    const allKeywords = [...new Set(items.flatMap((i) => (i.extracted_keywords || []) as string[]))]
    const topic = items[0].title

    const { generateSection } = await import('./generator')
    const result = await generateSection(
      section_type,
      { facts: allFacts, keywords: allKeywords, topic, preset: preset || 'full-article' },
      geminiKey
    )

    return { section_type, html: result.html, word_count: result.word_count }
  }

  private async generateAllSectionsAction(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const geminiKey = context.apiKeys['gemini']
    if (!geminiKey) throw new Error('Gemini API key not configured')

    const { item_ids, preset, persona_id, site_id } = params
    // item_ids can come from params or from previousResult
    const ids = typeof item_ids === 'string' ? item_ids.split(',') : (item_ids || [])

    if (!ids.length) throw new Error('item_ids required')

    const { data: items } = await context.supabase
      .from('content_items')
      .select('id, title, extracted_facts, extracted_keywords')
      .in('id', ids)

    if (!items?.length) throw new Error('No items found')

    const allFacts = items.flatMap((i) => (i.extracted_facts || []) as ExtractedFact[])
    const allKeywords = [...new Set(items.flatMap((i) => (i.extracted_keywords || []) as string[]))]
    const topic = items[0].title

    // Get persona context if provided
    let personaContext: string | undefined
    if (persona_id) {
      const { PersonasModule } = await import('@/lib/modules/personas')
      const personasModule = new PersonasModule()
      const pCtx = await personasModule.executeAction(
        'get_persona_context',
        { persona_id, topic },
        context
      )
      const parts: string[] = []
      if (pCtx.systemPrompt) parts.push(pCtx.systemPrompt)
      if (pCtx.inlineContext) parts.push(pCtx.inlineContext)
      personaContext = parts.join('\n')
    }

    // Create pipeline run
    const { data: run } = await context.supabase
      .from('content_pipeline_runs')
      .insert({
        user_id: context.userId,
        site_id: site_id || context.siteId || null,
        preset: preset || 'full-article',
        source_item_ids: ids,
        status: 'generating',
      })
      .select()
      .single()

    try {
      const result = await generateAllSections(
        { facts: allFacts, keywords: allKeywords, topic, preset: (preset || 'full-article') as ContentPreset },
        geminiKey,
        personaContext
      )

      await context.supabase
        .from('content_pipeline_runs')
        .update({ sections: result.sections, word_count: result.total_words, status: 'assembling' })
        .eq('id', run!.id)

      await context.emitEvent({
        event_type: 'engine.sections_generated',
        source_module: 'content-engine',
        payload: { run_id: run!.id, word_count: result.total_words },
      })

      return { run_id: run!.id, sections: result.sections, total_words: result.total_words, item_ids: ids, topic, keywords: allKeywords }
    } catch (error) {
      await context.supabase
        .from('content_pipeline_runs')
        .update({ status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' })
        .eq('id', run!.id)
      throw error
    }
  }

  private async assembleArticleAction(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const geminiKey = context.apiKeys['gemini']
    if (!geminiKey) throw new Error('Gemini API key not configured')

    const { run_id, sections, topic, keywords } = params
    if (!run_id && !sections) throw new Error('run_id or sections required')

    let secs = sections
    let artTopic = topic || 'Article'
    let artKeywords = keywords || []

    if (run_id && !sections) {
      const { data: run } = await context.supabase
        .from('content_pipeline_runs')
        .select('*')
        .eq('id', run_id)
        .single()
      if (!run) throw new Error('Pipeline run not found')
      secs = run.sections
      artTopic = run.title || artTopic

      // Get keywords from source items
      if (run.source_item_ids?.length) {
        const { data: items } = await context.supabase
          .from('content_items')
          .select('extracted_keywords')
          .in('id', run.source_item_ids)
        artKeywords = [...new Set((items || []).flatMap((i) => (i.extracted_keywords || []) as string[]))]
      }
    }

    const result = await assembleArticle(secs, artTopic, artKeywords, geminiKey)

    if (run_id) {
      await context.supabase
        .from('content_pipeline_runs')
        .update({
          assembled_html: result.html,
          title: result.title,
          seo_title: result.seo_title,
          seo_description: result.seo_description,
          focus_keyword: result.focus_keyword,
          word_count: result.word_count,
          status: 'publishing',
        })
        .eq('id', run_id)

      await context.emitEvent({
        event_type: 'engine.article_assembled',
        source_module: 'content-engine',
        payload: { run_id, title: result.title, word_count: result.word_count },
      })
    }

    return { run_id, ...result }
  }

  private async generateImageAction(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { run_id, site_id } = params
    if (!run_id || !site_id) throw new Error('run_id and site_id required')

    const { data: run } = await context.supabase
      .from('content_pipeline_runs')
      .select('title, focus_keyword, assembled_html')
      .eq('id', run_id)
      .single()

    if (!run) throw new Error('Pipeline run not found')

    // Delegate to Nana Banana module
    const { NanaBananaModule } = await import('@/lib/modules/nana-banana')
    const nanaBanana = new NanaBananaModule()

    // First create a temporary post for nana-banana to use
    const { data: article } = await context.supabase
      .from('generated_articles')
      .insert({
        user_id: context.userId,
        site_id,
        title: run.title || 'Generated Article',
        content: run.assembled_html || '',
        focus_keyword: run.focus_keyword || '',
        status: 'draft',
      })
      .select()
      .single()

    if (article) {
      await context.supabase
        .from('content_pipeline_runs')
        .update({ generated_article_id: article.id })
        .eq('id', run_id)

      try {
        const result = await nanaBanana.executeAction(
          'run_full_pipeline',
          { post_id: article.id, site_id, table: 'generated_articles' },
          context
        )
        return { run_id, article_id: article.id, image_result: result }
      } catch {
        return { run_id, article_id: article.id, image_error: 'Image generation failed' }
      }
    }

    return { run_id, image_error: 'Could not create article record' }
  }

  private async publishToWP(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { run_id, site_id } = params
    if (!run_id || !site_id) throw new Error('run_id and site_id required')

    const { data: run } = await context.supabase
      .from('content_pipeline_runs')
      .select('*')
      .eq('id', run_id)
      .single()

    if (!run) throw new Error('Pipeline run not found')
    if (!run.assembled_html) throw new Error('Article not assembled yet')

    // Get site credentials
    const { data: site } = await context.supabase
      .from('sites')
      .select('url, wp_username, wp_app_password')
      .eq('id', site_id)
      .single()

    if (!site?.wp_username || !site?.wp_app_password) {
      throw new Error('WordPress credentials not configured for this site')
    }

    const { WordPressClient } = await import('@/lib/wordpress/client')
    const wpClient = new WordPressClient({
      url: site.url.replace(/^https?:\/\//, ''),
      username: site.wp_username,
      appPassword: site.wp_app_password,
    })

    const wp = await wpClient.createPost({
      title: run.title || 'Generated Article',
      content: run.assembled_html,
      status: 'draft',
    })

    // Save to generated_articles if not already done
    if (!run.generated_article_id) {
      const { data: article } = await context.supabase
        .from('generated_articles')
        .insert({
          user_id: context.userId,
          site_id,
          title: run.title || 'Generated Article',
          content: run.assembled_html,
          focus_keyword: run.focus_keyword || '',
          seo_title: run.seo_title || '',
          seo_description: run.seo_description || '',
          status: 'draft',
        })
        .select()
        .single()

      if (article) {
        await context.supabase
          .from('content_pipeline_runs')
          .update({ generated_article_id: article.id })
          .eq('id', run_id)
      }
    }

    // Update pipeline run
    await context.supabase
      .from('content_pipeline_runs')
      .update({
        wp_post_id: wp.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', run_id)

    // Mark source items as used
    if (run.source_item_ids?.length) {
      await context.supabase
        .from('content_items')
        .update({ status: 'used' })
        .in('id', run.source_item_ids)
    }

    await context.emitEvent({
      event_type: 'engine.article_published',
      source_module: 'content-engine',
      payload: { run_id, wp_post_id: wp.id, title: run.title },
      site_id,
    })

    return { run_id, wp_post_id: wp.id, wp_post_url: wp.link }
  }

  private async runFullPipeline(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { site_id, preset, min_score, persona_id } = params
    if (!site_id) throw new Error('site_id required')

    try {
      // 1. Poll all feeds
      const pollResult = await this.pollAllFeeds({ site_id }, context)

      // 2. Score new items
      const scoreResult = await this.scoreBatch({ limit: 20 }, context)

      // 3. Extract facts from top-scoring items
      const extractResult = await this.extractFacts({ limit: 10 }, context)

      // 4. Fact check
      const factCheckResult = await this.factCheckAction({}, context)

      // 5. Find best items to write about
      const threshold = min_score || 60
      const { data: topItems } = await context.supabase
        .from('content_items')
        .select('id')
        .eq('user_id', context.userId)
        .eq('status', 'extracted')
        .gte('combined_score', threshold)
        .order('combined_score', { ascending: false })
        .limit(5)

      if (!topItems?.length) {
        return {
          status: 'no_content',
          poll: pollResult,
          score: scoreResult,
          extract: extractResult,
          fact_check: factCheckResult,
          message: `No items scored above ${threshold}`,
        }
      }

      const itemIds = topItems.map((i) => i.id)

      // 6. Generate all sections
      const genResult = await this.generateAllSectionsAction(
        { item_ids: itemIds, preset: preset || 'full-article', persona_id, site_id },
        context
      )

      // 7. Assemble article
      const assembleResult = await this.assembleArticleAction(
        { run_id: genResult.run_id, sections: genResult.sections, topic: genResult.topic, keywords: genResult.keywords },
        context
      )

      // 8. Publish to WP
      const publishResult = await this.publishToWP(
        { run_id: assembleResult.run_id, site_id },
        context
      )

      await context.emitEvent({
        event_type: 'engine.pipeline_completed',
        source_module: 'content-engine',
        payload: { run_id: publishResult.run_id, wp_post_id: publishResult.wp_post_id },
        site_id,
      })

      return {
        status: 'completed',
        run_id: publishResult.run_id,
        wp_post_id: publishResult.wp_post_id,
        word_count: assembleResult.word_count,
        title: assembleResult.title,
      }
    } catch (error) {
      await context.emitEvent({
        event_type: 'engine.pipeline_failed',
        source_module: 'content-engine',
        payload: { error: error instanceof Error ? error.message : 'Unknown error' },
        site_id,
      })
      throw error
    }
  }
}
