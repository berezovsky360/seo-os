'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

export interface ImagePromptResult {
  prompt: string
  post_title: string
  focus_keyword: string | null
}

export interface GeneratedImageResult {
  image_base64: string
  mime_type: string
}

export interface SeoDescriptionResult {
  alt_text: string
  caption: string
  title: string
}

export interface PushToWpResult {
  media_id: number
  media_url: string
  wp_post_id: number
}

export interface FullPipelineResult {
  prompt: string
  image_base64: string
  mime_type: string
  alt_text: string
  caption: string
  media_title: string
  media_id: number
  media_url: string
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

export function useGenerateImagePrompt() {
  return useMutation({
    mutationFn: (data: { site_id: string; post_id: string }) =>
      apiFetch<ImagePromptResult>('/api/nana-banana/generate-prompt', data),
  })
}

export function useGenerateImage() {
  return useMutation({
    mutationFn: (data: { prompt: string; aspect_ratio?: string }) =>
      apiFetch<GeneratedImageResult>('/api/nana-banana/generate-image', data),
  })
}

export function useAnalyzeImage() {
  return useMutation({
    mutationFn: (data: { image_base64: string; article_title: string; focus_keyword?: string }) =>
      apiFetch<SeoDescriptionResult>('/api/nana-banana/analyze-image', data),
  })
}

export function usePushToWordPress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      site_id: string; wp_post_id: number; image_base64: string;
      alt_text: string; caption?: string; title?: string
    }) => apiFetch<PushToWpResult>('/api/nana-banana/push-to-wp', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts', variables.site_id] })
    },
  })
}

export function useRunFullPipeline() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { site_id: string; post_id: string; aspect_ratio?: string }) =>
      apiFetch<FullPipelineResult>('/api/nana-banana/pipeline', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts', variables.site_id] })
    },
  })
}
