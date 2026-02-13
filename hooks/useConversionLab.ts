// Conversion Lab — React Query hooks for CRM pipeline and leads

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ====== Pipeline Stages ======

export function usePipelineStages() {
  return useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const res = await fetch('/api/conversion-lab/pipeline')
      if (!res.ok) throw new Error('Failed to fetch stages')
      return res.json()
    },
  })
}

export function useCreateStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (stage: { name: string; color?: string; sort_order?: number }) => {
      const res = await fetch('/api/conversion-lab/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stage),
      })
      if (!res.ok) throw new Error('Failed to create stage')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline-stages'] }),
  })
}

// ====== Leads ======

export function useLeads(options?: { siteId?: string; stage?: string; search?: string; page?: number }) {
  return useQuery({
    queryKey: ['leads', options],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (options?.siteId) params.set('site_id', options.siteId)
      if (options?.stage) params.set('stage', options.stage)
      if (options?.search) params.set('search', options.search)
      if (options?.page) params.set('page', String(options.page))
      const res = await fetch(`/api/conversion-lab/leads?${params}`)
      if (!res.ok) throw new Error('Failed to fetch leads')
      return res.json()
    },
  })
}

export function useLead(leadId: string | null) {
  return useQuery({
    queryKey: ['lead', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const res = await fetch(`/api/conversion-lab/leads/${leadId}`)
      if (!res.ok) throw new Error('Failed to fetch lead')
      return res.json()
    },
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ leadId, updates }: { leadId: string; updates: Record<string, any> }) => {
      const res = await fetch(`/api/conversion-lab/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update lead')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['lead'] })
    },
  })
}

// ====== Timeline ======

export function useLeadTimeline(leadId: string | null) {
  return useQuery({
    queryKey: ['lead-timeline', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const res = await fetch(`/api/conversion-lab/leads/${leadId}/timeline`)
      if (!res.ok) throw new Error('Failed to fetch timeline')
      return res.json()
    },
  })
}

// ====== Notes ======

export function useLeadNotes(leadId: string | null) {
  return useQuery({
    queryKey: ['lead-notes', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const res = await fetch(`/api/conversion-lab/leads/${leadId}/notes`)
      if (!res.ok) throw new Error('Failed to fetch notes')
      return res.json()
    },
  })
}

export function useAddNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ leadId, content }: { leadId: string; content: string }) => {
      const res = await fetch(`/api/conversion-lab/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to add note')
      return res.json()
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lead-notes', vars.leadId] })
      qc.invalidateQueries({ queryKey: ['lead-timeline', vars.leadId] })
    },
  })
}

// ====== Ghost Popups ======

export function useGhostPopups(siteId?: string) {
  return useQuery({
    queryKey: ['ghost-popups', siteId],
    queryFn: async () => {
      const url = siteId
        ? `/api/conversion-lab/ghost-popups?site_id=${siteId}`
        : '/api/conversion-lab/ghost-popups'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch popups')
      return res.json()
    },
  })
}

export function useCreatePopup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (popup: Record<string, any>) => {
      const res = await fetch('/api/conversion-lab/ghost-popups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(popup),
      })
      if (!res.ok) throw new Error('Failed to create popup')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ghost-popups'] }),
  })
}

export function useUpdatePopup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ popupId, updates }: { popupId: string; updates: Record<string, any> }) => {
      const res = await fetch(`/api/conversion-lab/ghost-popups/${popupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update popup')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ghost-popups'] }),
  })
}

export function useDeletePopup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (popupId: string) => {
      const res = await fetch(`/api/conversion-lab/ghost-popups/${popupId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete popup')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ghost-popups'] }),
  })
}
