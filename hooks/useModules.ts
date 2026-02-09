'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { moduleService } from '@/lib/services/moduleService'
import type { ModuleId } from '@/lib/core/events'

export function useModules() {
  return useQuery({
    queryKey: ['modules'],
    queryFn: () => moduleService.getModules(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useToggleModule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ moduleId, enabled }: { moduleId: ModuleId; enabled: boolean }) =>
      moduleService.toggleModule(moduleId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'], refetchType: 'all' })
    },
  })
}

export function useBatchToggleModules() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (modules: { module_id: ModuleId; enabled: boolean }[]) =>
      moduleService.batchToggle(modules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] })
    },
  })
}
