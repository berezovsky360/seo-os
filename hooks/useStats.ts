'use client'

import { useQuery } from '@tanstack/react-query'

interface SiteStats {
  live: number
  drafts: number
  queued: number
  articles: number
  notFoundCount: number
}

interface AllStatsResponse {
  success: boolean
  stats: Record<string, SiteStats>
}

// Get statistics for all sites
export function useAllStats() {
  return useQuery({
    queryKey: ['stats', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/stats/all')
      if (!response.ok) {
        throw new Error('Failed to fetch statistics')
      }
      const data: AllStatsResponse = await response.json()
      return data.stats
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}

// Get statistics for single site
export function useSiteStats(siteId: string) {
  return useQuery({
    queryKey: ['stats', siteId],
    queryFn: async () => {
      const response = await fetch(`/api/sites/${siteId}/stats`)
      if (!response.ok) {
        throw new Error('Failed to fetch site statistics')
      }
      const data = await response.json()
      return data.stats
    },
    enabled: !!siteId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}
