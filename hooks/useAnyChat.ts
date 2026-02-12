'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ChatChannel, ChatMessage, ChatNotificationRule } from '@/types'

// ====== Channels ======

export function useChannels() {
  return useQuery({
    queryKey: ['chat-channels'],
    queryFn: async (): Promise<ChatChannel[]> => {
      const res = await fetch('/api/chat/channels')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data.channels
    },
    staleTime: 60_000,
  })
}

export function useDeleteChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (channelId: string) => {
      const res = await fetch(`/api/chat/channels/${channelId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-channels'] })
      qc.invalidateQueries({ queryKey: ['chat-rules'] })
    },
  })
}

export function useUpdateChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ channelId, ...updates }: { channelId: string; channel_name?: string; is_active?: boolean }) => {
      const res = await fetch(`/api/chat/channels/${channelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data.channel
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-channels'] })
    },
  })
}

// ====== Connect Telegram ======

export function useConnectTelegram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { mode: 'personal'; bot_token: string } | { mode: 'shared' }) => {
      const res = await fetch('/api/chat/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data as {
        channel: ChatChannel
        bot_username: string
        bot_name: string
        link_code?: string
        mode: 'personal' | 'shared'
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-channels'] })
    },
  })
}

// ====== Messages ======

export function useMessages(channelId?: string) {
  return useQuery({
    queryKey: ['chat-messages', channelId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const params = new URLSearchParams()
      if (channelId) params.set('channel_id', channelId)
      params.set('limit', '100')
      const res = await fetch(`/api/chat/messages?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data.messages
    },
    staleTime: 10_000,
    refetchInterval: 15_000, // Poll for new messages
  })
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ channel_id, text }: { channel_id: string; text: string }) => {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id, text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data.message as ChatMessage
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['chat-messages', vars.channel_id] })
    },
  })
}

// ====== Notification Rules ======

export function useNotificationRules() {
  return useQuery({
    queryKey: ['chat-rules'],
    queryFn: async (): Promise<(ChatNotificationRule & { chat_channels?: { id: string; channel_name: string; platform: string } })[]> => {
      const res = await fetch('/api/chat/rules')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data.rules
    },
    staleTime: 60_000,
  })
}

export function useCreateRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { channel_id: string; event_pattern: string; site_id?: string; template?: string }) => {
      const res = await fetch('/api/chat/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data.rule
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-rules'] })
    },
  })
}

export function useUpdateRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ruleId, ...updates }: { ruleId: string; event_pattern?: string; enabled?: boolean; site_id?: string; template?: string; channel_id?: string }) => {
      const res = await fetch(`/api/chat/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data.rule
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-rules'] })
    },
  })
}

export function useDeleteRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await fetch(`/api/chat/rules/${ruleId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-rules'] })
    },
  })
}
