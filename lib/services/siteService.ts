import { supabase } from '@/lib/supabase/client'
import type { Site } from '@/types'

// Database type (matches Supabase schema)
export interface SiteRecord {
  id: string
  user_id: string
  name: string
  url: string
  favicon: string | null
  theme: string
  wp_username: string | null
  wp_app_password: string | null
  gsc_property: string | null
  ga_property_id: string | null
  tone_of_voice: string
  language: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Transform DB record to App type
function transformSiteRecord(record: SiteRecord): Partial<Site> {
  return {
    id: record.id,
    name: record.name,
    url: record.url,
    favicon: record.favicon || `https://www.google.com/s2/favicons?domain=${record.url}&sz=64`,
    theme: record.theme,
    wp_username: record.wp_username,
    wp_app_password: record.wp_app_password,
    // Will be populated from other tables later
    metrics: {
      speedScore: 0,
      notFoundCount: 0,
      indexedPages: 0,
      trafficTrend: [],
      organicKeywords: 0,
      rankDistribution: {
        top1: 0,
        top3: 0,
        top5: 0,
        top10: 0,
        top20: 0,
        top100: 0
      },
      deviceTraffic: {
        desktop: 50,
        mobile: 50
      }
    },
    contentQueue: {
      live: 0,
      queued: 0,
      articles: 0,
      drafts: 0
    }
  }
}

export const siteService = {
  // Get all sites for current user
  async getAllSites(): Promise<Site[]> {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sites:', error)
      throw new Error(`Failed to fetch sites: ${error.message}`)
    }

    return (data || []).map(record => transformSiteRecord(record)) as Site[]
  },

  // Get single site by ID
  async getSiteById(siteId: string): Promise<Site | null> {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (error) {
      console.error('Error fetching site:', error)
      return null
    }

    return transformSiteRecord(data) as Site
  },

  // Create new site
  async createSite(site: {
    name: string
    url: string
    theme?: string
    wp_username?: string
    wp_app_password?: string
  }): Promise<Site> {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('sites')
      .insert({
        user_id: user.id,
        name: site.name,
        url: site.url,
        theme: site.theme || 'hyper-blue',
        wp_username: site.wp_username,
        wp_app_password: site.wp_app_password,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating site:', error)
      throw new Error(`Failed to create site: ${error.message}`)
    }

    return transformSiteRecord(data) as Site
  },

  // Update site
  async updateSite(siteId: string, updates: Partial<SiteRecord>): Promise<Site> {
    const { data, error } = await supabase
      .from('sites')
      .update(updates)
      .eq('id', siteId)
      .select()
      .single()

    if (error) {
      console.error('Error updating site:', error)
      throw new Error(`Failed to update site: ${error.message}`)
    }

    return transformSiteRecord(data) as Site
  },

  // Delete site (soft delete)
  async deleteSite(siteId: string): Promise<void> {
    const { error } = await supabase
      .from('sites')
      .update({ is_active: false })
      .eq('id', siteId)

    if (error) {
      console.error('Error deleting site:', error)
      throw new Error(`Failed to delete site: ${error.message}`)
    }
  },

  // Test WordPress connection
  async testWordPressConnection(
    wpUrl: string,
    wpUsername: string,
    wpAppPassword: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      // Dynamically import WordPress client to avoid circular dependencies
      const { createWordPressClient } = await import('@/lib/wordpress/client')

      const wpClient = createWordPressClient({
        url: wpUrl,
        username: wpUsername,
        appPassword: wpAppPassword,
      })

      return await wpClient.testConnection()
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      }
    }
  }
}
