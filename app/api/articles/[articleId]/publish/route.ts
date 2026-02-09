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
 * POST /api/articles/[articleId]/publish
 * Publish article to WordPress with categories and tags
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params
    const body = await request.json()
    const { siteId, categoryIds = [], tagIds = [] } = body

    console.log('Publishing article:', articleId, 'for site:', siteId)

    // Get article from database
    const { data: article, error: articleError } = await supabase
      .from('generated_articles')
      .select('*')
      .eq('id', articleId)
      .single()

    if (articleError || !article) {
      console.error('Article not found:', articleId, articleError)
      return NextResponse.json(
        { success: false, message: 'Article not found' },
        { status: 404 }
      )
    }

    console.log('Article from DB:', {
      id: article.id,
      title: article.title ? `"${article.title.substring(0, 50)}..."` : null,
      content: article.content ? `[${article.content.length} chars]` : null,
      keyword: article.keyword,
      status: article.status,
    })

    if (!article.content || !article.title) {
      console.error('Missing title or content:', {
        hasTitle: !!article.title,
        titleValue: article.title,
        hasContent: !!article.content,
        contentLength: article.content?.length,
      })
      return NextResponse.json(
        { success: false, message: 'Article must have title and content before publishing' },
        { status: 400 }
      )
    }

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

    // Build Rank Math data
    const rankMathData = {
      // Basic SEO
      focus_keyword: article.keyword,
      additional_keywords: article.additional_keywords || [],
      seo_title: article.seo_title || article.title,
      seo_description: article.seo_description,

      // Advanced SEO
      canonical_url: article.canonical_url,
      robots_meta: article.robots_meta || 'index,follow',

      // Social Media - Open Graph
      og_title: article.og_title,
      og_description: article.og_description,
      og_image_url: article.og_image_url,

      // Social Media - Twitter Card
      twitter_title: article.twitter_title,
      twitter_description: article.twitter_description,
      twitter_image_url: article.twitter_image_url,
      twitter_card_type: article.twitter_card_type || 'summary_large_image',

      // Schema Markup
      primary_category_id: categoryIds?.[0],
      schema_article_type: article.schema_article_type || 'Article',
      schema_config: article.schema_config,
    }

    let wpPost: { id: number; link: string }
    const isUpdate = !!article.wp_post_id

    if (isUpdate) {
      // UPDATE existing WordPress post
      console.log('Updating existing WP post:', article.wp_post_id)
      wpPost = await wpClient.updatePostWithRankMath(article.wp_post_id, {
        title: article.title,
        content: article.content,
        status: 'publish',
        categories: categoryIds.length > 0 ? categoryIds : undefined,
        tags: tagIds.length > 0 ? tagIds : undefined,
        rankMath: rankMathData,
      })
    } else {
      // CREATE new WordPress post
      console.log('Creating new WP post')
      wpPost = await wpClient.createPostWithRankMath({
        title: article.title,
        content: article.content,
        status: 'publish',
        categories: categoryIds,
        tags: tagIds,
        rankMath: rankMathData,
      })
    }

    // Update article status to published
    await supabase
      .from('generated_articles')
      .update({
        status: 'published',
        wp_post_id: wpPost.id,
        published_at: article.published_at || new Date().toISOString(),
      })
      .eq('id', articleId)

    // Schedule sync of real Rank Math scores after 5 seconds
    // This allows Rank Math time to analyze the post
    setTimeout(async () => {
      try {
        console.log(`Syncing real Rank Math scores for article ${articleId}...`)

        // Fetch updated post with Rank Math analysis
        const updatedPost = await wpClient.getPost(wpPost.id)
        const rankMathData = wpClient.extractRankMathData(updatedPost)

        // Calculate word count from content
        const contentText = article.content.replace(/<[^>]*>/g, ' ') // Strip HTML
        const wordCount = contentText.split(/\s+/).filter(Boolean).length

        // Count images and links in content
        const imageMatches = article.content.match(/<img[^>]*>/gi) || []
        const imageAltMatches = article.content.match(/<img[^>]*alt=["'][^"']*["'][^>]*>/gi) || []
        const internalLinkMatches = article.content.match(/<a[^>]*href=["'][^"']*["'][^>]*>/gi) || []
        const externalLinkMatches = internalLinkMatches.filter((link: string) =>
          !link.includes(site.url)
        )

        // Update article with real Rank Math analysis results
        await supabase
          .from('generated_articles')
          .update({
            // Real scores from Rank Math
            seo_score: rankMathData.seo_score,
            readability_score: rankMathData.readability_score,
            content_ai_score: rankMathData.content_ai_score,
            internal_links_count: rankMathData.internal_links_count || internalLinkMatches.length,
            external_links_count: rankMathData.external_links_count || externalLinkMatches.length,

            // Calculated metrics
            word_count: wordCount,
            images_count: imageMatches.length,
            images_alt_count: imageAltMatches.length,

            // Timestamp
            last_analyzed_at: new Date().toISOString(),
          })
          .eq('id', articleId)

        console.log(`Synced real scores: SEO=${rankMathData.seo_score}, Readability=${rankMathData.readability_score}`)
      } catch (syncError) {
        console.error('Error syncing Rank Math scores:', syncError)
        // Don't fail the main request if sync fails
      }
    }, 5000)

    return NextResponse.json({
      success: true,
      wpPostId: wpPost.id,
      wpUrl: wpPost.link,
      isUpdate,
      message: isUpdate
        ? 'Successfully updated in WordPress. Real SEO scores will sync in 5 seconds.'
        : 'Successfully published to WordPress. Real SEO scores will sync in 5 seconds.',
    })
  } catch (error) {
    console.error('Error publishing to WordPress:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to publish to WordPress',
      },
      { status: 500 }
    )
  }
}
