import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey, isEncrypted } from '@/lib/utils/encryption'
import { createWordPressClient } from '@/lib/wordpress/client'
import { addGutenbergBlockMarkers } from '@/lib/utils/wordpress-blocks'

// Server-side Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/posts/[postId]/publish
 * Update an existing WordPress post with changes from SEO OS
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    const body = await request.json()
    const { siteId, categoryIds = [], tagIds = [] } = body

    // Get post from database
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      )
    }

    if (!post.content || !post.title) {
      return NextResponse.json(
        { success: false, message: 'Post must have title and content' },
        { status: 400 }
      )
    }

    if (!post.wp_post_id) {
      return NextResponse.json(
        { success: false, message: 'Post has no WordPress ID - cannot update' },
        { status: 400 }
      )
    }

    // Get site credentials
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('url, wp_username, wp_app_password')
      .eq('id', siteId)
      .single()

    if (siteError || !site || !site.wp_username || !site.wp_app_password) {
      return NextResponse.json(
        { success: false, message: 'WordPress credentials not configured' },
        { status: 400 }
      )
    }

    // Decrypt password if encrypted
    let appPassword = site.wp_app_password
    if (isEncrypted(appPassword)) {
      appPassword = await decrypt(appPassword, getEncryptionKey())
    }

    // Create WordPress client
    const wpClient = createWordPressClient({
      url: `https://${site.url}`,
      username: site.wp_username,
      appPassword: appPassword,
    })

    // Wrap column HTML with Gutenberg block comments for WordPress
    const wpContent = addGutenbergBlockMarkers(post.content)

    // Update WordPress post with full Rank Math metadata
    const wpPost = await wpClient.updatePostWithRankMath(post.wp_post_id, {
      title: post.title,
      content: wpContent,
      status: post.status || 'publish',
      categories: categoryIds.length > 0 ? categoryIds : undefined,
      tags: tagIds.length > 0 ? tagIds : undefined,
      rankMath: {
        focus_keyword: post.focus_keyword,
        seo_title: post.seo_title || post.title,
        seo_description: post.seo_description,
        additional_keywords: post.additional_keywords || [],
        canonical_url: post.canonical_url,
        robots_meta: post.robots_meta || 'index,follow',
        og_title: post.og_title,
        og_description: post.og_description,
        og_image_url: post.og_image_url,
        twitter_title: post.twitter_title,
        twitter_description: post.twitter_description,
        twitter_image_url: post.twitter_image_url,
        twitter_card_type: post.twitter_card_type || 'summary_large_image',
        primary_category_id: post.primary_category_id || categoryIds?.[0],
        schema_article_type: post.schema_article_type || 'Article',
        schema_config: post.schema_config,
      },
    })

    // Update synced_at timestamp
    await supabase
      .from('posts')
      .update({ synced_at: new Date().toISOString() })
      .eq('id', postId)

    return NextResponse.json({
      success: true,
      wpPostId: wpPost.id,
      wpUrl: wpPost.link,
      isUpdate: true,
      message: 'Successfully updated in WordPress',
    })
  } catch (error) {
    console.error('Error updating WordPress post:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update WordPress post',
      },
      { status: 500 }
    )
  }
}
