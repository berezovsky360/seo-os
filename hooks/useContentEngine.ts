'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ContentFeed, ContentItem, ContentCluster, PipelineRun } from '@/lib/modules/content-engine/types'

// ====== Feeds ======

async function fetchFeeds(siteId?: string): Promise<ContentFeed[]> {
  const url = siteId ? `/api/content-engine/feeds?site_id=${siteId}` : '/api/content-engine/feeds'
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch feeds')
  const data = await res.json()
  return data.feeds || []
}

export function useContentFeeds(siteId?: string) {
  return useQuery({
    queryKey: ['content-feeds', siteId],
    queryFn: () => fetchFeeds(siteId),
  })
}

export function useCreateFeed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (feed: { name: string; feed_url: string; site_id?: string; poll_interval_minutes?: number }) => {
      const res = await fetch('/api/content-engine/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feed),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create feed')
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-feeds'] }),
  })
}

export function useUpdateFeed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ feedId, ...updates }: { feedId: string; [key: string]: any }) => {
      const res = await fetch(`/api/content-engine/feeds/${feedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update feed')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-feeds'] }),
  })
}

export function useDeleteFeed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (feedId: string) => {
      const res = await fetch(`/api/content-engine/feeds/${feedId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete feed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-feeds'] })
      qc.invalidateQueries({ queryKey: ['content-items'] })
    },
  })
}

export function usePollFeed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (feedId: string) => {
      const res = await fetch(`/api/content-engine/feeds/${feedId}/poll`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to poll feed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-feeds'] })
      qc.invalidateQueries({ queryKey: ['content-items'] })
    },
  })
}

// ====== Items ======

interface ItemsParams {
  feedId?: string
  status?: string
  minScore?: number
  page?: number
  perPage?: number
}

async function fetchItems(params: ItemsParams): Promise<{ items: ContentItem[]; total: number }> {
  const sp = new URLSearchParams()
  if (params.feedId) sp.set('feed_id', params.feedId)
  if (params.status) sp.set('status', params.status)
  if (params.minScore) sp.set('min_score', String(params.minScore))
  if (params.page) sp.set('page', String(params.page))
  if (params.perPage) sp.set('per_page', String(params.perPage))
  const res = await fetch(`/api/content-engine/items?${sp}`)
  if (!res.ok) throw new Error('Failed to fetch items')
  return res.json()
}

export function useContentItems(params: ItemsParams = {}) {
  return useQuery({
    queryKey: ['content-items', params],
    queryFn: () => fetchItems(params),
  })
}

export function useScoreItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemIds?: string[]) => {
      const res = await fetch('/api/content-engine/items/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: itemIds || [] }),
      })
      if (!res.ok) throw new Error('Failed to score items')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-items'] }),
  })
}

export function useExtractFacts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemIds?: string[]) => {
      const res = await fetch('/api/content-engine/items/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: itemIds || [] }),
      })
      if (!res.ok) throw new Error('Failed to extract facts')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-items'] }),
  })
}

// ====== Clusters ======

export function useContentClusters(siteId?: string) {
  return useQuery({
    queryKey: ['content-clusters', siteId],
    queryFn: async () => {
      const url = siteId ? `/api/content-engine/clusters?site_id=${siteId}` : '/api/content-engine/clusters'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch clusters')
      const data = await res.json()
      return (data.clusters || []) as ContentCluster[]
    },
  })
}

// ====== Pipeline ======

export function usePipelineRuns(siteId?: string) {
  return useQuery({
    queryKey: ['pipeline-runs', siteId],
    queryFn: async () => {
      const url = siteId ? `/api/content-engine/pipeline?site_id=${siteId}` : '/api/content-engine/pipeline'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch pipeline runs')
      const data = await res.json()
      return (data.runs || []) as PipelineRun[]
    },
  })
}

export function useStartPipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      preset: string
      source_item_ids?: string[]
      cluster_id?: string
      site_id?: string
      persona_id?: string
      scheduled_publish_at?: string
    }) => {
      const res = await fetch('/api/content-engine/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to start pipeline')
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline-runs'] }),
  })
}
