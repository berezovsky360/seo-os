import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/articles/[articleId]
 * Retrieve article with full Rank Math metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params

    console.log('Fetching article:', articleId)

    const { data, error } = await supabase
      .from('generated_articles')
      .select('*')
      .eq('id', articleId)
      .single()

    if (error || !data) {
      console.error('Article not found:', error)
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ article: data })
  } catch (error) {
    console.error('Error fetching article:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/articles/[articleId]
 * Update article with Rank Math metadata
 * Validates SEO field lengths and formats
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params
    const updates = await request.json()

    console.log('Updating article:', articleId)

    // Validate Rank Math fields
    const validationErrors: string[] = []

    if (updates.seo_title) {
      if (updates.seo_title.length > 70) {
        validationErrors.push('SEO title should be 50-60 characters (max 70)')
      }
    }

    if (updates.seo_description) {
      if (updates.seo_description.length > 170) {
        validationErrors.push('Meta description should be 150-160 characters (max 170)')
      }
    }

    if (updates.robots_meta) {
      const validRobots = ['index,follow', 'index,nofollow', 'noindex,follow', 'noindex,nofollow']
      if (!validRobots.includes(updates.robots_meta)) {
        validationErrors.push('Invalid robots meta directive')
      }
    }

    if (updates.twitter_card_type) {
      const validCardTypes = ['summary', 'summary_large_image', 'app', 'player']
      if (!validCardTypes.includes(updates.twitter_card_type)) {
        validationErrors.push('Invalid Twitter card type')
      }
    }

    if (updates.schema_article_type) {
      const validSchemaTypes = ['Article', 'NewsArticle', 'BlogPosting', 'FAQPage', 'HowTo', 'Review', 'Course', 'VideoObject']
      if (!validSchemaTypes.includes(updates.schema_article_type)) {
        validationErrors.push('Invalid schema article type')
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    // Whitelist only valid generated_articles columns
    const ALLOWED_FIELDS = [
      'keyword', 'title', 'seo_title', 'seo_description', 'content', 'word_count',
      'status', 'wp_post_id', 'published_at', 'slug',
      // Rank Math columns
      'seo_score', 'preliminary_seo_score', 'additional_keywords',
      'canonical_url', 'robots_meta',
      'og_title', 'og_description', 'og_image_url',
      'twitter_title', 'twitter_description', 'twitter_image_url', 'twitter_card_type',
      'readability_score', 'content_ai_score',
      'internal_links_count', 'external_links_count',
      'images_count', 'images_alt_count',
      'schema_article_type', 'schema_config', 'last_analyzed_at',
    ]

    const sanitizedUpdates: Record<string, any> = {}
    for (const key of ALLOWED_FIELDS) {
      if (key in updates) {
        sanitizedUpdates[key] = updates[key]
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    console.log('Sanitized update fields:', Object.keys(sanitizedUpdates))

    // Auto-versioning: create backup if content or title changed
    const contentChanged = 'content' in sanitizedUpdates || 'title' in sanitizedUpdates
    if (contentChanged) {
      try {
        // Fetch current article state
        const { data: currentArticle } = await supabase
          .from('generated_articles')
          .select('*')
          .eq('id', articleId)
          .single()

        if (currentArticle) {
          // Check if last version was created < 5 minutes ago (debounce)
          const { data: lastVersion } = await supabase
            .from('article_versions')
            .select('created_at, version_number')
            .eq('article_id', articleId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
          const shouldCreateVersion = !lastVersion || lastVersion.created_at < fiveMinutesAgo

          if (shouldCreateVersion) {
            const nextVersion = (lastVersion?.version_number || 0) + 1
            await supabase.from('article_versions').insert({
              article_id: articleId,
              site_id: currentArticle.site_id,
              version_number: nextVersion,
              version_label: 'Auto-backup',
              snapshot: currentArticle,
              title: currentArticle.title || null,
              word_count: currentArticle.word_count || null,
              seo_score: currentArticle.seo_score || currentArticle.preliminary_seo_score || null,
            })
            console.log(`Auto-version #${nextVersion} created for article ${articleId}`)
          }
        }
      } catch (versionError) {
        // Don't block save if versioning fails
        console.error('Auto-versioning error (non-blocking):', versionError)
      }
    }

    // Update article in database
    const { data, error } = await supabase
      .from('generated_articles')
      .update(sanitizedUpdates)
      .eq('id', articleId)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update article' },
        { status: 500 }
      )
    }

    console.log('Article updated successfully')

    return NextResponse.json({
      success: true,
      article: data,
    })
  } catch (error) {
    console.error('Error updating article:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/articles/[articleId]
 * Delete generated article (only if not published)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params

    console.log('Deleting article:', articleId)

    // Check if article exists and is not published
    const { data: article } = await supabase
      .from('generated_articles')
      .select('status, wp_post_id')
      .eq('id', articleId)
      .single()

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    if (article.status === 'published' && article.wp_post_id) {
      return NextResponse.json(
        { error: 'Cannot delete published article. Delete from WordPress first.' },
        { status: 400 }
      )
    }

    // Delete article
    const { error } = await supabase
      .from('generated_articles')
      .delete()
      .eq('id', articleId)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to delete article' },
        { status: 500 }
      )
    }

    console.log('Article deleted successfully')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting article:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
