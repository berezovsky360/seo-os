'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ====== Types ======

export interface RankKeyword {
  id: string
  site_id: string
  keyword: string
  language: string
  location_code: number
  current_position: number | null
  previous_position: number | null
  search_volume: number | null
  keyword_difficulty: number | null
  last_checked_at: string | null
  created_at: string
}

export interface PositionHistoryPoint {
  date: string
  position: number | null
}

export interface CheckResult {
  checked: number
  dropped: number
  improved: number
}

// ====== Hooks ======

export function useRankPulseKeywords(siteId: string) {
  return useQuery({
    queryKey: ['rank-pulse-keywords', siteId],
    queryFn: async (): Promise<RankKeyword[]> => {
      const res = await fetch(`/api/rank-pulse/keywords?site_id=${siteId}`)
      if (!res.ok) throw new Error('Failed to fetch keywords')
      const data = await res.json()
      return data.keywords
    },
    enabled: !!siteId,
    staleTime: 60_000,
  })
}

export function useKeywordHistory(keywordId: string, days: number = 30) {
  return useQuery({
    queryKey: ['keyword-history', keywordId, days],
    queryFn: async (): Promise<PositionHistoryPoint[]> => {
      const res = await fetch(`/api/rank-pulse/history?keyword_id=${keywordId}&days=${days}`)
      if (!res.ok) throw new Error('Failed to fetch history')
      const data = await res.json()
      return data.history
    },
    enabled: !!keywordId,
    staleTime: 60_000,
  })
}

export function useCheckPositions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (siteId: string): Promise<CheckResult> => {
      const res = await fetch('/api/rank-pulse/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: siteId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to check positions')
      }
      return res.json()
    },
    onSuccess: (_, siteId) => {
      queryClient.invalidateQueries({ queryKey: ['rank-pulse-keywords', siteId] })
      queryClient.invalidateQueries({ queryKey: ['keyword-history'] })
    },
  })
}

export function useAddKeyword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      site_id: string
      keyword: string
      language?: string
      location_code?: number
    }): Promise<RankKeyword> => {
      const res = await fetch('/api/rank-pulse/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to add keyword')
      }
      const result = await res.json()
      return result.keyword
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rank-pulse-keywords', variables.site_id] })
    },
  })
}

export function useDeleteRankKeyword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (keywordId: string): Promise<void> => {
      const res = await fetch(`/api/rank-pulse/keywords?id=${keywordId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete keyword')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rank-pulse-keywords'] })
    },
  })
}

export function useSerpSnapshot() {
  return useMutation({
    mutationFn: async (data: {
      keyword: string
      site_id?: string
      location_code?: number
      language_code?: string
    }) => {
      const res = await fetch('/api/rank-pulse/serp-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to get SERP snapshot')
      }
      return res.json()
    },
  })
}
