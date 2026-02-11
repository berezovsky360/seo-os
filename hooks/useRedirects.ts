'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ====== Types ======

export interface Redirect {
  id: string
  user_id: string
  site_id: string
  source_path: string
  target_url: string
  type: '301' | '302' | '307'
  is_regex: boolean
  hits: number
  last_hit_at: string | null
  auto_generated: boolean
  note: string | null
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface FourOhFourEntry {
  id: string
  site_id: string
  path: string
  referer: string | null
  user_agent: string | null
  hits: number
  first_seen: string
  last_seen: string
  resolved: boolean
}

interface RedirectFilters {
  search?: string
  type?: string
  enabled?: string
}

// ====== List redirects ======

export function useRedirects(siteId: string, filters: RedirectFilters = {}) {
  return useQuery({
    queryKey: ['redirects', siteId, filters],
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (filters.search) sp.set('search', filters.search)
      if (filters.type) sp.set('type', filters.type)
      if (filters.enabled) sp.set('enabled', filters.enabled)
      const res = await fetch(`/api/sites/${siteId}/redirects?${sp}`)
      if (!res.ok) throw new Error('Failed to fetch redirects')
      const data = await res.json()
      return (data.redirects || []) as Redirect[]
    },
    enabled: !!siteId,
  })
}

// ====== Create redirect ======

export function useCreateRedirect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      siteId: string
      source_path: string
      target_url: string
      type?: '301' | '302' | '307'
      is_regex?: boolean
      note?: string
    }) => {
      const { siteId, ...body } = payload
      const res = await fetch(`/api/sites/${siteId}/redirects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create redirect')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['redirects', variables.siteId] })
    },
  })
}

// ====== Update redirect ======

export function useUpdateRedirect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      siteId: string
      id: string
      source_path?: string
      target_url?: string
      type?: '301' | '302' | '307'
      is_regex?: boolean
      note?: string | null
      enabled?: boolean
    }) => {
      const { siteId, ...body } = payload
      const res = await fetch(`/api/sites/${siteId}/redirects`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update redirect')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['redirects', variables.siteId] })
    },
  })
}

// ====== Delete redirect ======

export function useDeleteRedirect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { siteId: string; id: string }) => {
      const { siteId, id } = payload
      const sp = new URLSearchParams({ id })
      const res = await fetch(`/api/sites/${siteId}/redirects?${sp}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete redirect')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['redirects', variables.siteId] })
    },
  })
}

// ====== 404 log ======

export function use404Log(siteId: string) {
  return useQuery({
    queryKey: ['404-log', siteId],
    queryFn: async () => {
      const sp = new URLSearchParams({ resolved: 'false' })
      const res = await fetch(`/api/sites/${siteId}/redirects/404-log?${sp}`)
      if (!res.ok) throw new Error('Failed to fetch 404 log')
      const data = await res.json()
      return (data.entries || []) as FourOhFourEntry[]
    },
    enabled: !!siteId,
  })
}

// ====== Dismiss (resolve) a 404 entry ======

export function useDismiss404() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { siteId: string; id: string }) => {
      const { siteId, id } = payload
      const sp = new URLSearchParams({ id })
      const res = await fetch(`/api/sites/${siteId}/redirects/404-log?${sp}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to dismiss 404 entry')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['404-log', variables.siteId] })
    },
  })
}

// ====== Import redirects (CSV / JSON) ======

export function useImportRedirects() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      siteId: string
      format: 'csv' | 'json'
      data: string
    }) => {
      const { siteId, ...body } = payload
      const res = await fetch(`/api/sites/${siteId}/redirects/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to import redirects')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['redirects', variables.siteId] })
    },
  })
}

// ====== Create redirect from 404 entry (shortcut) ======

export function useCreate404Redirect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      siteId: string
      entryId: string
      source_path: string
      target_url: string
    }) => {
      const { siteId, entryId, ...body } = payload

      // Create the redirect
      const res = await fetch(`/api/sites/${siteId}/redirects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create redirect from 404')
      }

      // Dismiss the 404 entry
      const sp = new URLSearchParams({ id: entryId })
      await fetch(`/api/sites/${siteId}/redirects/404-log?${sp}`, {
        method: 'DELETE',
      })

      return res.json()
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['redirects', variables.siteId] })
      qc.invalidateQueries({ queryKey: ['404-log', variables.siteId] })
    },
  })
}
