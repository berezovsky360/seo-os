'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { articleService, type ArticleRecord } from '@/lib/services/articleService'

export function useArticles(siteId: string) {
  return useQuery({
    queryKey: ['articles', siteId],
    queryFn: () => articleService.getArticlesBySite(siteId),
    enabled: !!siteId,
  })
}

export function useAllArticles() {
  return useQuery({
    queryKey: ['articles', 'all'],
    queryFn: () => articleService.getAllArticles(),
  })
}

export function useArticle(articleId: string) {
  return useQuery({
    queryKey: ['articles', articleId],
    queryFn: () => articleService.getArticleById(articleId),
    enabled: !!articleId,
  })
}

export function useCreateArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (article: {
      site_id: string
      keyword?: string
      title?: string
      seo_title?: string
      seo_description?: string
      content?: string
      word_count?: number
    }) => articleService.createArticle(article),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['articles', variables.site_id] })
    },
  })
}

export function useUpdateArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ articleId, updates }: { articleId: string; updates: Partial<ArticleRecord> }) =>
      articleService.updateArticle(articleId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['articles', data.site_id] })
      queryClient.invalidateQueries({ queryKey: ['articles', data.id] })
    },
  })
}

export function useDeleteArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (articleId: string) => articleService.deleteArticle(articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}

export function useMarkAsPublished() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ articleId, wpPostId }: { articleId: string; wpPostId: number }) =>
      articleService.markAsPublished(articleId, wpPostId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['articles', data.site_id] })
      queryClient.invalidateQueries({ queryKey: ['articles', data.id] })
    },
  })
}

export function usePublishArticleToWordPress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      articleId,
      wpUrl,
      wpUsername,
      wpAppPassword,
    }: {
      articleId: string
      wpUrl: string
      wpUsername: string
      wpAppPassword: string
    }) => articleService.publishToWordPress(articleId, wpUrl, wpUsername, wpAppPassword),
    onSuccess: () => {
      // Invalidate both articles and posts queries to show updated data
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}
