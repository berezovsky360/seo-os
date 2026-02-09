'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Info } from 'lucide-react'

interface SEOMetaEditorProps {
  article: {
    keyword?: string | null
    seo_title?: string | null
    seo_description?: string | null
    additional_keywords?: string[] | null
    canonical_url?: string | null
    robots_meta?: string | null
    [key: string]: any
  }
  onChange: (field: string, value: any) => void
}

export default function SEOMetaEditor({ article, onChange }: SEOMetaEditorProps) {
  const [focusKeyword, setFocusKeyword] = useState(article.keyword || '')
  const [seoTitle, setSeoTitle] = useState(article.seo_title || '')
  const [seoDescription, setSeoDescription] = useState(article.seo_description || '')
  const [additionalKeywords, setAdditionalKeywords] = useState(
    article.additional_keywords?.join(', ') || ''
  )
  const [canonicalUrl, setCanonicalUrl] = useState(article.canonical_url || '')
  const [robotsMeta, setRobotsMeta] = useState(article.robots_meta || 'index,follow')

  const titleLength = seoTitle.length
  const descLength = seoDescription.length

  // Character count status helpers
  const getTitleStatus = () => {
    if (titleLength >= 50 && titleLength <= 60) return 'excellent'
    if (titleLength > 60 && titleLength <= 70) return 'warning'
    if (titleLength > 70) return 'error'
    if (titleLength > 0) return 'warning'
    return 'empty'
  }

  const getDescStatus = () => {
    if (descLength >= 150 && descLength <= 160) return 'excellent'
    if (descLength > 160 && descLength <= 170) return 'warning'
    if (descLength > 170) return 'error'
    if (descLength > 0) return 'warning'
    return 'empty'
  }

  const titleStatus = getTitleStatus()
  const descStatus = getDescStatus()

  return (
    <div className="space-y-6">
      {/* Focus Keyword */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Focus Keyword
          <span className="text-rose-500 ml-1">*</span>
        </label>
        <input
          type="text"
          value={focusKeyword}
          onChange={(e) => {
            setFocusKeyword(e.target.value)
            onChange('keyword', e.target.value)
          }}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          placeholder="e.g., seo optimization"
        />
        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
          <Info size={12} />
          Main keyword this article should rank for
        </p>
      </div>

      {/* SEO Title */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          SEO Title
          <span className="text-rose-500 ml-1">*</span>
        </label>
        <input
          type="text"
          value={seoTitle}
          onChange={(e) => {
            setSeoTitle(e.target.value)
            onChange('seo_title', e.target.value)
          }}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          placeholder="Optimized title for search engines (50-60 characters)"
        />
        <div className="flex items-center justify-between mt-2">
          <span
            className={`text-xs font-medium ${
              titleStatus === 'excellent'
                ? 'text-emerald-600'
                : titleStatus === 'error'
                ? 'text-rose-600'
                : titleStatus === 'warning'
                ? 'text-amber-600'
                : 'text-gray-500'
            }`}
          >
            {titleLength}/60 characters
            {titleStatus === 'excellent' && ' • Perfect length!'}
            {titleStatus === 'error' && ' • Too long, Google will truncate'}
            {titleStatus === 'warning' && titleLength < 50 && ' • Too short, aim for 50-60'}
            {titleStatus === 'warning' && titleLength > 60 && ' • Consider shortening to 50-60'}
          </span>
          {titleStatus === 'excellent' && (
            <CheckCircle size={16} className="text-emerald-600" />
          )}
          {titleStatus === 'error' && <AlertCircle size={16} className="text-rose-600" />}
        </div>
      </div>

      {/* Meta Description */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Meta Description
          <span className="text-rose-500 ml-1">*</span>
        </label>
        <textarea
          value={seoDescription}
          onChange={(e) => {
            setSeoDescription(e.target.value)
            onChange('seo_description', e.target.value)
          }}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
          placeholder="Brief compelling description for search results (150-160 characters)"
          rows={3}
        />
        <div className="flex items-center justify-between mt-2">
          <span
            className={`text-xs font-medium ${
              descStatus === 'excellent'
                ? 'text-emerald-600'
                : descStatus === 'error'
                ? 'text-rose-600'
                : descStatus === 'warning'
                ? 'text-amber-600'
                : 'text-gray-500'
            }`}
          >
            {descLength}/160 characters
            {descStatus === 'excellent' && ' • Perfect length!'}
            {descStatus === 'error' && ' • Too long, Google will truncate'}
            {descStatus === 'warning' && descLength < 150 && ' • Too short, aim for 150-160'}
            {descStatus === 'warning' && descLength > 160 && ' • Consider shortening to 150-160'}
          </span>
          {descStatus === 'excellent' && (
            <CheckCircle size={16} className="text-emerald-600" />
          )}
          {descStatus === 'error' && <AlertCircle size={16} className="text-rose-600" />}
        </div>
      </div>

      {/* Additional Keywords */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Additional Keywords
        </label>
        <input
          type="text"
          value={additionalKeywords}
          onChange={(e) => {
            setAdditionalKeywords(e.target.value)
            const keywords = e.target.value
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean)
            onChange('additional_keywords', keywords)
          }}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          placeholder="keyword 1, keyword 2, keyword 3"
        />
        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
          <Info size={12} />
          Comma-separated list of related keywords
        </p>
      </div>

      {/* Canonical URL */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Canonical URL
        </label>
        <input
          type="url"
          value={canonicalUrl}
          onChange={(e) => {
            setCanonicalUrl(e.target.value)
            onChange('canonical_url', e.target.value)
          }}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          placeholder="https://example.com/canonical-version"
        />
        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
          <Info size={12} />
          Leave empty to use default article URL
        </p>
      </div>

      {/* Robots Meta */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Robots Meta
        </label>
        <select
          value={robotsMeta}
          onChange={(e) => {
            setRobotsMeta(e.target.value)
            onChange('robots_meta', e.target.value)
          }}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
        >
          <option value="index,follow">Index, Follow (Default)</option>
          <option value="index,nofollow">Index, No Follow</option>
          <option value="noindex,follow">No Index, Follow</option>
          <option value="noindex,nofollow">No Index, No Follow</option>
        </select>
        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
          <Info size={12} />
          Control how search engines crawl this page
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
        <div className="flex gap-3">
          <Info size={20} className="text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-900">
            <p className="font-medium mb-1">SEO Best Practices</p>
            <ul className="space-y-1 text-indigo-700">
              <li>• Include your focus keyword naturally in title and description</li>
              <li>• Front-load important keywords in the title</li>
              <li>• Write compelling copy that encourages clicks</li>
              <li>• Use action words and power words when appropriate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
