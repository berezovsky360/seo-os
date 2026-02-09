'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { keywordService } from '@/lib/services/keywordService'

export function useKeywords(siteId: string) {
  return useQuery({
    queryKey: ['keywords', siteId],
    queryFn: () => keywordService.getKeywordsBySite(siteId),
    enabled: !!siteId,
  })
}

export function useCreateKeyword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (keyword: {
      site_id: string
      keyword: string
      language?: string
      location_code?: number
    }) => keywordService.createKeyword(keyword),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['keywords', variables.site_id] })
    },
  })
}

export function useUpdateKeywordPosition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ keywordId, position }: { keywordId: string; position: number }) =>
      keywordService.updateKeywordPosition(keywordId, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] })
    },
  })
}

export function useDeleteKeyword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (keywordId: string) => keywordService.deleteKeyword(keywordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] })
    },
  })
}
