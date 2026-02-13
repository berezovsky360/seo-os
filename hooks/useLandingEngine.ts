// Landing Engine — React Query hooks

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useLandingSites() {
  return useQuery({
    queryKey: ['landing-sites'],
    queryFn: async () => {
      const res = await fetch('/api/landing/sites')
      if (!res.ok) throw new Error('Failed to fetch sites')
      return res.json()
    },
  })
}

export function useLandingSite(siteId: string | null) {
  return useQuery({
    queryKey: ['landing-site', siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const res = await fetch(`/api/landing/sites/${siteId}`)
      if (!res.ok) throw new Error('Failed to fetch site')
      return res.json()
    },
  })
}

export function useCreateLandingSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (site: Record<string, any>) => {
      const res = await fetch('/api/landing/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(site),
      })
      if (!res.ok) throw new Error('Failed to create site')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landing-sites'] }),
  })
}

export function useUpdateLandingSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ siteId, updates }: { siteId: string; updates: Record<string, any> }) => {
      const res = await fetch(`/api/landing/sites/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update site')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['landing-sites'] })
      qc.invalidateQueries({ queryKey: ['landing-site'] })
    },
  })
}

export function useDeleteLandingSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (siteId: string) => {
      const res = await fetch(`/api/landing/sites/${siteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete site')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landing-sites'] }),
  })
}

export function useBuildSite() {
  return useMutation({
    mutationFn: async (siteId: string) => {
      const res = await fetch(`/api/landing/sites/${siteId}/build`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to build site')
      return res.json()
    },
  })
}

export function useUpdateSiteInfra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ siteId, updates }: { siteId: string; updates: Record<string, any> }) => {
      const res = await fetch(`/api/landing/sites/${siteId}/infra`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update infrastructure')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['landing-sites'] })
      qc.invalidateQueries({ queryKey: ['landing-site'] })
    },
  })
}
