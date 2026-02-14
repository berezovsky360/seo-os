// Funnel Builder — React Query hooks

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useFunnels(siteId?: string | null) {
  return useQuery({
    queryKey: ['funnels', siteId],
    queryFn: async () => {
      const url = siteId
        ? `/api/funnel-builder?site_id=${siteId}`
        : '/api/funnel-builder'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch funnels')
      return res.json()
    },
  })
}

export function useFunnel(funnelId: string | null) {
  return useQuery({
    queryKey: ['funnel', funnelId],
    enabled: !!funnelId,
    queryFn: async () => {
      const res = await fetch(`/api/funnel-builder/${funnelId}`)
      if (!res.ok) throw new Error('Failed to fetch funnel')
      return res.json()
    },
  })
}

export function useCreateFunnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (funnel: { name: string; site_id?: string; description?: string }) => {
      const res = await fetch('/api/funnel-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(funnel),
      })
      if (!res.ok) throw new Error('Failed to create funnel')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['funnels'] }),
  })
}

export function useUpdateFunnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ funnelId, updates }: { funnelId: string; updates: Record<string, any> }) => {
      const res = await fetch(`/api/funnel-builder/${funnelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update funnel')
      return res.json()
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['funnels'] })
      qc.invalidateQueries({ queryKey: ['funnel', vars.funnelId] })
    },
  })
}

export function useDeleteFunnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (funnelId: string) => {
      const res = await fetch(`/api/funnel-builder/${funnelId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete funnel')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['funnels'] }),
  })
}

export function useFunnelAnalytics(funnelId: string | null, from?: string, to?: string) {
  return useQuery({
    queryKey: ['funnel-analytics', funnelId, from, to],
    enabled: !!funnelId,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const qs = params.toString()
      const res = await fetch(`/api/funnel-builder/${funnelId}/analytics${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return res.json() as Promise<{ node_id: string; event_type: string; count: number }[]>
    },
  })
}
