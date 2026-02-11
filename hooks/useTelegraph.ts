import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface TelegraphAccountRecord {
  id: string
  short_name: string
  author_name: string | null
  author_url: string | null
  page_count: number
  created_at: string
}

export interface TelegraphPageRecord {
  id: string
  account_id: string
  site_id: string | null
  path: string
  url: string
  title: string
  source_article_id: string | null
  source_item_id: string | null
  views: number
  last_views_check: string | null
  created_at: string
  updated_at: string
  telegraph_accounts?: { short_name: string } | null
}

export function useTelegraphAccounts() {
  return useQuery<TelegraphAccountRecord[]>({
    queryKey: ['telegraph-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/telegraph/accounts')
      if (!res.ok) throw new Error('Failed to fetch accounts')
      const data = await res.json()
      return data.accounts || []
    },
  })
}

export function useCreateTelegraphAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { short_name: string; author_name?: string; author_url?: string }) => {
      const res = await fetch('/api/telegraph/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create account')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegraph-accounts'] })
    },
  })
}

export function useTelegraphPages() {
  return useQuery<TelegraphPageRecord[]>({
    queryKey: ['telegraph-pages'],
    queryFn: async () => {
      const res = await fetch('/api/telegraph/pages')
      if (!res.ok) throw new Error('Failed to fetch pages')
      const data = await res.json()
      return data.pages || []
    },
  })
}

export function usePublishToTelegraph() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      account_id: string
      title: string
      html_content: string
      site_id?: string
      source_article_id?: string
      source_item_id?: string
    }) => {
      const res = await fetch('/api/telegraph/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to publish')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegraph-pages'] })
      queryClient.invalidateQueries({ queryKey: ['telegraph-accounts'] })
    },
  })
}

export function useRefreshTelegraphViews() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/telegraph/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Failed to refresh views')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegraph-pages'] })
    },
  })
}
