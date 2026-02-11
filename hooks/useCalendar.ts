'use client'

import { useQuery } from '@tanstack/react-query'

export interface CalendarPost {
  id: string
  rawId: string
  siteId: string
  title: string
  site: string
  favicon: string | null
  status: string
  seoScore: number
  date: string // YYYY-MM-DD
  source: 'posts' | 'articles'
}

async function fetchCalendarPosts(startDate: string, endDate: string): Promise<CalendarPost[]> {
  const res = await fetch(`/api/calendar?startDate=${startDate}&endDate=${endDate}`)
  if (!res.ok) throw new Error('Failed to fetch calendar posts')
  const data = await res.json()
  return data.posts
}

export function useCalendarPosts(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['calendar', startDate, endDate],
    queryFn: () => fetchCalendarPosts(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000,
  })
}
