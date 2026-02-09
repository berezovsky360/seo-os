'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ====== Types ======

export interface GSCDailyStats {
  date: string
  gsc_clicks: number | null
  gsc_impressions: number | null
  gsc_ctr: number | null
  gsc_position: number | null
}

export interface GSCQueryRow {
  id: string
  site_id: string
  date: string
  query: string
  page: string | null
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GSCPageAggregate {
  page: string
  clicks: number
  impressions: number
  ctr: number
  avg_position: number
  query_count: number
}

export interface GSCLowCTRPage {
  page: string
  clicks: number
  impressions: number
  ctr: number
  avg_position: number
  queries: number
}

export interface GSCSyncResult {
  daily_rows: number
  query_rows: number
  new_keywords: number
}

// ====== Hooks ======

export function useGSCAnalytics(siteId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['gsc-analytics', siteId, startDate, endDate],
    queryFn: async (): Promise<GSCDailyStats[]> => {
      const params = new URLSearchParams({ site_id: siteId, start_date: startDate, end_date: endDate })
      const res = await fetch(`/api/gsc-insights/analytics?${params}`)
      if (!res.ok) throw new Error('Failed to fetch GSC analytics')
      const data = await res.json()
      return data.analytics
    },
    enabled: !!siteId && !!startDate && !!endDate,
    staleTime: 5 * 60_000,
  })
}

export function useGSCTopQueries(
  siteId: string,
  options?: { sort?: string; limit?: number; offset?: number }
) {
  const sort = options?.sort || 'impressions'
  const limit = options?.limit || 100
  const offset = options?.offset || 0

  return useQuery({
    queryKey: ['gsc-queries', siteId, sort, limit, offset],
    queryFn: async (): Promise<{ queries: GSCQueryRow[]; total: number }> => {
      const params = new URLSearchParams({
        site_id: siteId,
        sort,
        limit: String(limit),
        offset: String(offset),
      })
      const res = await fetch(`/api/gsc-insights/queries?${params}`)
      if (!res.ok) throw new Error('Failed to fetch top queries')
      return res.json()
    },
    enabled: !!siteId,
    staleTime: 5 * 60_000,
  })
}

export function useGSCTopPages(siteId: string, limit: number = 50) {
  return useQuery({
    queryKey: ['gsc-pages', siteId, limit],
    queryFn: async (): Promise<GSCPageAggregate[]> => {
      const params = new URLSearchParams({ site_id: siteId, limit: String(limit) })
      const res = await fetch(`/api/gsc-insights/pages?${params}`)
      if (!res.ok) throw new Error('Failed to fetch top pages')
      const data = await res.json()
      return data.pages
    },
    enabled: !!siteId,
    staleTime: 5 * 60_000,
  })
}

export function useGSCLowCTR(
  siteId: string,
  maxCtr: number = 2,
  minImpressions: number = 100
) {
  return useQuery({
    queryKey: ['gsc-low-ctr', siteId, maxCtr, minImpressions],
    queryFn: async (): Promise<GSCLowCTRPage[]> => {
      const params = new URLSearchParams({
        site_id: siteId,
        max_ctr: String(maxCtr),
        min_impressions: String(minImpressions),
      })
      const res = await fetch(`/api/gsc-insights/low-ctr?${params}`)
      if (!res.ok) throw new Error('Failed to fetch low CTR pages')
      const data = await res.json()
      return data.pages
    },
    enabled: !!siteId,
    staleTime: 5 * 60_000,
  })
}

export function useSyncGSCData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { site_id: string; days?: number }): Promise<GSCSyncResult> => {
      const res = await fetch('/api/gsc-insights/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to sync GSC data')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gsc-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['gsc-queries'] })
      queryClient.invalidateQueries({ queryKey: ['gsc-pages'] })
      queryClient.invalidateQueries({ queryKey: ['gsc-low-ctr'] })
    },
  })
}
