import { supabase } from '@/lib/supabase/client'
import { createWordPressClient } from '@/lib/wordpress/client'
import type { Post } from '@/types'

// Database type (matches Supabase schema)
export interface PostRecord {
  id: string
  site_id: string
  wp_post_id: number | null
  title: string
  slug: string | null
  url: string | null
  status: 'draft' | 'publish' | 'pending' | 'private'
  content: string | null
  seo_score: number | null
  focus_keyword: string | null
  seo_title: string | null
  seo_description: string | null
  is_indexable: boolean
  schema_type: string | null
  word_count: number | null
  published_at: string | null
  synced_at: string
  created_at: string
  // Extended Rank Math fields
  additional_keywords?: string[] | null
  canonical_url?: string | null
  robots_meta?: string | null
  og_title?: string | null
  og_description?: string | null
  og_image_url?: string | null
  twitter_title?: string | null
  twitter_description?: string | null
  twitter_image_url?: string | null
  twitter_card_type?: string | null
  readability_score?: number | null
  content_ai_score?: number | null
  internal_links_count?: number | null
  external_links_count?: number | null
  images_count?: number | null
  images_alt_count?: number | null
  primary_category_id?: number | null
  schema_article_type?: string | null
  schema_config?: any | null
  last_seo_analysis_at?: string | null
}

// Transform DB record to App type
function transformPostRecord(record: PostRecord): Post {
  return {
    id: record.id,
    site_id: record.site_id,
    wp_post_id: record.wp_post_id,
    title: record.title,
    slug: record.slug,
    url: record.url,
    status: record.status,
    content: record.content,
    seo_score: record.seo_score,
    focus_keyword: record.focus_keyword,
    seo_title: record.seo_title,
    seo_description: record.seo_description,
    is_indexable: record.is_indexable,
    schema_type: record.schema_type,
    word_count: record.word_count,
    published_at: record.published_at,
    synced_at: record.synced_at,
    created_at: record.created_at,
    // Extended Rank Math fields
    additional_keywords: record.additional_keywords ?? null,
    canonical_url: record.canonical_url ?? null,
    robots_meta: record.robots_meta ?? null,
    og_title: record.og_title ?? null,
    og_description: record.og_description ?? null,
    og_image_url: record.og_image_url ?? null,
    twitter_title: record.twitter_title ?? null,
    twitter_description: record.twitter_description ?? null,
    twitter_image_url: record.twitter_image_url ?? null,
    twitter_card_type: record.twitter_card_type ?? null,
    readability_score: record.readability_score ?? null,
    content_ai_score: record.content_ai_score ?? null,
    internal_links_count: record.internal_links_count ?? null,
    external_links_count: record.external_links_count ?? null,
    images_count: record.images_count ?? null,
    images_alt_count: record.images_alt_count ?? null,
    primary_category_id: record.primary_category_id ?? null,
    schema_article_type: record.schema_article_type ?? null,
    schema_config: record.schema_config ?? null,
    last_seo_analysis_at: record.last_seo_analysis_at ?? null,
  }
}

export const postService = {
  // Get all posts for a site
  async getPostsBySite(siteId: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('site_id', siteId)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts:', error)
      throw new Error(`Failed to fetch posts: ${error.message}`)
    }

    return (data || []).map(record => transformPostRecord(record))
  },

  // Get single post by ID
  async getPostById(postId: string): Promise<Post | null> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (error) {
      console.error('Error fetching post:', error)
      return null
    }

    return transformPostRecord(data)
  },

  // Sync posts from WordPress
  async syncPostsFromWordPress(
    siteId: string,
    wpUrl: string,
    wpUsername: string,
    wpAppPassword: string
  ): Promise<{ success: boolean; postsSynced: number; message: string }> {
    try {
      // Create WordPress client
      const wpClient = createWordPressClient({
        url: wpUrl,
        username: wpUsername,
        appPassword: wpAppPassword,
      })

      // Fetch posts from WordPress
      const wpPosts = await wpClient.getPosts({ per_page: 100, status: 'any' })

      let syncedCount = 0

      // Upsert each post to database
      for (const wpPost of wpPosts) {
        // Extract Rank Math data
        const rankMathData = wpClient.extractRankMathData(wpPost)

        // Count words in content
        const wordCount = wpPost.content?.rendered
          ? wpPost.content.rendered.replace(/<[^>]*>/g, '').split(/\s+/).length
          : 0

        // Prepare post data
        const postData = {
          site_id: siteId,
          wp_post_id: wpPost.id,
          title: wpPost.title?.rendered || 'Untitled',
          slug: wpPost.slug,
          url: wpPost.link,
          status: wpPost.status,
          content: wpPost.content?.rendered || null,
          seo_score: rankMathData.seo_score,
          focus_keyword: rankMathData.focus_keyword,
          seo_title: rankMathData.seo_title,
          seo_description: rankMathData.seo_description,
          is_indexable: true,
          schema_type: null,
          word_count: wordCount,
          published_at: wpPost.date,
          synced_at: new Date().toISOString(),
        }

        // Check if post already exists
        const { data: existingPost } = await supabase
          .from('posts')
          .select('id')
          .eq('site_id', siteId)
          .eq('wp_post_id', wpPost.id)
          .single()

        if (existingPost) {
          // Update existing post
          const { error } = await supabase
            .from('posts')
            .update(postData)
            .eq('id', existingPost.id)

          if (error) {
            console.error('Error updating post:', error)
          } else {
            syncedCount++
          }
        } else {
          // Insert new post
          const { error } = await supabase
            .from('posts')
            .insert(postData)

          if (error) {
            console.error('Error inserting post:', error)
          } else {
            syncedCount++
          }
        }
      }

      return {
        success: true,
        postsSynced: syncedCount,
        message: `Successfully synced ${syncedCount} posts from WordPress`,
      }
    } catch (error) {
      console.error('Error syncing posts:', error)
      return {
        success: false,
        postsSynced: 0,
        message: error instanceof Error ? error.message : 'Failed to sync posts',
      }
    }
  },

  // Create new post
  async createPost(post: {
    site_id: string
    title: string
    content: string
    status?: 'draft' | 'publish' | 'pending' | 'private'
    seo_title?: string
    seo_description?: string
    focus_keyword?: string
  }): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        site_id: post.site_id,
        title: post.title,
        content: post.content,
        status: post.status || 'draft',
        seo_title: post.seo_title,
        seo_description: post.seo_description,
        focus_keyword: post.focus_keyword,
        is_indexable: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating post:', error)
      throw new Error(`Failed to create post: ${error.message}`)
    }

    return transformPostRecord(data)
  },

  // Update post
  async updatePost(postId: string, updates: Partial<PostRecord>): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single()

    if (error) {
      console.error('Error updating post:', error)
      throw new Error(`Failed to update post: ${error.message}`)
    }

    return transformPostRecord(data)
  },

  // Delete post
  async deletePost(postId: string): Promise<void> {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (error) {
      console.error('Error deleting post:', error)
      throw new Error(`Failed to delete post: ${error.message}`)
    }
  },

  // Publish post to WordPress
  async publishToWordPress(
    postId: string,
    wpUrl: string,
    wpUsername: string,
    wpAppPassword: string
  ): Promise<{ success: boolean; wpPostId?: number; wpUrl?: string; message: string }> {
    try {
      // Get post from database
      const post = await this.getPostById(postId)

      if (!post) {
        return {
          success: false,
          message: 'Post not found',
        }
      }

      // Create WordPress client
      const wpClient = createWordPressClient({
        url: wpUrl,
        username: wpUsername,
        appPassword: wpAppPassword,
      })

      // Publish to WordPress
      const wpPost = await wpClient.createPost({
        title: post.seo_title || post.title,
        content: post.content || '',
        status: 'publish',
        excerpt: post.seo_description || undefined,
        meta: {
          rank_math_focus_keyword: post.focus_keyword,
          rank_math_title: post.seo_title,
          rank_math_description: post.seo_description,
        },
      })

      // Update post with WordPress ID
      await this.updatePost(postId, {
        wp_post_id: wpPost.id,
        url: wpPost.link,
        status: 'publish',
        published_at: new Date().toISOString(),
      })

      return {
        success: true,
        wpPostId: wpPost.id,
        wpUrl: wpPost.link,
        message: `Successfully published to WordPress`,
      }
    } catch (error) {
      console.error('Error publishing to WordPress:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to publish to WordPress',
      }
    }
  },
}
