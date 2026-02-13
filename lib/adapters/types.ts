// Platform Adapter Interface
// Defines a common contract for CMS platforms (WordPress, Shopify, Webflow).

export type PlatformId = 'wordpress' | 'shopify' | 'webflow' | 'antigravity'

export interface PlatformPost {
  id: string | number
  title: string
  slug: string | null
  url: string | null
  status: 'draft' | 'publish' | 'pending' | 'private'
  content: string | null
  excerpt: string | null
  published_at: string | null
  modified_at: string | null
  author: string | null
  categories: { id: number | string; name: string }[]
  tags: { id: number | string; name: string }[]
  featured_image: string | null
}

export interface PlatformCategory {
  id: number | string
  name: string
  slug: string
  count: number
  parent_id?: number | string | null
}

export interface PlatformTag {
  id: number | string
  name: string
  slug: string
  count: number
}

export interface PlatformSEO {
  seo_title: string | null
  seo_description: string | null
  focus_keyword: string | null
  seo_score: number | null
  canonical_url: string | null
  og_title: string | null
  og_description: string | null
  og_image_url: string | null
}

export interface PlatformCredentials {
  [key: string]: string | undefined
}

export interface PlatformCapabilities {
  hasCategories: boolean
  hasTags: boolean
  hasSEO: boolean
  hasRevisions: boolean
  hasMediaLibrary: boolean
  hasCustomFields: boolean
}

export interface PlatformAdapter {
  id: PlatformId
  name: string
  icon: string
  capabilities: PlatformCapabilities

  connect(credentials: PlatformCredentials): Promise<{ success: boolean; message: string }>

  getPosts(options?: {
    page?: number
    per_page?: number
    status?: string
    search?: string
  }): Promise<{ posts: PlatformPost[]; total: number }>

  createPost(data: {
    title: string
    content: string
    status?: string
    slug?: string
    categories?: (number | string)[]
    tags?: (number | string)[]
  }): Promise<PlatformPost>

  updatePost(id: string | number, data: {
    title?: string
    content?: string
    status?: string
    slug?: string
    categories?: (number | string)[]
    tags?: (number | string)[]
  }): Promise<PlatformPost>

  getCategories(): Promise<PlatformCategory[]>
  getTags(): Promise<PlatformTag[]>

  getSEOData(postId: string | number): Promise<PlatformSEO>
  updateSEOData(postId: string | number, data: Partial<PlatformSEO>): Promise<void>
}

export interface PlatformInfo {
  id: PlatformId
  name: string
  icon: string
  available: boolean
  description: string
  capabilities: PlatformCapabilities
  requiredCredentials: { key: string; label: string; type: 'text' | 'password' }[]
}
