'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, Save, Loader2, CheckCircle, AlertCircle, Eye, Upload, Plus, X, FileInput } from 'lucide-react'
import { useLandingPage, useUpdateLandingPage, useUploadMedia, useLeadForms } from '@/hooks/useLandingEngine'
import AIPageEditor from './AIPageEditor'

interface LandingPageEditorProps {
  siteId: string
  pageId: string
  onClose: () => void
}

const SCHEMA_TYPE_OPTIONS = [
  'Article',
  'BlogPosting',
  'WebPage',
  'FAQPage',
  'Product',
  'LocalBusiness',
  'Organization',
  'HowTo',
]

export default function LandingPageEditor({ siteId, pageId, onClose }: LandingPageEditorProps) {
  const { data: page, isLoading } = useLandingPage(siteId, pageId)
  const updatePage = useUpdateLandingPage()

  // Local state for all fields
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [pageType, setPageType] = useState<'post' | 'page' | 'category'>('post')
  const [schemaType, setSchemaType] = useState('Article')
  const [robotsMeta, setRobotsMeta] = useState('index, follow')
  const [ogImage, setOgImage] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [category, setCategory] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [formIds, setFormIds] = useState<string[]>([])
  const [formPositions, setFormPositions] = useState<any[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Image upload refs
  const featuredInputRef = useRef<HTMLInputElement>(null)
  const ogInputRef = useRef<HTMLInputElement>(null)
  const uploadMedia = useUploadMedia()
  const { data: availableForms = [] } = useLeadForms()

  // Robots meta as individual booleans
  const [allowIndex, setAllowIndex] = useState(true)
  const [allowFollow, setAllowFollow] = useState(true)

  // Sync page data to local state when loaded
  useEffect(() => {
    if (!page) return
    setTitle(page.title || '')
    setContent(page.content || '')
    setSeoTitle(page.seo_title || '')
    setSeoDescription(page.seo_description || '')
    setSlug(page.slug || '')
    setPageType(page.page_type || 'post')
    setSchemaType(page.schema_type || 'Article')
    setOgImage(page.og_image || '')
    setFeaturedImage(page.featured_image_url || '')
    setCategory(page.category || '')
    setAuthorName(page.author_name || '')
    setIsPublished(page.is_published || false)
    setFormIds(page.form_ids || [])
    setFormPositions(page.form_positions || [])

    // Parse robots meta into booleans
    const rm = page.robots_meta || 'index, follow'
    setRobotsMeta(rm)
    setAllowIndex(!rm.includes('noindex'))
    setAllowFollow(!rm.includes('nofollow'))
  }, [page])

  // Sync robots checkboxes back to robots meta string
  useEffect(() => {
    const indexPart = allowIndex ? 'index' : 'noindex'
    const followPart = allowFollow ? 'follow' : 'nofollow'
    const newMeta = `${indexPart}, ${followPart}`
    setRobotsMeta(newMeta)
  }, [allowIndex, allowFollow])

  // Auto-save every 30 seconds when there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return
    const timer = setTimeout(() => {
      handleSave()
    }, 30000)
    return () => clearTimeout(timer)
  }, [hasUnsavedChanges, content, title, seoTitle, seoDescription, slug, pageType, schemaType, robotsMeta, ogImage, featuredImage, category, authorName, isPublished])

  const handleSave = useCallback(async () => {
    try {
      await updatePage.mutateAsync({
        siteId,
        pageId,
        updates: {
          title,
          content,
          seo_title: seoTitle,
          seo_description: seoDescription,
          slug,
          page_type: pageType,
          schema_type: schemaType,
          robots_meta: robotsMeta,
          og_image: ogImage,
          featured_image_url: featuredImage,
          category,
          author_name: authorName,
          is_published: isPublished,
          form_ids: formIds,
          form_positions: formPositions,
          word_count: content
            .replace(/<[^>]*>/g, '')
            .split(/\s+/)
            .filter(Boolean).length,
        },
      })
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
    } catch (err) {
      // Error is surfaced via updatePage.isError
    }
  }, [siteId, pageId, title, content, seoTitle, seoDescription, slug, pageType, schemaType, robotsMeta, ogImage, featuredImage, category, authorName, isPublished, updatePage])

  // Mark field as changed
  const markChanged = useCallback(() => {
    setHasUnsavedChanges(true)
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F5F5F7] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading page...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F5F7] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        {/* Left: Back button */}
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft size={18} />
          <span>Back</span>
        </button>

        {/* Center: Title input */}
        <div className="flex-1 mx-8">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              markChanged()
            }}
            placeholder="Page title..."
            className="w-full text-lg font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0 text-center placeholder:text-gray-400"
          />
        </div>

        {/* Right: Save status + Save button */}
        <div className="flex items-center gap-3">
          {/* Save status indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            {updatePage.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin text-gray-400" />
                <span className="text-gray-400">Saving...</span>
              </>
            ) : updatePage.isError ? (
              <>
                <AlertCircle size={14} className="text-red-500" />
                <span className="text-red-500">Save failed</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <AlertCircle size={14} className="text-amber-500" />
                <span className="text-amber-500">Unsaved changes</span>
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle size={14} className="text-green-500" />
                <span className="text-gray-400">
                  Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </>
            ) : null}
          </div>

          {/* Preview button */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              showPreview
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Eye size={14} />
            {showPreview ? 'Editor' : 'Preview'}
          </button>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={updatePage.isPending || !hasUnsavedChanges}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updatePage.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save
          </button>
        </div>
      </div>

      {/* Main body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor/Preview area — 70% */}
        <div className="flex-1 overflow-auto p-6">
          {showPreview ? (
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white h-full">
              <iframe
                src={`/api/landing/sites/${siteId}/pages/${pageId}/preview`}
                className="w-full h-full min-h-[600px] border-none"
                title="Page Preview"
              />
            </div>
          ) : (
            <AIPageEditor
              content={content}
              onChange={(html: string) => {
                setContent(html)
                markChanged()
              }}
              siteId={siteId}
            />
          )}
        </div>

        {/* SEO Sidebar — 30% */}
        <div className="w-[360px] border-l border-gray-200 bg-white overflow-auto p-5 space-y-6">
          {/* Section: Page Settings */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Page Settings
            </h3>
            <div className="space-y-3">
              {/* Page Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Type</label>
                <select
                  value={pageType}
                  onChange={(e) => {
                    setPageType(e.target.value as 'post' | 'page' | 'category')
                    markChanged()
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="post">Post</option>
                  <option value="page">Page</option>
                  <option value="category">Category</option>
                </select>
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value)
                    markChanged()
                  }}
                  placeholder="page-url-slug"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Published toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Published</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsPublished(!isPublished)
                    markChanged()
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isPublished ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPublished ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section: SEO */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              SEO
            </h3>
            <div className="space-y-3">
              {/* SEO Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">SEO Title</label>
                  <span
                    className={`text-xs ${
                      seoTitle.length > 60 ? 'text-red-500' : 'text-gray-400'
                    }`}
                  >
                    {seoTitle.length}/60
                  </span>
                </div>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => {
                    setSeoTitle(e.target.value)
                    markChanged()
                  }}
                  placeholder="SEO title for search engines"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* SEO Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">SEO Description</label>
                  <span
                    className={`text-xs ${
                      seoDescription.length > 160 ? 'text-red-500' : 'text-gray-400'
                    }`}
                  >
                    {seoDescription.length}/160
                  </span>
                </div>
                <textarea
                  value={seoDescription}
                  onChange={(e) => {
                    setSeoDescription(e.target.value)
                    markChanged()
                  }}
                  placeholder="Meta description for search results"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* OG Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OG Image</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={ogImage}
                    onChange={(e) => {
                      setOgImage(e.target.value)
                      markChanged()
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => ogInputRef.current?.click()}
                    disabled={uploadMedia.isPending}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    title="Upload image"
                  >
                    {uploadMedia.isPending ? <Loader2 size={14} className="animate-spin text-gray-500" /> : <Upload size={14} className="text-gray-500" />}
                  </button>
                </div>
                <input
                  ref={ogInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      const result = await uploadMedia.mutateAsync({ siteId, file })
                      setOgImage(result.url)
                      markChanged()
                    } catch {}
                    if (ogInputRef.current) ogInputRef.current.value = ''
                  }}
                />
                {ogImage && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={ogImage}
                      alt="OG preview"
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Schema */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Schema
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schema Type</label>
              <select
                value={schemaType}
                onChange={(e) => {
                  setSchemaType(e.target.value)
                  markChanged()
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                {SCHEMA_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Robots */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Robots
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowIndex}
                  onChange={(e) => {
                    setAllowIndex(e.target.checked)
                    markChanged()
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Allow indexing</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowFollow}
                  onChange={(e) => {
                    setAllowFollow(e.target.checked)
                    markChanged()
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Allow following links</span>
              </label>
              <div className="mt-1 px-2 py-1.5 bg-gray-50 rounded-md">
                <code className="text-xs text-gray-500">{robotsMeta}</code>
              </div>
            </div>
          </div>

          {/* Section: Media */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Media
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Featured Image
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={featuredImage}
                  onChange={(e) => {
                    setFeaturedImage(e.target.value)
                    markChanged()
                  }}
                  placeholder="https://example.com/featured.jpg"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => featuredInputRef.current?.click()}
                  disabled={uploadMedia.isPending}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  title="Upload image"
                >
                  {uploadMedia.isPending ? <Loader2 size={14} className="animate-spin text-gray-500" /> : <Upload size={14} className="text-gray-500" />}
                </button>
              </div>
              <input
                ref={featuredInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const result = await uploadMedia.mutateAsync({ siteId, file })
                    setFeaturedImage(result.url)
                    markChanged()
                  } catch {}
                  if (featuredInputRef.current) featuredInputRef.current.value = ''
                }}
              />
              {featuredImage && (
                <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={featuredImage}
                    alt="Featured preview"
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section: Lead Forms */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Lead Forms
            </h3>
            <div className="space-y-2">
              {formIds.length > 0 && (
                <div className="space-y-2">
                  {formIds.map((fid, idx) => {
                    const form = availableForms.find((f: any) => f.id === fid)
                    const pos = formPositions.find((p: any) => p.form_id === fid)
                    return (
                      <div key={fid} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                        <FileInput size={14} className="text-indigo-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-700 truncate">
                            {form?.name || 'Unknown form'}
                          </div>
                          <select
                            value={pos?.position || 'after_content'}
                            onChange={(e) => {
                              const updated = formPositions.filter((p: any) => p.form_id !== fid)
                              updated.push({ form_id: fid, position: e.target.value })
                              setFormPositions(updated)
                              markChanged()
                            }}
                            className="text-[10px] text-gray-400 bg-transparent border-none p-0 focus:ring-0"
                          >
                            <option value="after_content">After content</option>
                            <option value="placeholder">At placeholder</option>
                          </select>
                        </div>
                        {pos?.position === 'placeholder' && (
                          <input
                            type="text"
                            value={pos?.placeholder_id || ''}
                            onChange={(e) => {
                              const updated = formPositions.map((p: any) =>
                                p.form_id === fid ? { ...p, placeholder_id: e.target.value } : p
                              )
                              setFormPositions(updated)
                              markChanged()
                            }}
                            placeholder="ID"
                            className="w-16 px-1.5 py-0.5 text-[10px] border border-gray-200 rounded"
                          />
                        )}
                        <button
                          onClick={() => {
                            setFormIds(formIds.filter((_, i) => i !== idx))
                            setFormPositions(formPositions.filter((p: any) => p.form_id !== fid))
                            markChanged()
                          }}
                          className="p-1 hover:bg-red-50 rounded text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add form dropdown */}
              {availableForms.length > 0 ? (
                <select
                  value=""
                  onChange={(e) => {
                    const formId = e.target.value
                    if (!formId || formIds.includes(formId)) return
                    setFormIds([...formIds, formId])
                    setFormPositions([...formPositions, { form_id: formId, position: 'after_content' }])
                    markChanged()
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="">+ Add form...</option>
                  {availableForms
                    .filter((f: any) => !formIds.includes(f.id))
                    .map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.form_type || 'inline'})
                      </option>
                    ))}
                </select>
              ) : (
                <p className="text-xs text-gray-400">No forms available. Create forms in Lead Factory.</p>
              )}

              {formIds.length > 0 && (
                <p className="text-[10px] text-gray-400">
                  Use <code className="bg-gray-100 px-1 rounded">{'{{FORM:id}}'}</code> in content for placeholder positioning.
                </p>
              )}
            </div>
          </div>

          {/* Section: Author */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Author
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author Name</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => {
                    setAuthorName(e.target.value)
                    markChanged()
                  }}
                  placeholder="Author name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value)
                    markChanged()
                  }}
                  placeholder="Page category"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
