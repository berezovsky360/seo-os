'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface TitleGenerationResult {
  titles: string[]
  selected: string
}

export interface DescriptionGenerationResult {
  descriptions: string[]
  selected: string
}

export interface ContentGenerationResult {
  title: string
  seo_title: string
  meta_description: string
  focus_keywords: string[]
  content: string
}

async function apiFetch<T>(url: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Request failed: ${res.statusText}`)
  }
  return res.json()
}

export function useGenerateTitle() {
  return useMutation({
    mutationFn: (data: {
      post_id: string
      site_id: string
      persona_id?: string
      keyword?: string
      tone?: string
    }) => apiFetch<TitleGenerationResult>('/api/ai-writer/generate-title', data),
  })
}

export function useGenerateDescription() {
  return useMutation({
    mutationFn: (data: {
      post_id: string
      site_id: string
      persona_id?: string
      keyword?: string
      tone?: string
    }) => apiFetch<DescriptionGenerationResult>('/api/ai-writer/generate-description', data),
  })
}

export function useGenerateContent() {
  return useMutation({
    mutationFn: (data: {
      topic: string
      persona_id?: string
      site_id?: string
      writing_style?: string
    }) => apiFetch<ContentGenerationResult>('/api/ai-writer/generate-content', data),
  })
}

// ====== Settings & Usage Hooks ======

export interface AIUsageEntry {
  id: string
  action: string
  model: string
  prompt_tokens: number
  output_tokens: number
  total_tokens: number
  estimated_cost: number
  created_at: string
}

export interface AIUsageStats {
  period: string
  total_requests: number
  total_tokens: number
  total_cost: number
  model_breakdown: Record<string, { requests: number; tokens: number; cost: number }>
  recent: AIUsageEntry[]
}

export function useAIWriterSettings() {
  return useQuery({
    queryKey: ['ai-writer-settings'],
    queryFn: async () => {
      const res = await fetch('/api/modules')
      if (!res.ok) return { model: 'gemini-2.5-flash' }
      const data = await res.json()
      const aiWriter = data.modules?.find((m: any) => m.id === 'ai-writer')
      return (aiWriter?.settings || { model: 'gemini-2.5-flash' }) as Record<string, any>
    },
    staleTime: 60 * 1000,
  })
}

export function useUpdateAIWriterModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ model }: { model: string }) => {
      const res = await fetch('/api/modules/ai-writer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { model } }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update model')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-writer-settings'] })
    },
  })
}

export function useAIUsageStats(period: string = '30d') {
  return useQuery({
    queryKey: ['ai-usage-stats', period],
    queryFn: async () => {
      const res = await fetch(`/api/ai-writer/usage?period=${period}`)
      if (!res.ok) throw new Error('Failed to fetch usage stats')
      return res.json() as Promise<AIUsageStats>
    },
    staleTime: 30 * 1000,
  })
}

export function useTestAIWriter() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai-writer/test', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Test failed')
      }
      return res.json() as Promise<{ success: boolean; message: string; model: string; response: string }>
    },
  })
}
