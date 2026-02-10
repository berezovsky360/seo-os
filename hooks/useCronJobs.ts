'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface CronJob {
  id: string
  user_id: string
  site_id: string | null
  name: string
  cron_expression: string
  recipe_id: string | null
  enabled: boolean
  timezone: string
  last_run_at: string | null
  next_run_at: string | null
  run_count: number
  last_run_status: string
  last_run_error: string | null
  created_at: string
  updated_at: string
  // Joined
  recipes?: { id: string; name: string } | null
}

async function fetchCronJobs(): Promise<CronJob[]> {
  const res = await fetch('/api/cron')
  if (!res.ok) throw new Error('Failed to fetch cron jobs')
  const data = await res.json()
  return data.jobs || []
}

async function createCronJob(job: {
  name: string
  cron_expression: string
  recipe_id?: string
  site_id?: string
  timezone?: string
}): Promise<CronJob> {
  const res = await fetch('/api/cron', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(job),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create cron job')
  }
  return res.json()
}

async function updateCronJob({ cronId, updates }: { cronId: string; updates: Partial<CronJob> }): Promise<CronJob> {
  const res = await fetch(`/api/cron/${cronId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update cron job')
  }
  return res.json()
}

async function deleteCronJob(cronId: string): Promise<void> {
  const res = await fetch(`/api/cron/${cronId}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete cron job')
  }
}

export function useCronJobs() {
  return useQuery({
    queryKey: ['cron-jobs'],
    queryFn: fetchCronJobs,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateCronJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCronJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] })
    },
  })
}

export function useUpdateCronJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateCronJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] })
    },
  })
}

export function useDeleteCronJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCronJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] })
    },
  })
}
