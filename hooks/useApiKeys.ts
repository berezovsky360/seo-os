'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiKeyService } from '@/lib/services/apiKeyService'
import type { ApiKeyType } from '@/lib/core/events'

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiKeyService.getKeys(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSaveApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ keyType, value, label }: { keyType: ApiKeyType; value: string; label?: string }) =>
      apiKeyService.saveKey(keyType, value, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (keyType: ApiKeyType) => apiKeyService.deleteKey(keyType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}

export function useValidateApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (keyType: ApiKeyType) => apiKeyService.validateKey(keyType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}
