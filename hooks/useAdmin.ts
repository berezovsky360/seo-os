'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/contexts/AuthContext'

export interface AdminUser {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  role: string
  display_name: string | null
  avatar_emoji: string | null
  sites_count: number
  last_login: {
    at: string
    ip: string
    device: string
    location: string | null
  } | null
}

export interface AdminStats {
  total_users: number
  active_users_7d: number
  active_users_30d: number
  total_sites: number
  total_articles: number
  total_posts: number
  total_content_items: number
  total_swipes: number
  avg_sites_per_user: number
  signups_per_week: { week: string; count: number }[]
}

export interface AdminActivity {
  id: string
  user_id: string
  logged_in_at: string
  ip_address: string
  device_label: string
  status: string
  country: string | null
  city: string | null
  user_email: string | null
  user_display_name: string | null
  user_role: string
}

export function useAdminUsers() {
  const { userRole } = useAuth()
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      return data.users || []
    },
    staleTime: 30 * 1000,
    enabled: userRole === 'super_admin',
  })
}

export function useAdminStats() {
  const { userRole } = useAuth()
  return useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      return data.stats
    },
    staleTime: 60 * 1000,
    enabled: userRole === 'super_admin',
  })
}

export function useAdminActivity(page = 0) {
  const { userRole } = useAuth()
  return useQuery<AdminActivity[]>({
    queryKey: ['admin', 'activity', page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/activity?offset=${page * 50}&limit=50`)
      if (!res.ok) throw new Error('Failed to fetch activity')
      const data = await res.json()
      return data.activity || []
    },
    enabled: userRole === 'super_admin',
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update role')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}
