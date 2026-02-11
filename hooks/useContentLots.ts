import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ContentItem } from '@/lib/modules/content-engine/types'

export interface SwipeableItem extends ContentItem {
  feed_name: string | null
}

export function useSwipeableItems() {
  return useQuery<SwipeableItem[]>({
    queryKey: ['content-lots'],
    queryFn: async () => {
      const res = await fetch('/api/content-engine/swipe?limit=20')
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
    },
  })
}
