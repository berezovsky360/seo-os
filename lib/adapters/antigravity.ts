// Antigravity Landing Engine — Platform Adapter
// Implements PlatformAdapter for the built-in static site builder.

import { createClient } from '@supabase/supabase-js'
import type {
  PlatformAdapter,
  PlatformPost,
  PlatformCategory,
  PlatformTag,
  PlatformSEO,
  PlatformCredentials,
  PlatformCapabilities,
} from './types'

export class AntigravityAdapter implements PlatformAdapter {
  id = 'antigravity' as const
  name = 'Antigravity Engine'
  icon = 'Rocket'

  private landingSiteId: string | null = null

  capabilities: PlatformCapabilities = {
    hasCategories: false,
    hasTags: true,
    hasSEO: true,
    hasRevisions: false,
    hasMediaLibrary: false,
    hasCustomFields: false,
  }

  private get supabase() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }

  async connect(credentials: PlatformCredentials): Promise<{ success: boolean; message: string }> {
    const siteId = credentials.landing_site_id
    if (!siteId) {
      return { success: false, message: 'landing_site_id is required' }
    }

    const { data, error } = await this.supabase
      .from('landing_sites')
      .select('id, name')
      .eq('id', siteId)
      .single()

    if (error || !data) {
      return { success: false, message: 'Landing site not found' }
    }

    this.landingSiteId = siteId
    return { success: true, message: `Connected to "${data.name}"` }
  }

  async getPosts(options?: {
    page?: number
    per_page?: number
    status?: string
    search?: string
  }): Promise<{ posts: PlatformPost[]; total: number }> {
    if (!this.landingSiteId) throw new Error('Not connected')

    let query = this.supabase
      .from('landing_pages')
      .select('*', { count: 'exact' })
      .eq('landing_site_id', this.landingSiteId)
      .order('published_at', { ascending: false })

    if (options?.status === 'publish') query = query.eq('is_published', true)
    if (options?.status === 'draft') query = query.eq('is_published', false)
    if (options?.search) query = query.ilike('title', `%${options.search}%`)

    const perPage = options?.per_page || 20
    const page = options?.page || 1
    query = query.range((page - 1) * perPage, page * perPage - 1)

    const { data, count, error } = await query
    if (error) throw new Error(error.message)

    const posts: PlatformPost[] = (data || []).map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      url: null,
      status: p.is_published ? 'publish' as const : 'draft' as const,
      content: p.content,
      excerpt: null,
      published_at: p.published_at,
      modified_at: p.modified_at,
      author: p.author_name,
      categories: p.category ? [{ id: p.category, name: p.category }] : [],
      tags: (p.tags || []).map((t: string) => ({ id: t, name: t })),
      featured_image: p.featured_image_url,
    }))

    return { posts, total: count || 0 }
  }

  async createPost(data: {
    title: string
    content: string
    status?: string
    slug?: string
    tags?: (number | string)[]
  }): Promise<PlatformPost> {
    if (!this.landingSiteId) throw new Error('Not connected')

    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const isPublished = data.status === 'publish'

    const wordCount = data.content ? data.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length : 0
    const readingTime = Math.max(1, Math.ceil(wordCount / 200))

    const { data: page, error } = await this.supabase
      .from('landing_pages')
      .insert({
        landing_site_id: this.landingSiteId,
        slug,
        title: data.title,
        content: data.content,
        page_type: 'post',
        tags: data.tags?.map(String) || null,
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
        word_count: wordCount,
        reading_time: readingTime,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return {
      id: page.id,
      title: page.title,
      slug: page.slug,
      url: null,
      status: page.is_published ? 'publish' : 'draft',
      content: page.content,
      excerpt: null,
      published_at: page.published_at,
      modified_at: page.modified_at,
      author: page.author_name,
      categories: [],
      tags: (page.tags || []).map((t: string) => ({ id: t, name: t })),
      featured_image: page.featured_image_url,
    }
  }

  async updatePost(id: string | number, data: {
    title?: string
    content?: string
    status?: string
    slug?: string
    tags?: (number | string)[]
  }): Promise<PlatformPost> {
    if (!this.landingSiteId) throw new Error('Not connected')

    const updates: Record<string, any> = { modified_at: new Date().toISOString() }
    if (data.title !== undefined) updates.title = data.title
    if (data.content !== undefined) {
      updates.content = data.content
      const wordCount = data.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
      updates.word_count = wordCount
      updates.reading_time = Math.max(1, Math.ceil(wordCount / 200))
    }
    if (data.slug !== undefined) updates.slug = data.slug
    if (data.tags !== undefined) updates.tags = data.tags.map(String)
    if (data.status !== undefined) {
      updates.is_published = data.status === 'publish'
      if (data.status === 'publish') updates.published_at = new Date().toISOString()
    }

    const { data: page, error } = await this.supabase
      .from('landing_pages')
      .update(updates)
      .eq('id', id)
      .eq('landing_site_id', this.landingSiteId)
      .select()
      .single()

    if (error) throw new Error(error.message)

    return {
      id: page.id,
      title: page.title,
      slug: page.slug,
      url: null,
      status: page.is_published ? 'publish' : 'draft',
      content: page.content,
      excerpt: null,
      published_at: page.published_at,
      modified_at: page.modified_at,
      author: page.author_name,
      categories: [],
      tags: (page.tags || []).map((t: string) => ({ id: t, name: t })),
      featured_image: page.featured_image_url,
    }
  }

  async getCategories(): Promise<PlatformCategory[]> {
    return []
  }

  async getTags(): Promise<PlatformTag[]> {
    if (!this.landingSiteId) throw new Error('Not connected')

    const { data } = await this.supabase
      .from('landing_pages')
      .select('tags')
      .eq('landing_site_id', this.landingSiteId)

    const tagCounts: Record<string, number> = {}
    for (const row of data || []) {
      for (const t of row.tags || []) {
        tagCounts[t] = (tagCounts[t] || 0) + 1
      }
    }

    return Object.entries(tagCounts).map(([name, count]) => ({
      id: name,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      count,
    }))
  }

  async getSEOData(postId: string | number): Promise<PlatformSEO> {
    if (!this.landingSiteId) throw new Error('Not connected')

    const { data, error } = await this.supabase
      .from('landing_pages')
      .select('seo_title, seo_description, og_image')
      .eq('id', postId)
      .eq('landing_site_id', this.landingSiteId)
      .single()

    if (error) throw new Error(error.message)

    return {
      seo_title: data.seo_title,
      seo_description: data.seo_description,
      focus_keyword: null,
      seo_score: null,
      canonical_url: null,
      og_title: data.seo_title,
      og_description: data.seo_description,
      og_image_url: data.og_image,
    }
  }

  async updateSEOData(postId: string | number, seo: Partial<PlatformSEO>): Promise<void> {
    if (!this.landingSiteId) throw new Error('Not connected')

    const updates: Record<string, any> = { modified_at: new Date().toISOString() }
    if (seo.seo_title !== undefined) updates.seo_title = seo.seo_title
    if (seo.seo_description !== undefined) updates.seo_description = seo.seo_description
    if (seo.og_image_url !== undefined) updates.og_image = seo.og_image_url

    const { error } = await this.supabase
      .from('landing_pages')
      .update(updates)
      .eq('id', postId)
      .eq('landing_site_id', this.landingSiteId)

    if (error) throw new Error(error.message)
  }
}
