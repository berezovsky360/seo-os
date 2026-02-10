// Webflow Platform Adapter (Stub)
// Placeholder for future Webflow integration.

import type {
  PlatformAdapter,
  PlatformPost,
  PlatformCategory,
  PlatformTag,
  PlatformSEO,
  PlatformCredentials,
  PlatformCapabilities,
} from './types'

export class WebflowAdapter implements PlatformAdapter {
  id = 'webflow' as const
  name = 'Webflow'
  icon = 'Layout'

  capabilities: PlatformCapabilities = {
    hasCategories: true,
    hasTags: false,
    hasSEO: true,
    hasRevisions: false,
    hasMediaLibrary: true,
    hasCustomFields: true,
  }

  async connect(_credentials: PlatformCredentials): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Webflow integration coming soon' }
  }

  async getPosts(): Promise<{ posts: PlatformPost[]; total: number }> {
    throw new Error('Webflow integration coming soon')
  }

  async createPost(): Promise<PlatformPost> {
    throw new Error('Webflow integration coming soon')
  }

  async updatePost(): Promise<PlatformPost> {
    throw new Error('Webflow integration coming soon')
  }

  async getCategories(): Promise<PlatformCategory[]> {
    throw new Error('Webflow integration coming soon')
  }

  async getTags(): Promise<PlatformTag[]> {
    throw new Error('Webflow integration coming soon')
  }

  async getSEOData(): Promise<PlatformSEO> {
    throw new Error('Webflow integration coming soon')
  }

  async updateSEOData(): Promise<void> {
    throw new Error('Webflow integration coming soon')
  }
}
