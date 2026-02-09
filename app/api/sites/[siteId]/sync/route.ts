import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey, isEncrypted } from '@/lib/utils/encryption'
import { createWordPressClient } from '@/lib/wordpress/client'

// Server-side Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/sites/[siteId]/sync
 * Sync posts from WordPress (decrypts password on server)
 *
 * Uses SEO OS Connector plugin endpoints when available for richer
 * Rank Math data (scores, analysis, content stats). Falls back to
 * standard WP REST API if connector is not installed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params

    // Get site from database
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('url, wp_username, wp_app_password')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return NextResponse.json(
        { success: false, message: 'Site not found' },
        { status: 404 }
      )
    }

    // Check if credentials exist
    if (!site.wp_username || !site.wp_app_password) {
      return NextResponse.json(
        { success: false, message: 'WordPress credentials not configured' },
        { status: 400 }
      )
    }

    // Decrypt password if encrypted
    let appPassword = site.wp_app_password
    if (isEncrypted(appPassword)) {
      const encryptionKey = getEncryptionKey()
      appPassword = await decrypt(appPassword, encryptionKey)
    }

    // Create WordPress client
    const wpClient = createWordPressClient({
      url: `https://${site.url}`,
      username: site.wp_username,
      appPassword: appPassword,
    })

    // Check if connector plugin is available
    const connectorStatus = await wpClient.pingConnector()
    const useConnector = connectorStatus.success

    let syncedCount = 0

    if (useConnector) {
      // ===== Connector-based sync (richer data) =====
      console.log(`[Sync] Using SEO OS Connector (${connectorStatus.version}) for ${site.url}`)

      const result = await wpClient.getPostsWithSEO({ per_page: 100 })

      for (const post of result.posts) {
        // Connector PHP strips 'rank_math_' prefix from keys:
        // seo_score, focus_keyword, title (=seo_title), description (=seo_description),
        // focus_keywords, canonical_url, robots, facebook_title, facebook_description, etc.
        const seo = post.seo || {}

        const { error: upsertError } = await supabase.from('posts').upsert(
          {
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
            // Rank Math from connector SEO data (keys without rank_math_ prefix)
            seo_score: seo.seo_score != null ? Number(seo.seo_score) : null,
            focus_keyword: seo.focus_keyword || null,
            seo_title: seo.title || null,
            seo_description: seo.description || null,
            additional_keywords: seo.focus_keywords
              ? String(seo.focus_keywords).split(',').map((k: string) => k.trim()).filter(Boolean)
              : (seo.additional_keywords || []),
            canonical_url: seo.canonical_url || null,
            robots_meta: seo.robots || 'index,follow',
            og_title: seo.facebook_title || null,
            og_description: seo.facebook_description || null,
            og_image_url: seo.facebook_image || null,
            twitter_title: seo.twitter_title || null,
            twitter_description: seo.twitter_description || null,
            twitter_image_url: seo.twitter_image || null,
            twitter_card_type: seo.twitter_card_type || 'summary_large_image',
            readability_score: seo.readability_score != null ? Number(seo.readability_score) : null,
            content_ai_score: seo.contentai_score != null ? Number(seo.contentai_score) : null,
            // Content analysis from connector (accurate server-side counts)
            internal_links_count: post.content_analysis?.internal_links || 0,
            external_links_count: post.content_analysis?.external_links || 0,
            images_count: post.content_analysis?.images_total || 0,
            images_alt_count: post.content_analysis?.images_with_alt || 0,
            primary_category_id: seo.primary_category != null ? Number(seo.primary_category) : null,
            schema_article_type: seo.schema_article_type || 'Article',
            schema_config: seo.schemas
              ? safeJSONParse(String(seo.schemas))
              : null,
            last_seo_analysis_at: seo.seo_score != null ? new Date().toISOString() : null,
          },
          {
            onConflict: 'site_id,wp_post_id',
          }
        )

        if (!upsertError) {
          syncedCount++
        } else {
          console.error(`Error syncing post ${post.id}:`, upsertError.message)
        }
      }
    } else {
      // ===== Fallback: Standard WP REST API sync =====
      console.log(`[Sync] Connector not available for ${site.url}, using standard WP API`)

      const wpPosts = await wpClient.getPosts({ per_page: 100 })

      for (const wpPost of wpPosts) {
        const rankMathData = wpClient.extractRankMathData(wpPost)

        // Count words in content
        const wordCount = wpPost.content?.rendered
          ? wpPost.content.rendered.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
          : 0

        const { error: upsertError } = await supabase.from('posts').upsert(
          {
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
            // Basic Rank Math
            seo_score: rankMathData.seo_score,
            focus_keyword: rankMathData.focus_keyword,
            seo_title: rankMathData.seo_title,
            seo_description: rankMathData.seo_description,
            // Extended Rank Math
            additional_keywords: rankMathData.additional_keywords,
            canonical_url: rankMathData.canonical_url,
            robots_meta: rankMathData.robots_meta,
            og_title: rankMathData.og_title,
            og_description: rankMathData.og_description,
            og_image_url: rankMathData.og_image_url,
            twitter_title: rankMathData.twitter_title,
            twitter_description: rankMathData.twitter_description,
            twitter_image_url: rankMathData.twitter_image_url,
            twitter_card_type: rankMathData.twitter_card_type,
            readability_score: rankMathData.readability_score,
            content_ai_score: rankMathData.content_ai_score,
            internal_links_count: rankMathData.internal_links_count,
            external_links_count: rankMathData.external_links_count,
            primary_category_id: rankMathData.primary_category_id,
            schema_article_type: rankMathData.schema_article_type,
            schema_config: rankMathData.schema_config,
            last_seo_analysis_at: rankMathData.seo_score ? new Date().toISOString() : null,
          },
          {
            onConflict: 'site_id,wp_post_id',
          }
        )

        if (!upsertError) {
          syncedCount++
        } else {
          console.error(`Error syncing post ${wpPost.id}:`, upsertError.message)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced from WordPress`,
      postsSynced: syncedCount,
      connector: useConnector,
      connectorVersion: connectorStatus.version || null,
    })
  } catch (error) {
    console.error('Error syncing posts:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 }
    )
  }
}

function safeJSONParse(str: string): any {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}
