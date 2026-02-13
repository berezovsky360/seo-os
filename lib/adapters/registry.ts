// Platform Adapter Registry
// Factory for creating platform-specific adapters.

import type { PlatformAdapter, PlatformId, PlatformInfo } from './types'
import { WordPressAdapter } from './wordpress'
import { ShopifyAdapter } from './shopify'
import { WebflowAdapter } from './webflow'
import { AntigravityAdapter } from './antigravity'

const ADAPTERS: Record<PlatformId, () => PlatformAdapter> = {
  wordpress: () => new WordPressAdapter(),
  shopify: () => new ShopifyAdapter(),
  webflow: () => new WebflowAdapter(),
  antigravity: () => new AntigravityAdapter(),
}

export function getAdapter(platformId: PlatformId): PlatformAdapter {
  const factory = ADAPTERS[platformId]
  if (!factory) {
    throw new Error(`Unknown platform: ${platformId}`)
  }
  return factory()
}

export function getAvailablePlatforms(): PlatformInfo[] {
  return [
    {
      id: 'wordpress',
      name: 'WordPress',
      icon: 'Globe',
      available: true,
      description: 'Full integration with WordPress REST API and Rank Math SEO',
      capabilities: new WordPressAdapter().capabilities,
      requiredCredentials: [
        { key: 'url', label: 'Site URL', type: 'text' },
        { key: 'username', label: 'WP Username', type: 'text' },
        { key: 'app_password', label: 'Application Password', type: 'password' },
      ],
    },
    {
      id: 'shopify',
      name: 'Shopify',
      icon: 'ShoppingBag',
      available: false,
      description: 'Manage Shopify blog posts and product SEO (coming soon)',
      capabilities: new ShopifyAdapter().capabilities,
      requiredCredentials: [
        { key: 'store_url', label: 'Store URL', type: 'text' },
        { key: 'access_token', label: 'Admin API Access Token', type: 'password' },
      ],
    },
    {
      id: 'webflow',
      name: 'Webflow',
      icon: 'Layout',
      available: false,
      description: 'Manage Webflow CMS items and SEO settings (coming soon)',
      capabilities: new WebflowAdapter().capabilities,
      requiredCredentials: [
        { key: 'site_id', label: 'Site ID', type: 'text' },
        { key: 'api_token', label: 'API Token', type: 'password' },
      ],
    },
    {
      id: 'antigravity',
      name: 'Antigravity Engine',
      icon: 'Rocket',
      available: true,
      description: 'Built-in static site builder — zero JS, 100/100 PageSpeed',
      capabilities: new AntigravityAdapter().capabilities,
      requiredCredentials: [
        { key: 'landing_site_id', label: 'Landing Site ID', type: 'text' },
      ],
    },
  ]
}
