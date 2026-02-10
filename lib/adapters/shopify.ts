// Shopify Platform Adapter (Stub)
// Placeholder for future Shopify integration.

import type {
  PlatformAdapter,
  PlatformPost,
  PlatformCategory,
  PlatformTag,
  PlatformSEO,
  PlatformCredentials,
  PlatformCapabilities,
} from './types'

export class ShopifyAdapter implements PlatformAdapter {
  id = 'shopify' as const
  name = 'Shopify'
  icon = 'ShoppingBag'

  capabilities: PlatformCapabilities = {
    hasCategories: true,
    hasTags: true,
    hasSEO: true,
    hasRevisions: false,
    hasMediaLibrary: true,
    hasCustomFields: true,
  }

  async connect(_credentials: PlatformCredentials): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Shopify integration coming soon' }
  }

  async getPosts(): Promise<{ posts: PlatformPost[]; total: number }> {
    throw new Error('Shopify integration coming soon')
  }

  async createPost(): Promise<PlatformPost> {
    throw new Error('Shopify integration coming soon')
  }

  async updatePost(): Promise<PlatformPost> {
    throw new Error('Shopify integration coming soon')
  }

  async getCategories(): Promise<PlatformCategory[]> {
    throw new Error('Shopify integration coming soon')
  }

  async getTags(): Promise<PlatformTag[]> {
    throw new Error('Shopify integration coming soon')
  }

  async getSEOData(): Promise<PlatformSEO> {
    throw new Error('Shopify integration coming soon')
  }

  async updateSEOData(): Promise<void> {
    throw new Error('Shopify integration coming soon')
  }
}
