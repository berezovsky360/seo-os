// WordPress Platform Adapter
// Thin facade over the existing WordPressClient, mapping to the PlatformAdapter interface.

import { WordPressClient } from '@/lib/wordpress/client'
import type {
  PlatformAdapter,
  PlatformPost,
  PlatformCategory,
  PlatformTag,
  PlatformSEO,
  PlatformCredentials,
  PlatformCapabilities,
} from './types'

export class WordPressAdapter implements PlatformAdapter {
  id = 'wordpress' as const
  name = 'WordPress'
  icon = 'Globe'

  capabilities: PlatformCapabilities = {
    hasCategories: true,
    hasTags: true,
    hasSEO: true,
    hasRevisions: true,
    hasMediaLibrary: true,
    hasCustomFields: true,
  }

  private client: WordPressClient | null = null

  async connect(credentials: PlatformCredentials): Promise<{ success: boolean; message: string }> {
    const { url, username, app_password } = credentials
    if (!url || !username || !app_password) {
      return { success: false, message: 'Missing credentials: url, username, app_password required' }
    }

    this.client = new WordPressClient({
      url,
      username,
      appPassword: app_password,
    })

    return this.client.testConnection()
  }

  private ensureConnected(): WordPressClient {
    if (!this.client) throw new Error('WordPress adapter not connected. Call connect() first.')
    return this.client
  }

  async getPosts(options?: {
    page?: number
    per_page?: number
    status?: string
    search?: string
  }): Promise<{ posts: PlatformPost[]; total: number }> {
    const client = this.ensureConnected()
    const wpPosts = await client.getPosts({
      page: options?.page,
      per_page: options?.per_page,
      status: options?.status,
    })

    const posts: PlatformPost[] = wpPosts.map((wp: any) => ({
      id: wp.id,
      title: wp.title?.rendered || wp.title || '',
      slug: wp.slug || null,
      url: wp.link || null,
      status: wp.status || 'draft',
      content: wp.content?.rendered || wp.content || null,
      excerpt: wp.excerpt?.rendered || wp.excerpt || null,
      published_at: wp.date || null,
      modified_at: wp.modified || null,
      author: wp._embedded?.author?.[0]?.name || null,
      categories: (wp._embedded?.['wp:term']?.[0] || []).map((c: any) => ({ id: c.id, name: c.name })),
      tags: (wp._embedded?.['wp:term']?.[1] || []).map((t: any) => ({ id: t.id, name: t.name })),
      featured_image: null,
    }))

    return { posts, total: posts.length }
  }

  async createPost(data: {
    title: string
    content: string
    status?: string
    slug?: string
    categories?: (number | string)[]
    tags?: (number | string)[]
  }): Promise<PlatformPost> {
    const client = this.ensureConnected()
    const wp = await client.createPost({
      title: data.title,
      content: data.content,
      status: (data.status || 'draft') as any,
      categories: data.categories?.map(Number),
      tags: data.tags?.map(Number),
    })

    return {
      id: wp.id,
      title: wp.title?.rendered || data.title,
      slug: wp.slug || null,
      url: wp.link || null,
      status: wp.status || 'draft',
      content: wp.content?.rendered || data.content,
      excerpt: wp.excerpt?.rendered || null,
      published_at: wp.date || null,
      modified_at: wp.modified || null,
      author: null,
      categories: [],
      tags: [],
      featured_image: null,
    }
  }

  async updatePost(id: string | number, data: {
    title?: string
    content?: string
    status?: string
    slug?: string
    categories?: (number | string)[]
    tags?: (number | string)[]
  }): Promise<PlatformPost> {
    const client = this.ensureConnected()
    const wp = await client.updatePost(Number(id), {
      title: data.title,
      content: data.content,
      status: data.status as any,
      categories: data.categories?.map(Number),
      tags: data.tags?.map(Number),
    })

    return {
      id: wp.id,
      title: wp.title?.rendered || data.title || '',
      slug: wp.slug || null,
      url: wp.link || null,
      status: wp.status || 'draft',
      content: wp.content?.rendered || data.content || null,
      excerpt: wp.excerpt?.rendered || null,
      published_at: wp.date || null,
      modified_at: wp.modified || null,
      author: null,
      categories: [],
      tags: [],
      featured_image: null,
    }
  }

  async getCategories(): Promise<PlatformCategory[]> {
    const client = this.ensureConnected()
    const cats = await client.getCategories()
    return cats.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      count: c.count,
      parent_id: c.parent || null,
    }))
  }

  async getTags(): Promise<PlatformTag[]> {
    const client = this.ensureConnected()
    const tags = await client.getTags()
    return tags.map((t: any) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      count: t.count,
    }))
  }

  async getSEOData(postId: string | number): Promise<PlatformSEO> {
    const client = this.ensureConnected()
    const data = await client.getPostSEOMeta(Number(postId))
    return {
      seo_title: data.seo_title || null,
      seo_description: data.seo_description || null,
      focus_keyword: data.focus_keyword || null,
      seo_score: data.seo_score ?? null,
      canonical_url: data.canonical_url || null,
      og_title: data.og_title || null,
      og_description: data.og_description || null,
      og_image_url: data.og_image_url || null,
    }
  }

  async updateSEOData(postId: string | number, data: Partial<PlatformSEO>): Promise<void> {
    const client = this.ensureConnected()
    await client.updatePostSEOMeta(Number(postId), data as any)
  }
}
