import { supabase } from '@/lib/supabase/client'
import { createWordPressClient } from '@/lib/wordpress/client'

export interface ArticleRecord {
  id: string
  site_id: string
  keyword: string
  title: string | null
  seo_title: string | null
  seo_description: string | null
  content: string | null
  word_count: number | null
  status: string
  wp_post_id: number | null
  created_at: string
  published_at: string | null
  // Rank Math fields
  seo_score?: number | null
  preliminary_seo_score?: number | null
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
  schema_article_type?: string | null
  schema_config?: any | null
  last_analyzed_at?: string | null
  // Joined fields (from useAllArticles)
  sites?: { name: string; url: string; favicon?: string } | null
}

export const articleService = {
  // Get all articles from all sites
  async getAllArticles(): Promise<ArticleRecord[]> {
    const { data, error } = await supabase
      .from('generated_articles')
      .select('*, sites(name, url, favicon)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all articles:', error)
      throw new Error(`Failed to fetch articles: ${error.message}`)
    }

    return data || []
  },

  // Get all articles for a site
  async getArticlesBySite(siteId: string): Promise<ArticleRecord[]> {
    const { data, error } = await supabase
      .from('generated_articles')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching articles:', error)
      throw new Error(`Failed to fetch articles: ${error.message}`)
    }

    return data || []
  },

  // Get single article
  async getArticleById(articleId: string): Promise<ArticleRecord | null> {
    const { data, error } = await supabase
      .from('generated_articles')
      .select('*')
      .eq('id', articleId)
      .single()

    if (error) {
      console.error('Error fetching article:', error)
      return null
    }

    return data
  },

  // Create new article/post
  async createArticle(article: {
    site_id: string
    keyword?: string
    title?: string
    seo_title?: string
    seo_description?: string
    content?: string
    word_count?: number
  }): Promise<ArticleRecord> {
    const { data, error } = await supabase
      .from('generated_articles')
      .insert({
        site_id: article.site_id,
        keyword: article.keyword || '',
        title: article.title || 'Untitled Post',
        seo_title: article.seo_title,
        seo_description: article.seo_description,
        content: article.content,
        word_count: article.word_count,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating article:', error)
      throw new Error(`Failed to create article: ${error.message}`)
    }

    return data
  },

  // Update article
  async updateArticle(
    articleId: string,
    updates: Partial<ArticleRecord>
  ): Promise<ArticleRecord> {
    const { data, error } = await supabase
      .from('generated_articles')
      .update(updates)
      .eq('id', articleId)
      .select()
      .single()

    if (error) {
      console.error('Error updating article:', error)
      throw new Error(`Failed to update article: ${error.message}`)
    }

    return data
  },

  // Delete article
  async deleteArticle(articleId: string): Promise<void> {
    const { error } = await supabase
      .from('generated_articles')
      .delete()
      .eq('id', articleId)

    if (error) {
      console.error('Error deleting article:', error)
      throw new Error(`Failed to delete article: ${error.message}`)
    }
  },

  // Mark article as published (after WordPress publish)
  async markAsPublished(articleId: string, wpPostId: number): Promise<ArticleRecord> {
    return this.updateArticle(articleId, {
      status: 'published',
      wp_post_id: wpPostId,
      published_at: new Date().toISOString(),
    })
  },

  // Publish article to WordPress
  async publishToWordPress(
    articleId: string,
    wpUrl: string,
    wpUsername: string,
    wpAppPassword: string
  ): Promise<{ success: boolean; wpPostId?: number; wpUrl?: string; message: string }> {
    try {
      // Get article from database
      const article = await this.getArticleById(articleId)

      if (!article) {
        return {
          success: false,
          message: 'Article not found',
        }
      }

      if (!article.content || !article.title) {
        return {
          success: false,
          message: 'Article must have title and content before publishing',
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
        title: article.seo_title || article.title,
        content: article.content,
        status: 'publish',
        excerpt: article.seo_description || undefined,
        meta: {
          rank_math_focus_keyword: article.keyword,
          rank_math_title: article.seo_title || article.title,
          rank_math_description: article.seo_description || undefined,
        },
      })

      // Update article status to published
      await this.markAsPublished(articleId, wpPost.id)

      return {
        success: true,
        wpPostId: wpPost.id,
        wpUrl: wpPost.link,
        message: 'Successfully published to WordPress',
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
