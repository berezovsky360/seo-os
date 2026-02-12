'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { siteService, type SiteRecord } from '@/lib/services/siteService'
import type { Site } from '@/types'

export function useSites(workspaceId?: string) {
  return useQuery({
    queryKey: ['sites', { workspaceId }],
    queryFn: () => siteService.getAllSites(workspaceId),
  })
}

export function useSite(siteId: string) {
  return useQuery({
    queryKey: ['sites', siteId],
    queryFn: () => siteService.getSiteById(siteId),
    enabled: !!siteId,
  })
}

export function useCreateSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (site: {
      name: string
      url: string
      theme?: string
      wp_username?: string
      wp_app_password?: string
      is_competitor?: boolean
      workspace_id?: string
    }) => siteService.createSite(site),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export function useUpdateSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ siteId, updates }: { siteId: string; updates: Partial<SiteRecord> }) =>
      siteService.updateSite(siteId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      queryClient.invalidateQueries({ queryKey: ['sites', variables.siteId] })
    },
  })
}

export function usePatchSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ siteId, updates }: { siteId: string; updates: Partial<SiteRecord> }) =>
      siteService.patchSite(siteId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      queryClient.invalidateQueries({ queryKey: ['sites', variables.siteId] })
    },
  })
}

export function useDeleteSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (siteId: string) => siteService.deleteSite(siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}
