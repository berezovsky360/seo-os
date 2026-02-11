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
