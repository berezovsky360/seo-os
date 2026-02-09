/**
 * RankMath Bridge Module — The Executor.
 *
 * Wraps existing WordPress integration code into the SEOModule interface.
 * Handles syncing posts, pushing metadata, and bulk operations across sites.
 *
 * Reuses:
 * - lib/wordpress/client.ts (WordPress REST API client)
 * - app/api/sites/[siteId]/sync/route.ts (sync logic)
 * - app/api/posts/[postId]/publish/route.ts (publish logic)
 */

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'
import { createWordPressClient } from '@/lib/wordpress/client'
import { decrypt, getEncryptionKey, isEncrypted } from '@/lib/utils/encryption'

export class RankMathBridgeModule implements SEOModule {
  id = 'rankmath-bridge' as const
  name = 'RankMath Bridge'
  description = 'Sync and manage RankMath SEO metadata across all WordPress sites. Bulk edit titles, descriptions, and schemas from one panel.'
  icon = 'Globe'

  emittedEvents: EventType[] = [
    'bridge.sync_completed',
    'bridge.metadata_pushed',
    'bridge.bulk_push_completed',
    'bridge.draft_created',
  ]

  handledEvents: EventType[] = [
    'content.rewrite_ready',
    'content.faq_generated',
    'content.title_suggestions_ready',
  ]

  actions: ModuleAction[] = [
    {
      id: 'sync_site',
      name: 'Sync Posts from WP',
      description: 'Fetch all posts and RankMath SEO data from a WordPress site',
      params: [
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
      ],
    },
    {
      id: 'push_metadata',
      name: 'Push Metadata to WP',
      description: 'Update a single post\'s SEO metadata on WordPress',
      params: [
        { name: 'post_id', type: 'string', label: 'Post ID (Supabase)', required: true },
        { name: 'seo_title', type: 'string', label: 'SEO Title', required: false },
        { name: 'seo_description', type: 'string', label: 'Meta Description', required: false },
        { name: 'focus_keyword', type: 'string', label: 'Focus Keyword', required: false },
      ],
    },
    {
      id: 'bulk_push',
      name: 'Bulk Update Metadata',
      description: 'Update SEO metadata for multiple posts across multiple sites',
      params: [
        { name: 'updates', type: 'string', label: 'Updates JSON', required: true, description: 'Array of { post_id, seo_title?, seo_description?, focus_keyword? }' },
      ],
    },
    {
      id: 'create_draft',
      name: 'Create WP Draft',
      description: 'Create a new draft post on WordPress with SEO metadata',
      params: [
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
        { name: 'title', type: 'string', label: 'Post Title', required: true },
        { name: 'content', type: 'string', label: 'Post Content', required: false },
        { name: 'seo_title', type: 'string', label: 'SEO Title', required: false },
        { name: 'seo_description', type: 'string', label: 'Meta Description', required: false },
        { name: 'focus_keyword', type: 'string', label: 'Focus Keyword', required: false },
        { name: 'status', type: 'select', label: 'Status', required: false, default: 'draft', options: [{ label: 'Draft', value: 'draft' }, { label: 'Publish', value: 'publish' }] },
      ],
    },
  ]

  requiredKeys: ApiKeyType[] = [] // WordPress credentials are per-site in the sites table

  sidebar: ModuleSidebarConfig = {
    section: 'SEO Tools',
    sectionColor: 'bg-emerald-500',
    label: 'RankMath Bridge',
    viewState: 'rankmath-bridge',
    order: 0,
  }

  /**
   * Handle incoming events from other modules.
   */
  async handleEvent(event: CoreEvent, context: ModuleContext): Promise<CoreEvent | null> {
    switch (event.event_type) {
      case 'content.rewrite_ready': {
        // AI generated a rewrite — create a draft on WP
        const { site_id, title, content, seo_title, seo_description, focus_keyword } = event.payload
        if (site_id && title) {
          const result = await this.executeAction('create_draft', {
            site_id,
            title,
            content: content || '',
            seo_title,
            seo_description,
            focus_keyword,
            status: 'draft',
          }, context)
          return {
            event_type: 'bridge.draft_created',
            source_module: 'rankmath-bridge',
            payload: result,
            site_id,
          }
        }
        return null
      }

      case 'content.title_suggestions_ready': {
        // AI generated title suggestions — store them (don't auto-push)
        // The user reviews in the UI
        return null
      }

      default:
        return null
    }
  }

  /**
   * Execute a named action.
   */
  async executeAction(
    actionId: string,
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    switch (actionId) {
      case 'sync_site':
        return this.syncSite(params.site_id, context)
      case 'push_metadata':
        return this.pushMetadata(params, context)
      case 'bulk_push':
        return this.bulkPush(params, context)
      case 'create_draft':
        return this.createDraft(params, context)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  // ====== Action Implementations ======

  private async syncSite(
    siteId: string,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    // Get site credentials
    const { data: site } = await context.supabase
      .from('sites')
      .select('url, wp_username, wp_app_password')
      .eq('id', siteId)
      .single()

    if (!site || !site.wp_username || !site.wp_app_password) {
      throw new Error('Site not found or WordPress credentials not configured')
    }

    // Decrypt password
    let appPassword = site.wp_app_password
    if (isEncrypted(appPassword)) {
      const encryptionKey = getEncryptionKey()
      appPassword = await decrypt(appPassword, encryptionKey)
    }

    const wpClient = createWordPressClient({
      url: `https://${site.url.replace(/^https?:\/\//, '')}`,
      username: site.wp_username,
      appPassword,
    })

    // Try connector first, fall back to standard API
    const connectorStatus = await wpClient.pingConnector()
    let syncedCount = 0

    if (connectorStatus.success) {
      const result = await wpClient.getPostsWithSEO({ per_page: 100 })
      for (const post of result.posts) {
        const seo = post.seo || {}
        const { error } = await context.supabase.from('posts').upsert({
          site_id: siteId,
          wp_post_id: post.id,
          title: post.title,
          slug: post.slug,
          url: post.url,
          status: post.status,
          content: post.content,
          word_count: post.word_count,
          published_at: post.status === 'publish' ? post.date : null,
          synced_at: new Date().toISOString(),
          seo_score: seo.seo_score != null ? Number(seo.seo_score) : null,
          focus_keyword: seo.focus_keyword || null,
          seo_title: seo.title || null,
          seo_description: seo.description || null,
        }, { onConflict: 'site_id,wp_post_id' })

        if (!error) syncedCount++
      }
    } else {
      const wpPosts = await wpClient.getPosts({ per_page: 100 })
      for (const wpPost of wpPosts) {
        const rankMathData = wpClient.extractRankMathData(wpPost)
        const wordCount = wpPost.content?.rendered
          ? wpPost.content.rendered.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
          : 0

        const { error } = await context.supabase.from('posts').upsert({
          site_id: siteId,
          wp_post_id: wpPost.id,
          title: wpPost.title.rendered,
          slug: wpPost.slug,
          url: wpPost.link,
          status: wpPost.status,
          content: wpPost.content.rendered,
          word_count: wordCount,
          published_at: wpPost.status === 'publish' ? wpPost.date : null,
          synced_at: new Date().toISOString(),
          seo_score: rankMathData.seo_score,
          focus_keyword: rankMathData.focus_keyword,
          seo_title: rankMathData.seo_title,
          seo_description: rankMathData.seo_description,
        }, { onConflict: 'site_id,wp_post_id' })

        if (!error) syncedCount++
      }
    }

    // Emit completion event
    await context.emitEvent({
      event_type: 'bridge.sync_completed',
      source_module: 'rankmath-bridge',
      payload: { site_id: siteId, posts_synced: syncedCount, connector: connectorStatus.success },
      site_id: siteId,
    })

    return { site_id: siteId, posts_synced: syncedCount }
  }

  private async pushMetadata(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { post_id, seo_title, seo_description, focus_keyword } = params

    // Get post with site info
    const { data: post } = await context.supabase
      .from('posts')
      .select('*, sites(url, wp_username, wp_app_password)')
      .eq('id', post_id)
      .single()

    if (!post || !post.wp_post_id) {
      throw new Error('Post not found or not linked to WordPress')
    }

    const site = (post as any).sites
    if (!site?.wp_username || !site?.wp_app_password) {
      throw new Error('WordPress credentials not configured for this site')
    }

    let appPassword = site.wp_app_password
    if (isEncrypted(appPassword)) {
      appPassword = await decrypt(appPassword, getEncryptionKey())
    }

    const wpClient = createWordPressClient({
      url: `https://${site.url.replace(/^https?:\/\//, '')}`,
      username: site.wp_username,
      appPassword,
    })

    // Update WordPress post meta
    await wpClient.updatePost(post.wp_post_id, {
      meta: {
        ...(seo_title && { rank_math_title: seo_title }),
        ...(seo_description && { rank_math_description: seo_description }),
        ...(focus_keyword && { rank_math_focus_keyword: focus_keyword }),
      },
    })

    // Update local DB
    const updates: Record<string, any> = {}
    if (seo_title) updates.seo_title = seo_title
    if (seo_description) updates.seo_description = seo_description
    if (focus_keyword) updates.focus_keyword = focus_keyword

    if (Object.keys(updates).length > 0) {
      await context.supabase
        .from('posts')
        .update(updates)
        .eq('id', post_id)
    }

    await context.emitEvent({
      event_type: 'bridge.metadata_pushed',
      source_module: 'rankmath-bridge',
      payload: { post_id, wp_post_id: post.wp_post_id, ...updates },
      site_id: post.site_id,
    })

    return { post_id, wp_post_id: post.wp_post_id, updated_fields: Object.keys(updates) }
  }

  private async bulkPush(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const updates = typeof params.updates === 'string'
      ? JSON.parse(params.updates)
      : params.updates

    if (!Array.isArray(updates)) {
      throw new Error('updates must be an array')
    }

    let successCount = 0
    let failCount = 0
    const results: any[] = []

    for (const update of updates) {
      try {
        const result = await this.pushMetadata(update, context)
        results.push({ ...result, success: true })
        successCount++
      } catch (err) {
        results.push({
          post_id: update.post_id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
        failCount++
      }
    }

    await context.emitEvent({
      event_type: 'bridge.bulk_push_completed',
      source_module: 'rankmath-bridge',
      payload: { total: updates.length, success: successCount, failed: failCount },
      severity: failCount > 0 ? 'warning' : 'info',
    })

    return { total: updates.length, success: successCount, failed: failCount, results }
  }

  private async createDraft(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { site_id, title, content, seo_title, seo_description, focus_keyword, status } = params

    const { data: site } = await context.supabase
      .from('sites')
      .select('url, wp_username, wp_app_password')
      .eq('id', site_id)
      .single()

    if (!site?.wp_username || !site?.wp_app_password) {
      throw new Error('WordPress credentials not configured')
    }

    let appPassword = site.wp_app_password
    if (isEncrypted(appPassword)) {
      appPassword = await decrypt(appPassword, getEncryptionKey())
    }

    const wpClient = createWordPressClient({
      url: `https://${site.url.replace(/^https?:\/\//, '')}`,
      username: site.wp_username,
      appPassword,
    })

    const wpPost = await wpClient.createPost({
      title: title,
      content: content || '',
      status: status || 'draft',
      meta: {
        ...(focus_keyword && { rank_math_focus_keyword: focus_keyword }),
        ...(seo_title && { rank_math_title: seo_title }),
        ...(seo_description && { rank_math_description: seo_description }),
      },
    })

    await context.emitEvent({
      event_type: 'bridge.draft_created',
      source_module: 'rankmath-bridge',
      payload: {
        site_id,
        wp_post_id: wpPost.id,
        wp_url: wpPost.link,
        title,
        status: status || 'draft',
      },
      site_id,
    })

    return { site_id, wp_post_id: wpPost.id, wp_url: wpPost.link }
  }
}
