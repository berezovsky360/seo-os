'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { postService, type PostRecord } from '@/lib/services/postService'
import type { Post } from '@/types'

export function usePosts(siteId: string) {
  return useQuery({
    queryKey: ['posts', siteId],
    queryFn: () => postService.getPostsBySite(siteId),
    enabled: !!siteId,
  })
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: ['posts', postId],
    queryFn: () => postService.getPostById(postId),
    enabled: !!postId,
  })
}

export function useSyncPosts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      siteId,
      wpUrl,
      wpUsername,
      wpAppPassword,
    }: {
      siteId: string
      wpUrl: string
      wpUsername: string
      wpAppPassword: string
    }) => postService.syncPostsFromWordPress(siteId, wpUrl, wpUsername, wpAppPassword),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts', variables.siteId] })
    },
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (post: {
      site_id: string
      title: string
      content: string
      status?: 'draft' | 'publish' | 'pending' | 'private'
      seo_title?: string
      seo_description?: string
      focus_keyword?: string
    }) => postService.createPost(post),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['posts', data.site_id] })
    },
  })
}

export function useUpdatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, updates }: { postId: string; updates: Partial<PostRecord> }) =>
      postService.updatePost(postId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['posts', data.site_id] })
      queryClient.invalidateQueries({ queryKey: ['posts', data.id] })
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: string) => postService.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

export function usePublishToWordPress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      postId,
      wpUrl,
      wpUsername,
      wpAppPassword,
    }: {
      postId: string
      wpUrl: string
      wpUsername: string
      wpAppPassword: string
    }) => postService.publishToWordPress(postId, wpUrl, wpUsername, wpAppPassword),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts', variables.postId] })
    },
  })
}
