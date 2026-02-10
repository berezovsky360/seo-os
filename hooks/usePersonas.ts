'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PersonaDB, PersonaDocument } from '@/types'

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Request failed: ${res.statusText}`)
  }
  return res.json()
}

// ====== Personas ======

export function usePersonas() {
  return useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const data = await apiFetch<{ personas: PersonaDB[] }>('/api/personas')
      return data.personas
    },
  })
}

export function useCreatePersona() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      role?: string
      avatar_url?: string
      system_prompt?: string
      writing_style?: string
      active?: boolean
      is_default?: boolean
    }) => apiFetch<{ persona: PersonaDB }>('/api/personas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] })
    },
  })
}

export function useUpdatePersona() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ personaId, ...data }: {
      personaId: string
      name?: string
      role?: string
      avatar_url?: string
      system_prompt?: string
      writing_style?: string
      active?: boolean
      is_default?: boolean
    }) => apiFetch<{ persona: PersonaDB }>(`/api/personas/${personaId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] })
    },
  })
}

export function useDeletePersona() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (personaId: string) =>
      apiFetch<{ success: boolean }>(`/api/personas/${personaId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] })
    },
  })
}

// ====== Persona Documents ======

export function usePersonaDocuments(personaId: string | null) {
  return useQuery({
    queryKey: ['persona-documents', personaId],
    queryFn: async () => {
      const data = await apiFetch<{ documents: PersonaDocument[] }>(
        `/api/personas/${personaId}/documents`
      )
      return data.documents
    },
    enabled: !!personaId,
  })
}

export function useUploadPersonaDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ personaId, file }: { personaId: string; file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/personas/${personaId}/documents`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }
      return res.json() as Promise<{ document: PersonaDocument }>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['persona-documents', variables.personaId] })
    },
  })
}

export function useDeletePersonaDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ personaId, documentId }: { personaId: string; documentId: string }) =>
      apiFetch<{ success: boolean }>(`/api/personas/${personaId}/documents/${documentId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['persona-documents', variables.personaId] })
    },
  })
}

export function useProcessDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { document_id: string }) =>
      apiFetch<{ success: boolean; chunk_count: number }>('/api/personas/process-document', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persona-documents'] })
    },
  })
}
