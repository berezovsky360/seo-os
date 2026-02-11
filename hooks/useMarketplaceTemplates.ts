'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface RecipeTemplate {
  id: string
  author_id: string | null
  author_name: string
  slug: string
  name: string
  description: string | null
  category: string
  tags: string[]
  icon: string
  trigger_event: string
  trigger_conditions: Record<string, any>
  actions: { module: string; action: string; params: Record<string, any> }[]
  graph_layout: any | null
  required_modules: string[]
  install_count: number
  is_official: boolean
  is_public: boolean
  featured: boolean
  created_at: string
  updated_at: string
}

interface TemplateFilters {
  category?: string
  search?: string
  sort?: 'popular' | 'newest' | 'featured'
}

// ====== Browse templates ======

export function useMarketplaceTemplates(filters: TemplateFilters = {}) {
  return useQuery({
    queryKey: ['marketplace-templates', filters],
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (filters.category) sp.set('category', filters.category)
      if (filters.search) sp.set('search', filters.search)
      if (filters.sort) sp.set('sort', filters.sort)
      const res = await fetch(`/api/marketplace/templates?${sp}`)
      if (!res.ok) throw new Error('Failed to fetch templates')
      const data = await res.json()
      return (data.templates || []) as RecipeTemplate[]
    },
  })
}

// ====== Install template → clone to user's recipes ======

export function useInstallTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`/api/marketplace/templates/${slug}/install`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to install template')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] })
      qc.invalidateQueries({ queryKey: ['marketplace-templates'] })
    },
  })
}

// ====== Publish own recipe to marketplace ======

export function usePublishTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (template: {
      name: string
      description?: string
      category?: string
      tags?: string[]
      icon?: string
      trigger_event: string
      trigger_conditions?: Record<string, any>
      actions: any[]
      graph_layout?: any
      required_modules?: string[]
    }) => {
      const res = await fetch('/api/marketplace/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to publish template')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace-templates'] })
    },
  })
}

// ====== Import recipe from JSON ======

export function useImportTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recipeJson: {
      name: string
      description?: string
      trigger_event: string
      trigger_conditions?: Record<string, any>
      actions: { module: string; action: string; params?: Record<string, any> }[]
      graph_layout?: any
    }) => {
      const res = await fetch('/api/marketplace/templates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeJson),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to import recipe')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

// ====== Module install stats ======

export function useModuleStats() {
  return useQuery({
    queryKey: ['module-stats'],
    queryFn: async () => {
      const res = await fetch('/api/marketplace/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      return (data.stats || {}) as Record<string, { install_count: number; last_installed_at: string | null }>
    },
    staleTime: 60 * 1000,
  })
}
