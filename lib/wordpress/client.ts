/**
 * WordPress REST API Client
 * Supports WordPress REST API v2 with Application Password authentication
 */

interface WordPressConfig {
  url: string
  username: string
  appPassword: string
}

interface WordPressPost {
  id: number
  date: string
  modified: string
  slug: string
  status: 'publish' | 'draft' | 'pending' | 'private'
  type: string
  link: string
  title: {
    rendered: string
  }
  content: {
    rendered: string
  }
  excerpt: {
    rendered: string
  }
  author: number
  featured_media: number
  categories: number[]
  tags: number[]
  meta: Record<string, any>
  _embedded?: {
    'wp:term'?: any[]
    author?: any[]
  }
}

/**
 * SEO OS Connector Settings
 * Configures how the WordPress plugin renders SEO tags.
 */
export interface SEOOSConnectorSettings {
  seo_renderer: 'seo-os' | 'rankmath'
  render_schema: boolean
  render_og: boolean
  render_twitter: boolean
  schema_default_type: 'Article' | 'NewsArticle' | 'BlogPosting' | 'TechArticle' | 'HowTo'
  separator: string // e.g. '—', '-', '|'
}

/**
 * Rank Math SEO Metadata Interface
 * Complete set of Rank Math fields for comprehensive SEO management
 */
export interface RankMathData {
  // Basic SEO (4 fields - already implemented)
  seo_score: number | null
  focus_keyword: string | null
  seo_title: string | null
  seo_description: string | null

  // Additional Keywords (NEW)
  additional_keywords: string[]

  // Advanced SEO (NEW)
  canonical_url: string | null
  robots_meta: string // index,follow | index,nofollow | noindex,follow | noindex,nofollow

  // Social Media - Open Graph / Facebook (NEW)
  og_title: string | null
  og_description: string | null
  og_image_url: string | null

  // Social Media - Twitter Card (NEW)
  twitter_title: string | null
  twitter_description: string | null
  twitter_image_url: string | null
  twitter_card_type: string // summary | summary_large_image | app | player

  // Content Analysis Metrics (NEW)
  readability_score: number | null // 0-100 (Flesch Reading Ease)
  content_ai_score: number | null // 0-100 (Rank Math Content AI)
  internal_links_count: number
  external_links_count: number

  // Schema Markup (NEW)
  primary_category_id: number | null
  schema_article_type: string // Article | NewsArticle | BlogPosting
  schema_config: any | null // Complex schema configurations (FAQ, HowTo, Review, etc.)
}

export class WordPressClient {
  private baseUrl: string
  private connectorUrl: string // SEO OS Connector plugin endpoints
  private auth: string

  constructor(config: WordPressConfig) {
    // Normalize URL: strip protocol if present, then add https://
    let url = config.url.replace(/^(https?:\/\/)+/, '').replace(/\/$/, '')
    this.baseUrl = `https://${url}/wp-json/wp/v2`
    this.connectorUrl = `https://${url}/wp-json/seo-os/v1`

    // Basic Auth with Application Password
    this.auth = 'Basic ' + btoa(`${config.username}:${config.appPassword}`)
  }

  /**
   * Test WordPress connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/users/me`, {
        headers: {
          'Authorization': this.auth,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            message: 'Invalid credentials. Check username and application password.',
          }
        }
        return {
          success: false,
          message: `Connection failed: ${response.statusText}`,
        }
      }

      const user = await response.json()
      return {
        success: true,
        message: `Connected as ${user.name} (${user.email})`,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      }
    }
  }

  /**
   * Get all posts from WordPress
   */
  async getPosts(params?: {
    per_page?: number
    page?: number
    status?: string
  }): Promise<WordPressPost[]> {
    const searchParams = new URLSearchParams({
      per_page: (params?.per_page || 100).toString(),
      page: (params?.page || 1).toString(),
      _embed: 'true', // Include embedded data
      ...(params?.status && { status: params.status }),
    })

    const response = await fetch(`${this.baseUrl}/posts?${searchParams}`, {
      headers: {
        'Authorization': this.auth,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get single post by ID
   */
  async getPost(postId: number): Promise<WordPressPost> {
    const response = await fetch(`${this.baseUrl}/posts/${postId}?_embed=true`, {
      headers: {
        'Authorization': this.auth,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch post: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Create new post
   */
  async createPost(post: {
    title: string
    content: string
    status?: 'publish' | 'draft' | 'pending'
    excerpt?: string
    categories?: number[]
    tags?: number[]
    meta?: Record<string, any>
  }): Promise<WordPressPost> {
    const response = await fetch(`${this.baseUrl}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: post.title,
        content: post.content,
        status: post.status || 'draft',
        excerpt: post.excerpt,
        categories: post.categories,
        tags: post.tags,
        meta: post.meta,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create post')
    }

    return response.json()
  }

  /**
   * Update existing post
   */
  async updatePost(
    postId: number,
    updates: Partial<{
      title: string
      content: string
      status: 'publish' | 'draft' | 'pending'
      excerpt: string
      categories: number[]
      tags: number[]
      meta: Record<string, any>
    }>
  ): Promise<WordPressPost> {
    const response = await fetch(`${this.baseUrl}/posts/${postId}`, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update post')
    }

    return response.json()
  }

  /**
   * Delete post
   */
  async deletePost(postId: number, force = false): Promise<void> {
    const response = await fetch(`${this.baseUrl}/posts/${postId}?force=${force}`, {
      method: 'DELETE',
      headers: {
        'Authorization': this.auth,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to delete post: ${response.statusText}`)
    }
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<Array<{ id: number; name: string; slug: string; count: number }>> {
    const response = await fetch(`${this.baseUrl}/categories?per_page=100`, {
      headers: {
        'Authorization': this.auth,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get all tags
   */
  async getTags(): Promise<Array<{ id: number; name: string; slug: string; count: number }>> {
    const response = await fetch(`${this.baseUrl}/tags?per_page=100`, {
      headers: {
        'Authorization': this.auth,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch tags: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Create a new category
   */
  async createCategory(name: string, slug?: string): Promise<{ id: number; name: string; slug: string; count: number }> {
    const response = await fetch(`${this.baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, slug: slug || undefined }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create category')
    }

    return response.json()
  }

  /**
   * Create a new tag
   */
  async createTag(name: string, slug?: string): Promise<{ id: number; name: string; slug: string; count: number }> {
    const response = await fetch(`${this.baseUrl}/tags`, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, slug: slug || undefined }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create tag')
    }

    return response.json()
  }

  /**
   * Update a category
   */
  async updateCategory(id: number, data: { name?: string; slug?: string }): Promise<{ id: number; name: string; slug: string; count: number }> {
    const response = await fetch(`${this.baseUrl}/categories/${id}`, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update category')
    }

    return response.json()
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/categories/${id}?force=true`, {
      method: 'DELETE',
      headers: { 'Authorization': this.auth },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to delete category')
    }
  }

  /**
   * Update a tag
   */
  async updateTag(id: number, data: { name?: string; slug?: string }): Promise<{ id: number; name: string; slug: string; count: number }> {
    const response = await fetch(`${this.baseUrl}/tags/${id}`, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update tag')
    }

    return response.json()
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/tags/${id}?force=true`, {
      method: 'DELETE',
      headers: { 'Authorization': this.auth },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to delete tag')
    }
  }

  /**
   * Extract Rank Math SEO data from post meta
   * Extracts ALL Rank Math fields (25+ fields) for comprehensive SEO management
   */
  extractRankMathData(post: WordPressPost): RankMathData {
    const meta = post.meta || {}

    return {
      // Basic SEO fields
      seo_score: meta.rank_math_seo_score ? parseInt(meta.rank_math_seo_score) : null,
      focus_keyword: meta.rank_math_focus_keyword || null,
      seo_title: meta.rank_math_title || null,
      seo_description: meta.rank_math_description || null,

      // Additional focus keywords
      additional_keywords: meta.rank_math_focus_keywords
        ? meta.rank_math_focus_keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
        : [],

      // Advanced SEO
      canonical_url: meta.rank_math_canonical_url || null,
      robots_meta: meta.rank_math_robots || 'index,follow',

      // Social Media - Open Graph (Facebook)
      og_title: meta.rank_math_facebook_title || null,
      og_description: meta.rank_math_facebook_description || null,
      og_image_url: meta.rank_math_facebook_image || null,

      // Social Media - Twitter Card
      twitter_title: meta.rank_math_twitter_title || null,
      twitter_description: meta.rank_math_twitter_description || null,
      twitter_image_url: meta.rank_math_twitter_image || null,
      twitter_card_type: meta.rank_math_twitter_card_type || 'summary_large_image',

      // Content Analysis Metrics
      readability_score: meta.rank_math_readability_score
        ? parseInt(meta.rank_math_readability_score)
        : null,
      content_ai_score: meta.rank_math_content_ai_score
        ? parseInt(meta.rank_math_content_ai_score)
        : null,
      internal_links_count: meta.rank_math_internal_links
        ? parseInt(meta.rank_math_internal_links)
        : 0,
      external_links_count: meta.rank_math_external_links
        ? parseInt(meta.rank_math_external_links)
        : 0,

      // Schema Markup
      primary_category_id: meta.rank_math_primary_category
        ? parseInt(meta.rank_math_primary_category)
        : null,
      schema_article_type: meta.rank_math_schema_article_type || 'Article',
      schema_config: meta.rank_math_schemas
        ? this.safeJSONParse(meta.rank_math_schemas)
        : null,
    }
  }

  /**
   * Create post with full Rank Math metadata
   * Publishes article to WordPress with ALL SEO fields populated
   */
  async createPostWithRankMath(params: {
    title: string
    content: string
    status: 'publish' | 'draft' | 'pending'
    categories?: number[]
    tags?: number[]
    rankMath: Partial<RankMathData>
  }): Promise<WordPressPost> {
    const { title, content, status, categories, tags, rankMath } = params

    const requestBody = {
      title,
      content,
      status,
      categories: categories || [],
      tags: tags || [],
      excerpt: rankMath.seo_description || '',
      meta: {
        // Basic SEO
        rank_math_focus_keyword: rankMath.focus_keyword || '',
        rank_math_focus_keywords: rankMath.additional_keywords?.join(', ') || '',
        rank_math_title: rankMath.seo_title || title,
        rank_math_description: rankMath.seo_description || '',

        // Advanced SEO
        rank_math_canonical_url: rankMath.canonical_url || '',
        rank_math_robots: rankMath.robots_meta || 'index,follow',

        // Social Media - Open Graph
        rank_math_facebook_title: rankMath.og_title || rankMath.seo_title || title,
        rank_math_facebook_description: rankMath.og_description || rankMath.seo_description || '',
        rank_math_facebook_image: rankMath.og_image_url || '',

        // Social Media - Twitter Card
        rank_math_twitter_title: rankMath.twitter_title || rankMath.seo_title || title,
        rank_math_twitter_description: rankMath.twitter_description || rankMath.seo_description || '',
        rank_math_twitter_image: rankMath.twitter_image_url || '',
        rank_math_twitter_card_type: rankMath.twitter_card_type || 'summary_large_image',

        // Primary Category (integer — only include when set)
        ...(rankMath.primary_category_id ? { rank_math_primary_category: Number(rankMath.primary_category_id) } : {}),
        // Note: rank_math_schema_* keys are managed by Rank Math internally — do NOT write them
      },
    }

    const response = await fetch(`${this.baseUrl}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create post with Rank Math metadata')
    }

    return response.json()
  }

  /**
   * Update post with full Rank Math metadata
   */
  async updatePostWithRankMath(
    postId: number,
    params: {
      title?: string
      content?: string
      status?: 'publish' | 'draft' | 'pending'
      categories?: number[]
      tags?: number[]
      rankMath?: Partial<RankMathData>
    }
  ): Promise<WordPressPost> {
    const { title, content, status, categories, tags, rankMath } = params

    const updates: any = {}

    if (title) updates.title = title
    if (content) updates.content = content
    if (status) updates.status = status
    if (categories) updates.categories = categories
    if (tags) updates.tags = tags
    if (rankMath?.seo_description) updates.excerpt = rankMath.seo_description

    if (rankMath) {
      updates.meta = {
        // Basic SEO
        rank_math_focus_keyword: rankMath.focus_keyword || '',
        rank_math_focus_keywords: rankMath.additional_keywords?.join(', ') || '',
        rank_math_title: rankMath.seo_title || title || '',
        rank_math_description: rankMath.seo_description || '',

        // Advanced SEO
        rank_math_canonical_url: rankMath.canonical_url || '',
        rank_math_robots: rankMath.robots_meta || 'index,follow',

        // Social Media - Open Graph
        rank_math_facebook_title: rankMath.og_title || rankMath.seo_title || title || '',
        rank_math_facebook_description: rankMath.og_description || rankMath.seo_description || '',
        rank_math_facebook_image: rankMath.og_image_url || '',

        // Social Media - Twitter Card
        rank_math_twitter_title: rankMath.twitter_title || rankMath.seo_title || title || '',
        rank_math_twitter_description: rankMath.twitter_description || rankMath.seo_description || '',
        rank_math_twitter_image: rankMath.twitter_image_url || '',
        rank_math_twitter_card_type: rankMath.twitter_card_type || 'summary_large_image',

        // Primary Category (integer — only include when set)
        ...(rankMath.primary_category_id ? { rank_math_primary_category: Number(rankMath.primary_category_id) } : {}),
        // Note: rank_math_schema_* keys are managed by Rank Math internally — do NOT write them
      }
    }

    const response = await fetch(`${this.baseUrl}/posts/${postId}`, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update post with Rank Math metadata')
    }

    return response.json()
  }

  // ===== SEO OS Connector Plugin Methods =====
  // These use the custom /seo-os/v1 endpoints from our WordPress plugin
  // for richer Rank Math data than the standard WP REST API provides.

  /**
   * Ping connector plugin to check if it's installed and active
   * Returns plugin version and site info
   */
  async pingConnector(): Promise<{
    success: boolean
    version?: string
    seo_renderer?: 'seo-os' | 'rankmath'
    rank_math?: boolean
    message: string
  }> {
    try {
      const response = await fetch(`${this.connectorUrl}/ping`, {
        headers: { 'Authorization': this.auth },
      })

      if (!response.ok) {
        return {
          success: false,
          message: response.status === 404
            ? 'SEO OS Connector plugin not installed'
            : `Connector error: ${response.statusText}`,
        }
      }

      const data = await response.json()
      return {
        success: true,
        version: data.version,
        seo_renderer: data.seo_renderer,
        rank_math: data.rank_math,
        message: `Connector v${data.version} active (${data.seo_renderer === 'seo-os' ? 'SEO OS' : 'Rank Math'} mode)`,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reach connector',
      }
    }
  }

  /**
   * Get connector plugin info (Rank Math status, site details)
   * Note: API returns rank_math as nested object { active, version }
   */
  async getConnectorInfo(): Promise<{
    site_name: string
    site_url: string
    wordpress_version: string
    rank_math_active: boolean
    rank_math_version: string | null
    plugin_version: string
    php_version: string
    seo_renderer: 'seo-os' | 'rankmath'
    render_schema: boolean
    render_og: boolean
    render_twitter: boolean
    total_posts: number
    total_drafts: number
  } | null> {
    try {
      const response = await fetch(`${this.connectorUrl}/info`, {
        headers: { 'Authorization': this.auth },
      })

      if (!response.ok) return null
      const data = await response.json()

      // Flatten the nested rank_math object for easier consumption
      return {
        site_name: data.site_name,
        site_url: data.site_url,
        wordpress_version: data.wordpress_version,
        rank_math_active: data.rank_math?.active ?? false,
        rank_math_version: data.rank_math?.version ?? null,
        plugin_version: data.connector_version,
        php_version: data.php_version,
        seo_renderer: data.seo_renderer ?? 'rankmath',
        render_schema: data.render_schema ?? true,
        render_og: data.render_og ?? true,
        render_twitter: data.render_twitter ?? true,
        total_posts: data.total_posts ?? 0,
        total_drafts: data.total_drafts ?? 0,
      }
    } catch {
      return null
    }
  }

  /**
   * Get posts list with SEO data via connector (richer than standard WP API)
   * Returns posts with all Rank Math meta, content analysis, images info
   */
  async getPostsWithSEO(params?: {
    per_page?: number
    page?: number
    status?: string
    orderby?: string
    order?: 'asc' | 'desc'
  }): Promise<{
    posts: Array<{
      id: number
      title: string
      slug: string
      url: string
      status: string
      date: string
      modified: string
      content: string
      excerpt: string
      word_count: number
      categories: Array<{ id: number; name: string; slug: string }>
      tags: Array<{ id: number; name: string; slug: string }>
      featured_image: string | null
      seo: Record<string, any>
      content_analysis: {
        internal_links: number
        external_links: number
        images_total: number
        images_with_alt: number
      }
    }>
    total: number
    pages: number
  }> {
    const searchParams = new URLSearchParams({
      per_page: (params?.per_page || 100).toString(),
      page: (params?.page || 1).toString(),
    })
    if (params?.status) searchParams.set('status', params.status)
    if (params?.orderby) searchParams.set('orderby', params.orderby)
    if (params?.order) searchParams.set('order', params.order)

    const response = await fetch(`${this.connectorUrl}/posts?${searchParams}`, {
      headers: { 'Authorization': this.auth },
    })

    if (!response.ok) {
      throw new Error(`Connector: Failed to fetch posts: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get all Rank Math meta fields for a specific post via connector
   * Returns much richer data than extractRankMathData() from standard API
   *
   * Note: Connector PHP strips 'rank_math_' prefix from keys.
   * So response has: seo_score, focus_keyword, title, description, etc.
   */
  async getPostSEOMeta(wpPostId: number): Promise<RankMathData & {
    images_count?: number
    images_alt_count?: number
  }> {
    const response = await fetch(`${this.connectorUrl}/posts/${wpPostId}/meta`, {
      headers: { 'Authorization': this.auth },
    })

    if (!response.ok) {
      throw new Error(`Connector: Failed to fetch SEO meta for post ${wpPostId}: ${response.statusText}`)
    }

    const data = await response.json()
    // Connector PHP strips rank_math_ prefix: keys are seo_score, title, description, etc.
    const meta = data.meta || {}

    return {
      seo_score: meta.seo_score != null ? Number(meta.seo_score) : null,
      focus_keyword: meta.focus_keyword || null,
      seo_title: meta.title || null,
      seo_description: meta.description || null,

      additional_keywords: meta.additional_keywords || (meta.focus_keywords
        ? String(meta.focus_keywords).split(',').map((k: string) => k.trim()).filter(Boolean)
        : []),

      canonical_url: meta.canonical_url || null,
      robots_meta: meta.robots || 'index,follow',

      og_title: meta.facebook_title || null,
      og_description: meta.facebook_description || null,
      og_image_url: meta.facebook_image || null,

      twitter_title: meta.twitter_title || null,
      twitter_description: meta.twitter_description || null,
      twitter_image_url: meta.twitter_image || null,
      twitter_card_type: meta.twitter_card_type || 'summary_large_image',

      readability_score: meta.readability_score != null ? Number(meta.readability_score) : null,
      content_ai_score: meta.contentai_score != null ? Number(meta.contentai_score) : null,
      internal_links_count: meta.internal_links_count || 0,
      external_links_count: meta.external_links_count || 0,

      images_count: meta.images_count || 0,
      images_alt_count: meta.images_alt_count || 0,

      primary_category_id: meta.primary_category != null ? Number(meta.primary_category) : null,
      schema_article_type: meta.schema_article_type || 'Article',
      schema_config: meta.schemas
        ? this.safeJSONParse(String(meta.schemas))
        : null,
    }
  }

  /**
   * Update Rank Math meta fields for a post via connector
   * Accepts fields with or without rank_math_ prefix
   */
  async updatePostSEOMeta(
    wpPostId: number,
    meta: Partial<Record<string, any>>
  ): Promise<{ success: boolean; updated: string[] }> {
    const response = await fetch(`${this.connectorUrl}/posts/${wpPostId}/meta`, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ meta }),
    })

    if (!response.ok) {
      throw new Error(`Connector: Failed to update SEO meta for post ${wpPostId}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get SEO score and detailed analysis from Rank Math via connector
   * Optionally triggers re-analysis with recalculate=true
   */
  async getPostScore(wpPostId: number, recalculate = false): Promise<{
    seo_score: number | null
    readability_score: number | null
    focus_keyword: string | null
    analysis: Record<string, any> | null
    content_analysis: {
      internal_links: number
      external_links: number
      images_total: number
      images_with_alt: number
    }
  }> {
    const url = recalculate
      ? `${this.connectorUrl}/posts/${wpPostId}/score?recalculate=1`
      : `${this.connectorUrl}/posts/${wpPostId}/score`

    const response = await fetch(url, {
      headers: { 'Authorization': this.auth },
    })

    if (!response.ok) {
      throw new Error(`Connector: Failed to get score for post ${wpPostId}: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get rendered SEO head tags for a post via connector
   * Returns structured head data (title, meta, OG, Twitter, Schema)
   */
  async getPostHeadTags(wpPostId: number): Promise<{
    post_id: number
    renderer: string
    title: string | null
    meta: {
      description: string | null
      robots: string
      canonical: string
    }
    og: {
      title: string
      description: string
      image: string | null
      url: string
      type: string
      site_name: string
    }
    twitter: {
      card: string
      title: string
      description: string
      image: string | null
    }
    schema: string | null
  }> {
    const response = await fetch(`${this.connectorUrl}/posts/${wpPostId}/head`, {
      headers: { 'Authorization': this.auth },
    })

    if (!response.ok) {
      throw new Error(`Connector: Failed to get head tags for post ${wpPostId}: ${response.statusText}`)
    }

    const data = await response.json()
    return data.head || data
  }

  /**
   * Get connector settings (renderer mode, OG/Twitter/Schema toggles)
   */
  async getConnectorSettings(): Promise<SEOOSConnectorSettings> {
    const response = await fetch(`${this.connectorUrl}/settings`, {
      headers: { 'Authorization': this.auth },
    })

    if (!response.ok) {
      throw new Error(`Connector: Failed to get settings: ${response.statusText}`)
    }

    const data = await response.json()
    return data.settings
  }

  /**
   * Update connector settings (requires admin permissions on WP side)
   */
  async updateConnectorSettings(
    settings: Partial<SEOOSConnectorSettings>
  ): Promise<SEOOSConnectorSettings> {
    const response = await fetch(`${this.connectorUrl}/settings`, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    })

    if (!response.ok) {
      throw new Error(`Connector: Failed to update settings: ${response.statusText}`)
    }

    const data = await response.json()
    return data.settings
  }

  /**
   * Get revisions for a post from WordPress
   * WordPress stores full revision history for each post
   */
  async getRevisions(postId: number): Promise<Array<{
    id: number
    author: number
    date: string
    title: { rendered: string }
    content: { rendered: string }
    excerpt: { rendered: string }
    modified: string
  }>> {
    const response = await fetch(`${this.baseUrl}/posts/${postId}/revisions?per_page=50`, {
      headers: {
        'Authorization': this.auth,
      },
    })

    if (!response.ok) {
      // Some hosts disable revisions or user may lack permissions
      if (response.status === 403 || response.status === 401) {
        return []
      }
      throw new Error(`Failed to fetch revisions: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Upload an image to WordPress Media Library
   */
  async uploadMedia(params: {
    imageBuffer: Buffer
    filename: string
    mimeType: string
    altText?: string
    caption?: string
    title?: string
  }): Promise<{ id: number; source_url: string; media_details: any }> {
    const { imageBuffer, filename, mimeType, altText, caption, title } = params

    const uploadResponse = await fetch(`${this.baseUrl}/media`, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      body: new Uint8Array(imageBuffer),
    })

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json().catch(() => ({}))
      throw new Error(error.message || `Failed to upload media: ${uploadResponse.statusText}`)
    }

    const media = await uploadResponse.json()

    if (altText || caption || title) {
      await fetch(`${this.baseUrl}/media/${media.id}`, {
        method: 'POST',
        headers: {
          'Authorization': this.auth,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alt_text: altText || '',
          caption: caption || '',
          title: title || media.title?.raw || filename,
        }),
      })
    }

    return {
      id: media.id,
      source_url: media.source_url,
      media_details: media.media_details,
    }
  }

  /**
   * Set a media item as the featured image of a post
   */
  async setFeaturedImage(postId: number, mediaId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/posts/${postId}`, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ featured_media: mediaId }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to set featured image: ${response.statusText}`)
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Redirect Management
  // ═══════════════════════════════════════════════════════════

  /**
   * Sync redirect rules to WordPress plugin cache.
   */
  async syncRedirects(redirects: {
    id: string
    source_path: string
    target_url: string
    type: string
    is_regex: boolean
    enabled: boolean
    auto_generated: boolean
    note: string
  }[]): Promise<void> {
    const response = await fetch(`${this.connectorUrl}/redirects/sync`, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ redirects }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to sync redirects: ${response.statusText}`)
    }
  }

  /**
   * Get cached redirect rules from WordPress.
   */
  async getRedirectCache(): Promise<any[]> {
    const response = await fetch(`${this.connectorUrl}/redirects`, {
      headers: { 'Authorization': this.auth },
    })
    if (!response.ok) throw new Error(`Failed to get redirects: ${response.statusText}`)
    const data = await response.json()
    return data.redirects || []
  }

  /**
   * Test a URL against redirect rules on WordPress.
   */
  async testRedirect(url: string): Promise<{ match: boolean; target?: string; type?: string }> {
    const response = await fetch(`${this.connectorUrl}/redirects/test`, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    })
    if (!response.ok) throw new Error(`Failed to test redirect: ${response.statusText}`)
    return await response.json()
  }

  /**
   * Validate a redirect before creation — checks conflicts, loops, target status.
   */
  async validateRedirect(source_path: string, target_url: string): Promise<{
    safe: boolean
    errors: { type: string; message: string }[]
    warnings: { type: string; message: string; plugin?: string }[]
  }> {
    const response = await fetch(`${this.connectorUrl}/redirects/validate`, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source_path, target_url }),
    })
    if (!response.ok) throw new Error(`Failed to validate redirect: ${response.statusText}`)
    return await response.json()
  }

  /**
   * Get 404 error log from WordPress.
   */
  async get404Log(): Promise<any[]> {
    const response = await fetch(`${this.connectorUrl}/redirects/404-log`, {
      headers: { 'Authorization': this.auth },
    })
    if (!response.ok) throw new Error(`Failed to get 404 log: ${response.statusText}`)
    const data = await response.json()
    return data.entries || []
  }

  /**
   * Clear 404 error buffer on WordPress.
   */
  async clear404Log(): Promise<void> {
    const response = await fetch(`${this.connectorUrl}/redirects/404-log`, {
      method: 'DELETE',
      headers: { 'Authorization': this.auth },
    })
    if (!response.ok) throw new Error(`Failed to clear 404 log: ${response.statusText}`)
  }

  /**
   * Get slug change log from WordPress.
   */
  async getSlugChanges(): Promise<any[]> {
    const response = await fetch(`${this.connectorUrl}/redirects/slug-changes`, {
      headers: { 'Authorization': this.auth },
    })
    if (!response.ok) throw new Error(`Failed to get slug changes: ${response.statusText}`)
    const data = await response.json()
    return data.changes || []
  }

  /**
   * Clear slug change log after processing.
   */
  async clearSlugChanges(): Promise<void> {
    const response = await fetch(`${this.connectorUrl}/redirects/slug-changes`, {
      method: 'DELETE',
      headers: { 'Authorization': this.auth },
    })
    if (!response.ok) throw new Error(`Failed to clear slug changes: ${response.statusText}`)
  }

  /**
   * Safely parse JSON string, return null if invalid
   */
  private safeJSONParse(str: string): any {
    try {
      return JSON.parse(str)
    } catch {
      return null
    }
  }
}

/**
 * Create WordPress client instance
 */
export function createWordPressClient(config: WordPressConfig): WordPressClient {
  return new WordPressClient(config)
}
