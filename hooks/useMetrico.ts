// Metrico — React Query hooks

'use client'

import { useQuery } from '@tanstack/react-query'

export function useMetricoStats() {
  return useQuery({
    queryKey: ['metrico-stats'],
    queryFn: async () => {
      const res = await fetch('/api/metrico/stats')
      if (!res.ok) throw new Error('Failed to fetch Metrico stats')
      return res.json()
    },
    refetchInterval: 60_000, // auto-refresh every 60s
  })
}
