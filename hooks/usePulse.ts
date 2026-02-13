// Silent Pulse — React Query hooks for analytics dashboard

'use client'

import { useQuery } from '@tanstack/react-query'

export function usePulseStats(siteId: string | null, days: number = 30) {
  return useQuery({
    queryKey: ['pulse-stats', siteId, days],
    enabled: !!siteId,
    queryFn: async () => {
      const res = await fetch(`/api/pulse/stats/${siteId}?days=${days}`)
      if (!res.ok) throw new Error('Failed to fetch pulse stats')
      return res.json() as Promise<{
        daily: { date: string; views: number; visitors: number }[]
        topPages: { page_path: string; views: number }[]
        referrers: { referrer: string; count: number }[]
        devices: { device: string; count: number }[]
      }>
    },
    refetchInterval: 60000, // Refresh every minute
  })
}
