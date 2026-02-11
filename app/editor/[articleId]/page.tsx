'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { use } from 'react'
import ArticleEditor from '@/components/ArticleEditor'
import { useArticleActions } from '@/hooks/useArticleActions'
import { Loader2 } from 'lucide-react'

export default function EditorPage({ params }: { params: Promise<{ articleId: string }> }) {
  const { articleId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const siteId = searchParams.get('siteId') || ''
  const source = searchParams.get('source') || 'generated' // 'wordpress' | 'generated'
  const isWPPost = source === 'wordpress'

  const [article, setArticle] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Navigate back to the site page (not browser history)
  const goBackToSite = () => {
    if (siteId) {
      router.push(`/?view=site-details&siteId=${siteId}`)
    } else {
      router.push('/')
    }
  }

  const { saveArticle, publishArticle, analyzeArticle } = useArticleActions(siteId)

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const url = isWPPost
          ? `/api/posts/${articleId}`
          : `/api/articles/${articleId}`

        const res = await fetch(url)
        if (!res.ok) throw new Error('Article not found')

        const data = await res.json()
        // Unwrap: API returns { article: {...} } or { post: {...} }
        const unwrapped = isWPPost ? data.post : data.article
        setArticle(unwrapped || data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load article')
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [articleId, isWPPost])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F5F5F7]">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 size={24} className="animate-spin" />
          <span className="text-lg font-medium">Loading editor...</span>
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F5F5F7]">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900 mb-2">Could not load article</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => goBackToSite()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <ArticleEditor
      article={article as any}
      isPage={true}
      onClose={() => goBackToSite()}
      onSave={async (updates) => {
        await saveArticle(articleId, updates, isWPPost)
        setArticle(prev => prev ? { ...prev, ...updates } : prev)
      }}
      onPublish={(categoryIds, tagIds) =>
        publishArticle(articleId, categoryIds, tagIds, isWPPost)
      }
      onAnalyze={() => analyzeArticle(article)}
      isWPPost={isWPPost}
    />
  )
}
