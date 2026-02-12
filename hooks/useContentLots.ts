import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ContentItem } from '@/lib/modules/content-engine/types'

export interface SwipeableItem extends ContentItem {
  feed_name: string | null
}

export interface SwipeFilter {
  feedIds?: string[]
  sort?: 'score' | 'newest' | 'oldest' | 'random'
}

export function useSwipeableItems(filter?: SwipeFilter) {
  return useQuery<SwipeableItem[]>({
    queryKey: ['content-lots', filter?.feedIds, filter?.sort],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20' })
      if (filter?.feedIds && filter.feedIds.length > 0) {
        params.set('feed_ids', filter.feedIds.join(','))
      }
      if (filter?.sort) {
        params.set('sort', filter.sort)
      }
      const res = await fetch(`/api/content-engine/swipe?${params}`)
      if (!res.ok) throw new Error('Failed to fetch swipeable items')
      const data = await res.json()
      return data.items || []
    },
  })
}

export function useSwipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ item_id, direction }: { item_id: string; direction: 'left' | 'right' | 'up' }) => {
      const res = await fetch('/api/content-engine/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id, direction }),
      })
      if (!res.ok) throw new Error('Failed to record swipe')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-lots'] })
      queryClient.invalidateQueries({ queryKey: ['content-items'] })
    },
  })
}

export function useUndoSwipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/content-engine/swipe', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to undo swipe')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-lots'] })
      queryClient.invalidateQueries({ queryKey: ['content-items'] })
      queryClient.invalidateQueries({ queryKey: ['swipe-decisions'] })
    },
  })
}

// ====== Decisions ======

export interface SwipeDecision {
  id: string
  item_id: string
  direction: 'left' | 'right' | 'up'
  created_at: string
  item_title: string
  item_url: string | null
  item_content: string | null
  item_image_url: string | null
  item_score: number | null
  item_published_at: string | null
  item_status: string | null
  feed_id: string | null
  feed_name: string
}

export interface DecisionsByFeed {
  feed_id: string
  feed_name: string
  decisions: SwipeDecision[]
}

export function useSwipeDecisions(direction?: 'left' | 'right' | 'up') {
  return useQuery<{ decisions: SwipeDecision[]; feeds: DecisionsByFeed[]; total: number }>({
    queryKey: ['swipe-decisions', direction],
    queryFn: async () => {
      const url = direction
        ? `/api/content-engine/swipe/decisions?direction=${direction}`
        : '/api/content-engine/swipe/decisions'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch decisions')
      return res.json()
    },
  })
}

export function useUpdateSwipeDirection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ decision_id, new_direction }: { decision_id: string; new_direction: 'left' | 'right' | 'up' }) => {
      const res = await fetch('/api/content-engine/swipe/decisions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision_id, new_direction }),
      })
      if (!res.ok) throw new Error('Failed to update decision')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swipe-decisions'] })
      queryClient.invalidateQueries({ queryKey: ['content-lots'] })
      queryClient.invalidateQueries({ queryKey: ['content-items'] })
    },
  })
}
