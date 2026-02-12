'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Competitor {
  id: string
  site_id: string
  user_id: string
  domain: string
  name: string | null
  last_synced_at: string | null
  ranked_keywords_count: number
  organic_traffic_estimate: number
  domain_rank: number | null
  organic_etv: number | null
  organic_keywords_total: number | null
  keywords_top3: number | null
  keywords_top10: number | null
  keywords_top100: number | null
  referring_domains: number | null
  backlinks_count: number | null
  location_code: number | null
  language_code: string | null
  created_at: string
  updated_at: string
}

export interface KeywordGap {
  keyword: string
  search_volume: number | null
  position: number | null
  url: string | null
  keyword_difficulty: number | null
}

export interface RankingComparison {
  keyword: string
  your_position: number
  competitor_position: number
  search_volume: number | null
  winning: boolean
}

export interface CompetitorTopPage {
  id: string
  competitor_id: string
  page_url: string
  etv: number
  keywords_count: number
  top3_count: number
  top10_count: number
  last_checked_at: string
}

export interface DiscoveredCompetitor {
  id: string
  site_id: string
  discovered_domain: string
  intersections: number
  organic_etv: number
  organic_keywords: number
  avg_position: number
  discovered_at: string
}

export interface ContentGapItem {
  keyword: string
  search_volume: number | null
  keyword_difficulty: number | null
  competitor_position: number | null
  competitor_url: string | null
}

export interface CompetitorSnapshot {
  id: string
  competitor_id: string
  domain_rank: number | null
  organic_etv: number | null
  organic_keywords_total: number | null
  keywords_top3: number | null
  keywords_top10: number | null
  keywords_top100: number | null
  referring_domains: number | null
  backlinks_count: number | null
  snapshot_date: string
  created_at: string
}

export interface PrecheckResult {
  domain: string
  domain_rank: number
  organic_etv: number
  organic_keywords_total: number
  keywords_top3: number
  keywords_top10: number
  referring_domains: number
  backlinks_count: number
  cost_breakdown: Record<string, number>
  estimated_credits: number
  balance: number
}

export function useCompetitors(siteId: string) {
  return useQuery({
    queryKey: ['competitors', siteId],
    queryFn: async () => {
      const res = await fetch(`/api/competitor-analysis/competitors?siteId=${siteId}`)
      if (!res.ok) throw new Error('Failed to fetch competitors')
      const data = await res.json()
      return data.competitors as Competitor[]
    },
    enabled: !!siteId,
  })
}

export function useAddCompetitor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { site_id: string; domain: string; name?: string }) => {
      const res = await fetch('/api/competitor-analysis/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add competitor')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['competitors', variables.site_id] })
    },
  })
}

export function useDeleteCompetitor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, siteId }: { id: string; siteId: string }) => {
      const res = await fetch(`/api/competitor-analysis/competitors?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete competitor')
      return { siteId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['competitors', data.siteId] })
    },
  })
}

export function useRunAnalysis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ competitorId, siteId }: { competitorId: string; siteId: string }) => {
      const res = await fetch('/api/competitor-analysis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_id: competitorId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Analysis failed')
      }
      return { ...(await res.json()), siteId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['competitors', data.siteId] })
    },
  })
}

export function useKeywordGaps(siteId: string, competitorId: string) {
  return useQuery({
    queryKey: ['keyword-gaps', siteId, competitorId],
    queryFn: async () => {
      const res = await fetch(`/api/competitor-analysis/gaps?siteId=${siteId}&competitorId=${competitorId}`)
      if (!res.ok) throw new Error('Failed to fetch keyword gaps')
      const data = await res.json()
      return { gaps: data.gaps as KeywordGap[], total: data.total as number }
    },
    enabled: !!siteId && !!competitorId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRankingComparison(siteId: string, competitorId: string) {
  return useQuery({
    queryKey: ['ranking-comparison', siteId, competitorId],
    queryFn: async () => {
      const res = await fetch(`/api/competitor-analysis/compare?siteId=${siteId}&competitorId=${competitorId}`)
      if (!res.ok) throw new Error('Failed to fetch ranking comparison')
      const data = await res.json()
      return {
        overlapping: data.overlapping as RankingComparison[],
        winning: data.winning as number,
        losing: data.losing as number,
        total: data.total as number,
      }
    },
    enabled: !!siteId && !!competitorId,
    staleTime: 5 * 60 * 1000,
  })
}

// ====== New Hooks ======

export function useFetchOverview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ competitorId, siteId }: { competitorId: string; siteId: string }) => {
      const res = await fetch('/api/competitor-analysis/overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_id: competitorId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch overview')
      }
      return { ...(await res.json()), siteId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['competitors', data.siteId] })
      queryClient.invalidateQueries({ queryKey: ['competitor-snapshots'] })
    },
  })
}

export function useFetchTopPages() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ competitorId, limit }: { competitorId: string; limit?: number }) => {
      const res = await fetch('/api/competitor-analysis/top-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_id: competitorId, limit }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch top pages')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['competitor-top-pages', variables.competitorId] })
    },
  })
}

export function useTopPages(competitorId: string) {
  return useQuery({
    queryKey: ['competitor-top-pages', competitorId],
    queryFn: async () => {
      const res = await fetch(`/api/competitor-analysis/top-pages?competitorId=${competitorId}`)
      if (!res.ok) throw new Error('Failed to fetch top pages')
      const data = await res.json()
      return data.pages as CompetitorTopPage[]
    },
    enabled: !!competitorId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDiscoverCompetitors() {
  return useMutation({
    mutationFn: async ({ siteId }: { siteId: string }) => {
      const res = await fetch('/api/competitor-analysis/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: siteId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to discover competitors')
      }
      return res.json() as Promise<{ task_id: string; status: string }>
    },
  })
}

export function useDiscoveries(siteId: string) {
  return useQuery({
    queryKey: ['competitor-discoveries', siteId],
    queryFn: async () => {
      const res = await fetch(`/api/competitor-analysis/discover?siteId=${siteId}`)
      if (!res.ok) throw new Error('Failed to fetch discoveries')
      const data = await res.json()
      return data.discoveries as DiscoveredCompetitor[]
    },
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useContentGap(siteId: string, competitorId: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/competitor-analysis/content-gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: siteId, competitor_id: competitorId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Content gap analysis failed')
      }
      return res.json() as Promise<{ gaps: ContentGapItem[]; total: number }>
    },
  })
}

export function useDeepAnalysis() {
  return useMutation({
    mutationFn: async ({ competitorId }: { competitorId: string; siteId: string }) => {
      const res = await fetch('/api/competitor-analysis/deep-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_id: competitorId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Deep analysis failed')
      }
      return res.json() as Promise<{ task_id: string; status: string }>
    },
  })
}

export function usePrecheck() {
  return useMutation({
    mutationFn: async ({ domain, siteId }: { domain: string; siteId: string }) => {
      const res = await fetch('/api/competitor-analysis/precheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, site_id: siteId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Pre-check failed')
      }
      return res.json() as Promise<PrecheckResult>
    },
  })
}

export function useCompetitorSnapshots(competitorId: string) {
  return useQuery({
    queryKey: ['competitor-snapshots', competitorId],
    queryFn: async () => {
      const res = await fetch(`/api/competitor-analysis/snapshots?competitorId=${competitorId}`)
      if (!res.ok) throw new Error('Failed to fetch snapshots')
      const data = await res.json()
      return data.snapshots as CompetitorSnapshot[]
    },
    enabled: !!competitorId,
    staleTime: 10 * 60 * 1000,
  })
}
