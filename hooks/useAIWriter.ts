'use client'

import { useMutation } from '@tanstack/react-query'

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
