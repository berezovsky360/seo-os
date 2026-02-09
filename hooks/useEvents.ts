'use client'

import { useQuery } from '@tanstack/react-query'
import { coreService } from '@/lib/services/coreService'

export function useEvents(params?: {
  site_id?: string
  event_type?: string
  severity?: string
  limit?: number
}) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => coreService.getEvents(params),
    staleTime: 30 * 1000, // 30 seconds (events change frequently)
    refetchInterval: 60 * 1000, // Refetch every minute as fallback
  })
}

export function usePreferences() {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: () => coreService.getPreferences(),
    staleTime: 5 * 60 * 1000,
  })
}
