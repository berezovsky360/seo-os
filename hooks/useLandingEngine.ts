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

// ====== Pages ======

export function useLandingPages(siteId: string | null) {
  return useQuery({
    queryKey: ['landing-pages', siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const res = await fetch(`/api/landing/sites/${siteId}/pages`)
      if (!res.ok) throw new Error('Failed to fetch pages')
      return res.json()
    },
  })
}

export function useLandingPage(siteId: string | null, pageId: string | null) {
  return useQuery({
    queryKey: ['landing-page', siteId, pageId],
    enabled: !!siteId && !!pageId,
    queryFn: async () => {
      const res = await fetch(`/api/landing/sites/${siteId}/pages/${pageId}`)
      if (!res.ok) throw new Error('Failed to fetch page')
      return res.json()
    },
  })
}

export function useCreateLandingPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ siteId, page }: { siteId: string; page: Record<string, any> }) => {
      const res = await fetch(`/api/landing/sites/${siteId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(page),
      })
      if (!res.ok) throw new Error('Failed to create page')
      return res.json()
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['landing-pages', vars.siteId] }),
  })
}

export function useUpdateLandingPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ siteId, pageId, updates }: { siteId: string; pageId: string; updates: Record<string, any> }) => {
      const res = await fetch(`/api/landing/sites/${siteId}/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update page')
      return res.json()
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['landing-pages', vars.siteId] })
      qc.invalidateQueries({ queryKey: ['landing-page', vars.siteId, vars.pageId] })
    },
  })
}

export function useDeleteLandingPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ siteId, pageId }: { siteId: string; pageId: string }) => {
      const res = await fetch(`/api/landing/sites/${siteId}/pages/${pageId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete page')
      return res.json()
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['landing-pages', vars.siteId] }),
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

// ====== Templates ======

export function useLandingTemplates() {
  return useQuery({
    queryKey: ['landing-templates'],
    queryFn: async () => {
      const res = await fetch('/api/landing/templates')
      if (!res.ok) throw new Error('Failed to fetch templates')
      return res.json()
    },
  })
}

export function useSeedTemplates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/landing/templates', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to seed templates')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landing-templates'] }),
  })
}

// ====== Media Upload ======

export function useUploadMedia() {
  return useMutation({
    mutationFn: async ({ siteId, file }: { siteId: string; file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/landing/sites/${siteId}/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error || 'Upload failed')
      }
      return res.json() as Promise<{ url: string; key: string; fileName: string; size: number; contentType: string }>
    },
  })
}

// ====== Lead Factory Forms (for embed picker) ======

export function useLeadForms(siteId?: string | null) {
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

// ====== Experiments ======

export function useExperiments(siteId: string | null) {
  return useQuery({
    queryKey: ['landing-experiments', siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const res = await fetch(`/api/landing/sites/${siteId}/experiments`)
      if (!res.ok) throw new Error('Failed to fetch experiments')
      return res.json()
    },
  })
}

export function useExperiment(siteId: string | null, experimentId: string | null) {
  return useQuery({
    queryKey: ['landing-experiment', siteId, experimentId],
    enabled: !!siteId && !!experimentId,
    queryFn: async () => {
      const res = await fetch(`/api/landing/sites/${siteId}/experiments/${experimentId}`)
      if (!res.ok) throw new Error('Failed to fetch experiment')
      return res.json()
    },
  })
}

export function useCreateExperiment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ siteId, experiment }: { siteId: string; experiment: Record<string, any> }) => {
      const res = await fetch(`/api/landing/sites/${siteId}/experiments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(experiment),
      })
      if (!res.ok) throw new Error('Failed to create experiment')
      return res.json()
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['landing-experiments', vars.siteId] }),
  })
}

export function useUpdateExperiment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ siteId, experimentId, updates }: { siteId: string; experimentId: string; updates: Record<string, any> }) => {
      const res = await fetch(`/api/landing/sites/${siteId}/experiments/${experimentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update experiment')
      return res.json()
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['landing-experiments', vars.siteId] })
      qc.invalidateQueries({ queryKey: ['landing-experiment', vars.siteId, vars.experimentId] })
    },
  })
}

export function useDeleteExperiment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ siteId, experimentId }: { siteId: string; experimentId: string }) => {
      const res = await fetch(`/api/landing/sites/${siteId}/experiments/${experimentId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete experiment')
      return res.json()
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['landing-experiments', vars.siteId] }),
  })
}

// ====== Experiment Variants ======

export function useExperimentVariants(siteId: string | null, experimentId: string | null) {
  return useQuery({
    queryKey: ['landing-variants', siteId, experimentId],
    enabled: !!siteId && !!experimentId,
    queryFn: async () => {
      const res = await fetch(`/api/landing/sites/${siteId}/experiments/${experimentId}/variants`)
      if (!res.ok) throw new Error('Failed to fetch variants')
      return res.json()
    },
  })
}

export function useCreateVariant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ siteId, experimentId, variant }: { siteId: string; experimentId: string; variant: Record<string, any> }) => {
      const res = await fetch(`/api/landing/sites/${siteId}/experiments/${experimentId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variant),
      })
      if (!res.ok) throw new Error('Failed to create variant')
      return res.json()
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['landing-variants', vars.siteId, vars.experimentId] }),
  })
}

export function useUpdateVariant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ siteId, experimentId, variantId, updates }: { siteId: string; experimentId: string; variantId: string; updates: Record<string, any> }) => {
      const res = await fetch(`/api/landing/sites/${siteId}/experiments/${experimentId}/variants/${variantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update variant')
      return res.json()
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['landing-variants', vars.siteId, vars.experimentId] }),
  })
}

export function useDeleteVariant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ siteId, experimentId, variantId }: { siteId: string; experimentId: string; variantId: string }) => {
      const res = await fetch(`/api/landing/sites/${siteId}/experiments/${experimentId}/variants/${variantId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete variant')
      return res.json()
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['landing-variants', vars.siteId, vars.experimentId] }),
  })
}

// ====== Experiment Stats ======

export function useExperimentStats(siteId: string | null, experimentId: string | null) {
  return useQuery({
    queryKey: ['landing-experiment-stats', siteId, experimentId],
    enabled: !!siteId && !!experimentId,
    refetchInterval: 60000,
    queryFn: async () => {
      const res = await fetch(`/api/landing/sites/${siteId}/experiments/${experimentId}/stats`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
  })
}

// ====== AI Page Generation ======

export function useAIGenerate() {
  return useMutation({
    mutationFn: async (params: {
      mode: 'reference' | 'prompt' | 'refine'
      prompt?: string
      referenceImages?: { data: string; mime: string }[]
      currentHtml?: string
      history?: { role: string; text: string }[]
    }) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120_000) // 2 min timeout

      try {
        const res = await fetch('/api/landing/ai-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: controller.signal,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Generation failed' }))
          throw new Error(err.error || 'Generation failed')
        }
        return res.json() as Promise<{ html: string; usage: any; estimated_cost: number; model?: string }>
      } catch (e: any) {
        if (e.name === 'AbortError') {
          throw new Error('Generation timed out after 2 minutes. Try with fewer images or a simpler prompt.')
        }
        throw e
      } finally {
        clearTimeout(timeout)
      }
    },
  })
}
