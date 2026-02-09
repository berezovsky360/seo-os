import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/posts/[postId]
 * Retrieve WordPress post with full data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, post: data })
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/posts/[postId]
 * Update WordPress-synced post in Supabase
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    const updates = await request.json()

    // Whitelist valid posts columns
    const ALLOWED_FIELDS = [
      'title', 'content', 'slug', 'status',
      'seo_title', 'seo_description', 'focus_keyword', 'word_count',
      'seo_score', 'is_indexable', 'schema_type',
      // Rank Math extended fields
      'additional_keywords', 'canonical_url', 'robots_meta',
      'og_title', 'og_description', 'og_image_url',
      'twitter_title', 'twitter_description', 'twitter_image_url', 'twitter_card_type',
      'readability_score', 'content_ai_score',
      'internal_links_count', 'external_links_count',
      'images_count', 'images_alt_count',
      'primary_category_id', 'schema_article_type', 'schema_config',
      'last_seo_analysis_at',
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

    // Auto-versioning: create backup if content or title changed
    const contentChanged = 'content' in sanitizedUpdates || 'title' in sanitizedUpdates
    if (contentChanged) {
      try {
        const { data: currentPost } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single()

        if (currentPost) {
          const { data: lastVersion } = await supabase
            .from('article_versions')
            .select('created_at, version_number')
            .eq('post_id', postId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
          const shouldCreateVersion = !lastVersion || lastVersion.created_at < fiveMinutesAgo

          if (shouldCreateVersion) {
            const nextVersion = (lastVersion?.version_number || 0) + 1
            await supabase.from('article_versions').insert({
              post_id: postId,
              site_id: currentPost.site_id,
              version_number: nextVersion,
              version_label: 'Auto-backup',
              snapshot: currentPost,
              title: currentPost.title || null,
              word_count: currentPost.word_count || null,
              seo_score: currentPost.seo_score || null,
            })
            console.log(`Auto-version #${nextVersion} created for post ${postId}`)
          }
        }
      } catch (versionError) {
        console.error('Auto-versioning error (non-blocking):', versionError)
      }
    }

    const { data, error } = await supabase
      .from('posts')
      .update(sanitizedUpdates)
      .eq('id', postId)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update post' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, post: data })
  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
