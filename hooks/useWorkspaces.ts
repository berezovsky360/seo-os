'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workspaceService } from '@/lib/services/workspaceService'
import type { Workspace } from '@/types'

export function useWorkspaces() {
  return useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: () => workspaceService.getAll(),
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ws: { name: string; emoji?: string }) => workspaceService.create(ws),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useRenameWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name, emoji }: { id: string; name?: string; emoji?: string }) =>
      workspaceService.update(id, { name, emoji }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workspaceService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export function useMoveSiteToWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ siteId, workspaceId }: { siteId: string; workspaceId: string }) =>
      workspaceService.moveSite(siteId, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}
