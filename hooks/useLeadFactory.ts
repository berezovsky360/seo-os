// Lead Factory — React Query hooks

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ====== Forms ======

export function useLeadForms(siteId?: string) {
  return useQuery({
    queryKey: ['lead-forms', siteId],
    queryFn: async () => {
      const url = siteId
        ? `/api/lead-factory/forms?site_id=${siteId}`
        : '/api/lead-factory/forms'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch forms')
      return res.json()
    },
  })
}

export function useCreateForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (form: Record<string, any>) => {
      const res = await fetch('/api/lead-factory/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to create form')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-forms'] }),
  })
}

export function useUpdateForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ formId, updates }: { formId: string; updates: Record<string, any> }) => {
      const res = await fetch(`/api/lead-factory/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update form')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-forms'] }),
  })
}

export function useDeleteForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formId: string) => {
      const res = await fetch(`/api/lead-factory/forms/${formId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete form')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-forms'] }),
  })
}

// ====== Magnets ======

export function useLeadMagnets(siteId?: string) {
  return useQuery({
    queryKey: ['lead-magnets', siteId],
    queryFn: async () => {
      const url = siteId
        ? `/api/lead-factory/magnets?site_id=${siteId}`
        : '/api/lead-factory/magnets'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch magnets')
      return res.json()
    },
  })
}

export function useCreateMagnet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (magnet: Record<string, any>) => {
      const res = await fetch('/api/lead-factory/magnets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(magnet),
      })
      if (!res.ok) throw new Error('Failed to create magnet')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-magnets'] }),
  })
}

export function useUpdateMagnet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ magnetId, updates }: { magnetId: string; updates: Record<string, any> }) => {
      const res = await fetch(`/api/lead-factory/magnets/${magnetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update magnet')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-magnets'] }),
  })
}

export function useDeleteMagnet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (magnetId: string) => {
      const res = await fetch(`/api/lead-factory/magnets/${magnetId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete magnet')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-magnets'] }),
  })
}

// ====== Stats ======

export function useLeadStats(siteId?: string) {
  return useQuery({
    queryKey: ['lead-stats', siteId],
    queryFn: async () => {
      const url = siteId
        ? `/api/lead-factory/stats?site_id=${siteId}`
        : '/api/lead-factory/stats'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
  })
}
