'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/lib/contexts/ToastContext'

export function useArticleActions(siteId: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const saveArticle = async (
    articleId: string,
    updates: Record<string, any>,
    isWPPost: boolean
  ) => {
    const apiUrl = isWPPost
      ? `/api/posts/${articleId}`
      : `/api/articles/${articleId}`

    const res = await fetch(apiUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to save')
    }

    queryClient.invalidateQueries({ queryKey: ['articles'] })
    queryClient.invalidateQueries({ queryKey: ['posts'] })
    showToast('Changes saved successfully', 'success')
    return res.json()
  }

  const publishArticle = async (
    articleId: string,
    categoryIds: number[],
    tagIds: number[],
    isWPPost: boolean
  ) => {
    // Create version backup (non-blocking)
    fetch(`/api/articles/${articleId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: isWPPost ? 'wp_post' : 'article',
        source_id: articleId,
      }),
    }).catch(() => {})

    const apiUrl = isWPPost
      ? `/api/posts/${articleId}/publish`
      : `/api/articles/${articleId}/publish`

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, categoryIds, tagIds }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Publish failed')
    }

    queryClient.invalidateQueries({ queryKey: ['articles'] })
    queryClient.invalidateQueries({ queryKey: ['posts'] })

    const action = data.isUpdate ? 'updated on' : 'published to'
    showToast(`Article ${action} WordPress`, 'success')
    return data
  }

  const analyzeArticle = async (article: Record<string, any>) => {
    const res = await fetch(`/api/articles/${article.id}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: article.keyword || '',
        content: article.content || '',
        word_count: article.word_count || 0,
        readability_score: article.readability_score || 0,
        images_count: article.images_count || 0,
        images_with_alt: article.images_with_alt || 0,
        internal_links_count: article.internal_links_count || 0,
        external_links_count: article.external_links_count || 0,
        seo_title: article.seo_title || '',
        seo_description: article.seo_description || '',
      }),
    })

    if (!res.ok) {
      throw new Error('Analysis failed')
    }

    return res.json()
  }

  return { saveArticle, publishArticle, analyzeArticle }
}
