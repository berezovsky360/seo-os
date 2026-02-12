'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estimateOnPageCost } from '@/lib/dataforseo/client'

// ====== Types ======

export interface OnPageCrawl {
  id: string
  user_id: string
  site_id: string | null
  competitor_id: string | null
  target_domain: string
  task_id: string | null
  status: string
  max_crawl_pages: number
  crawl_options: Record<string, any> | null
  pages_crawled: number
  pages_total: number | null
  crawl_progress: number
  estimated_cost: number | null
  actual_cost: number | null
  summary: Record<string, any> | null
  started_at: string | null
  completed_at: string | null
  expires_at: string | null
  created_at: string
}

export interface OnPagePage {
  id: string
  crawl_id: string
  url: string
  status_code: number
  resource_type: string
  media_type: string | null
  size: number
  encoded_size: number | null
  total_transfer_size: number | null
  fetch_time: number | null
  onpage_score: number
  meta_title: string | null
  meta_title_length: number | null
  meta_description: string | null
  meta_description_length: number | null
  canonical: string | null
  content_word_count: number | null
  h1_count: number
  h2_count: number
  h3_count: number
  h1_text: string[]
  internal_links_count: number
  external_links_count: number
  broken_links_count: number
  images_count: number
  images_without_alt: number
  images_size: number | null
  time_to_interactive: number | null
  dom_complete: number | null
  largest_contentful_paint: number | null
  cumulative_layout_shift: number | null
  is_indexable: boolean
  no_index: boolean
  no_follow: boolean
  checks: Record<string, boolean> | null
  page_timing: Record<string, any> | null
  last_modified: string | null
}

export interface OnPageDuplicate {
  id: string
  crawl_id: string
  duplicate_type: 'title' | 'description' | 'content'
  url_1: string
  url_2: string
  similarity: number | null
  created_at: string
}

export interface OnPageRedirect {
  id: string
  crawl_id: string
  from_url: string
  to_url: string
  redirect_code: number
  chain_length: number
  is_redirect_loop: boolean
  created_at: string
}

export interface InstantAuditResult {
  audit_id: string | null
  url: string
  onpage_score: number
  status_code: number
  meta_title: string | null
  meta_description: string | null
  word_count: number
  h1_count: number
  internal_links: number
  external_links: number
  images_count: number
  images_without_alt: number
  is_indexable: boolean
  checks: Record<string, boolean>
  page_timing: Record<string, any> | null
}

export interface InstantAudit {
  id: string
  user_id: string
  url: string
  onpage_score: number | null
  meta_title: string | null
  meta_description: string | null
  content_word_count: number | null
  h1_count: number | null
  internal_links: number | null
  external_links: number | null
  images_count: number | null
  images_without_alt: number | null
  status_code: number | null
  is_indexable: boolean | null
  checks: Record<string, boolean> | null
  page_timing: Record<string, any> | null
  created_at: string
}

// ====== Hooks ======

export function useCrawls(userId: string, domain?: string) {
  return useQuery({
    queryKey: ['anatomy-crawls', userId, domain],
    queryFn: async () => {
      let url = `/api/competitor-anatomy/crawl?user_id=${userId}`
      if (domain) url += `&domain=${encodeURIComponent(domain)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch crawls')
      const data = await res.json()
      return data.crawls as OnPageCrawl[]
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

export function useCrawlDetail(crawlId: string) {
  return useQuery({
    queryKey: ['anatomy-crawl', crawlId],
    queryFn: async () => {
      const res = await fetch(`/api/competitor-anatomy/crawl/${crawlId}`)
      if (!res.ok) throw new Error('Failed to fetch crawl detail')
      const data = await res.json()
      return data.crawl as OnPageCrawl
    },
    enabled: !!crawlId,
    refetchInterval: (query) => {
      const crawl = query.state.data
      if (crawl && (crawl.status === 'crawling' || crawl.status === 'pending')) {
        return 5000
      }
      return false
    },
  })
}

export function useStartCrawl() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      target_domain: string
      user_id: string
      max_crawl_pages?: number
      enable_javascript?: boolean
      load_resources?: boolean
      site_id?: string
      competitor_id?: string
    }) => {
      const res = await fetch('/api/competitor-anatomy/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start crawl')
      }
      return res.json() as Promise<{ task_id: string; status: string }>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['anatomy-crawls', variables.user_id] })
    },
  })
}

export function useDeleteCrawl() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ crawlId, userId }: { crawlId: string; userId: string }) => {
      const res = await fetch(`/api/competitor-anatomy/crawl/${crawlId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete crawl')
      return { userId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['anatomy-crawls', data.userId] })
    },
  })
}

export function useCrawlPages(crawlId: string, opts?: {
  limit?: number
  offset?: number
  sort?: string
  order?: string
  resource_type?: string
  min_score?: number
  max_score?: number
  min_word_count?: number
  status_code?: number
}) {
  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0

  return useQuery({
    queryKey: ['anatomy-pages', crawlId, opts],
    queryFn: async () => {
      const params = new URLSearchParams({ crawlId, limit: String(limit), offset: String(offset) })
      if (opts?.sort) params.set('sort', opts.sort)
      if (opts?.order) params.set('order', opts.order)
      if (opts?.resource_type) params.set('resource_type', opts.resource_type)
      if (opts?.min_score != null) params.set('min_score', String(opts.min_score))
      if (opts?.max_score != null) params.set('max_score', String(opts.max_score))
      if (opts?.min_word_count != null) params.set('min_word_count', String(opts.min_word_count))
      if (opts?.status_code != null) params.set('status_code', String(opts.status_code))

      const res = await fetch(`/api/competitor-anatomy/pages?${params}`)
      if (!res.ok) throw new Error('Failed to fetch pages')
      const data = await res.json()
      return { pages: data.pages as OnPagePage[], total: data.total as number }
    },
    enabled: !!crawlId,
    staleTime: 60 * 1000,
  })
}

export function useCrawlDuplicates(crawlId: string, type?: string) {
  return useQuery({
    queryKey: ['anatomy-duplicates', crawlId, type],
    queryFn: async () => {
      let url = `/api/competitor-anatomy/duplicates?crawlId=${crawlId}`
      if (type) url += `&type=${type}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch duplicates')
      const data = await res.json()
      return data.duplicates as OnPageDuplicate[]
    },
    enabled: !!crawlId,
    staleTime: 60 * 1000,
  })
}

export function useCrawlRedirects(crawlId: string) {
  return useQuery({
    queryKey: ['anatomy-redirects', crawlId],
    queryFn: async () => {
      const res = await fetch(`/api/competitor-anatomy/redirects?crawlId=${crawlId}`)
      if (!res.ok) throw new Error('Failed to fetch redirects')
      const data = await res.json()
      return data.redirects as OnPageRedirect[]
    },
    enabled: !!crawlId,
    staleTime: 60 * 1000,
  })
}

export function useInstantAudit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { url: string; user_id: string }) => {
      const res = await fetch('/api/competitor-anatomy/instant-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Instant audit failed')
      }
      return res.json() as Promise<InstantAuditResult>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['anatomy-audits', variables.user_id] })
    },
  })
}

export function useInstantAudits(userId: string) {
  return useQuery({
    queryKey: ['anatomy-audits', userId],
    queryFn: async () => {
      const res = await fetch(`/api/competitor-anatomy/instant-audit?user_id=${userId}`)
      if (!res.ok) throw new Error('Failed to fetch audits')
      const data = await res.json()
      return data.audits as InstantAudit[]
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

// Client-side cost estimation (no API call needed)
export function useEstimateCrawlCost(config: {
  maxPages: number
  enableJavascript?: boolean
  loadResources?: boolean
  enableBrowserRendering?: boolean
  enableContentParsing?: boolean
  enableKeywordDensity?: boolean
}): number {
  return estimateOnPageCost(config)
}
