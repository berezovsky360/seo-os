'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X,
  Save,
  Eye,
  Send,
  ChevronLeft,
  Bold,
  Italic,
  List,
  Link2,
  Image as ImageIcon,
  Code,
  Quote,
  Loader2,
  FileCode,
  MonitorPlay,
  History,
  RotateCcw,
  Clock,
  Plus,
  FileText,
  Wand2,
  RefreshCw,
  Heading,
  ChevronDown,
  ExternalLink,
} from 'lucide-react'
import SEOMetaEditor from './SEOMetaEditor'
import SERPPreview from './SERPPreview'
import SocialPreview from './SocialPreview'
import ContentAnalysis from './ContentAnalysis'
import SEOScoreIndicator from './SEOScoreIndicator'

interface Article {
  id: string
  site_id: string
  title: string | null
  content: string | null
  keyword?: string | null
  seo_title?: string | null
  seo_description?: string | null
  additional_keywords?: string[] | null
  canonical_url?: string | null
  robots_meta?: string | null
  og_title?: string | null
  og_description?: string | null
  og_image_url?: string | null
  twitter_title?: string | null
  twitter_description?: string | null
  twitter_image_url?: string | null
  twitter_card_type?: string | null
  schema_article_type?: string | null
  preliminary_seo_score?: number | null
  seo_score?: number | null
  word_count?: number | null
  readability_score?: number | null
  images_count?: number | null
  images_alt_count?: number | null
  internal_links_count?: number | null
  external_links_count?: number | null
  status?: string | null
  wp_post_id?: number | null
  [key: string]: any
}

interface VersionEntry {
  id: string
  version_number: number
  version_label: string | null
  created_at: string
  title: string | null
  word_count: number | null
  seo_score: number | null
}

interface WPRevisionEntry {
  id: string
  wp_revision_id: number
  date: string
  title: string
  content_preview: string
  word_count: number
  revision_number: number
}

interface ArticleEditorProps {
  article: Article
  onClose: () => void
  onSave: (updates: Partial<Article>) => Promise<void>
  onPublish: (categoryIds: number[], tagIds: number[]) => Promise<void>
  onAnalyze: () => Promise<any>
  isWPPost?: boolean // true if editing a WP post (uses post_id for versions)
  isNanaBananaEnabled?: boolean
}

export default function ArticleEditor({
  article: initialArticle,
  onClose,
  onSave,
  onPublish,
  onAnalyze,
  isWPPost = false,
  isNanaBananaEnabled = false,
}: ArticleEditorProps) {
  const [article, setArticle] = useState<Article>(initialArticle)
  const [activeTab, setActiveTab] = useState<'seo' | 'schema' | 'advanced' | 'history'>('seo')
  const [isSaving, setIsSaving] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual')

  // Cover / featured image state
  const [generatingCover, setGeneratingCover] = useState(false)
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState<string | null>(article.og_image_url || null)
  const [coverPipelineStep, setCoverPipelineStep] = useState<string>('idle')
  const featuredImageInputRef = useRef<HTMLInputElement>(null)
  const inlineImageInputRef = useRef<HTMLInputElement>(null)

  const [uploadingImage, setUploadingImage] = useState(false)

  // Upload image to WP media library, returns URL
  const uploadToWP = async (file: File): Promise<string | null> => {
    const siteId = article.site_id
    if (!siteId) return null
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/sites/${siteId}/upload-media`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Upload failed')
    return data.url
  }

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadingImage(true)
    try {
      const url = await uploadToWP(file)
      if (!url) return
      if (editorMode === 'visual') {
        const editor = document.getElementById('visual-editor')
        if (editor) {
          editor.focus()
          document.execCommand('insertImage', false, url)
          setHasUnsavedChanges(true)
        }
      } else {
        const textarea = document.getElementById('article-content') as HTMLTextAreaElement
        if (!textarea) return
        const pos = textarea.selectionStart
        const current = article.content || ''
        const imgTag = `<img src="${url}" alt="" />`
        updateField('content', current.substring(0, pos) + imgTag + current.substring(pos))
      }
    } catch (err) {
      alert(`Image upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const url = await uploadToWP(file)
      if (!url) return
      setGeneratedCoverUrl(url)
      setArticle(prev => ({ ...prev, og_image_url: url }))
      setHasUnsavedChanges(true)
    } catch (err) {
      alert(`Image upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setUploadingImage(false)
    }
  }

  // Link dialog state
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [linkTarget, setLinkTarget] = useState(false)
  const [linkNoFollow, setLinkNoFollow] = useState(false)
  const [linkSponsored, setLinkSponsored] = useState(false)
  const savedSelectionRef = useRef<Range | null>(null)
  const [showHeadingMenu, setShowHeadingMenu] = useState(false)

  // Version history state
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [isRestoring, setIsRestoring] = useState<string | null>(null) // version ID being restored
  const [previewVersion, setPreviewVersion] = useState<any>(null) // version snapshot for preview modal
  const [wpRevisions, setWpRevisions] = useState<WPRevisionEntry[]>([])
  const [isLoadingWPRevisions, setIsLoadingWPRevisions] = useState(false)
  const [historyView, setHistoryView] = useState<'local' | 'wordpress'>('local')

  // Calculate word count in real-time
  const wordCount = article.content
    ? article.content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length
    : 0

  // Update article field
  const updateField = useCallback((field: string, value: any) => {
    setArticle((prev) => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
  }, [])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const timer = setTimeout(async () => {
      await handleSave()
    }, 30000)

    return () => clearTimeout(timer)
  }, [article, hasUnsavedChanges])

  // Save article - send only editable fields, not the full object
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const editableFields: Partial<Article> = {
        title: article.title,
        content: article.content,
        keyword: article.keyword,
        seo_title: article.seo_title,
        seo_description: article.seo_description,
        additional_keywords: article.additional_keywords,
        canonical_url: article.canonical_url,
        robots_meta: article.robots_meta,
        og_title: article.og_title,
        og_description: article.og_description,
        og_image_url: article.og_image_url,
        twitter_title: article.twitter_title,
        twitter_description: article.twitter_description,
        twitter_image_url: article.twitter_image_url,
        twitter_card_type: article.twitter_card_type,
        schema_article_type: article.schema_article_type,
        word_count: wordCount,
      }
      await onSave(editableFields)
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to save article:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Analyze SEO
  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const data = await onAnalyze()
      if (data) {
        setAnalysisData(data)
        setArticle((prev) => ({
          ...prev,
          preliminary_seo_score: data.score,
        }))
      }
    } catch (error) {
      console.error('Failed to analyze article:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Open link dialog — save current selection so we can restore it
  const openLinkDialog = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange()
      setLinkText(sel.toString())
    }
    setLinkUrl('')
    setLinkTarget(false)
    setLinkNoFollow(false)
    setLinkSponsored(false)
    setShowLinkDialog(true)
  }

  // Insert link from dialog
  const insertLink = () => {
    if (!linkUrl) return
    const rel = [linkNoFollow ? 'nofollow' : '', linkSponsored ? 'sponsored' : ''].filter(Boolean).join(' ')
    const targetAttr = linkTarget ? ' target="_blank"' : ''
    const relAttr = rel ? ` rel="${rel}"` : ''
    const text = linkText || linkUrl

    if (editorMode === 'visual') {
      const editor = document.getElementById('visual-editor')
      if (editor && savedSelectionRef.current) {
        editor.focus()
        const sel = window.getSelection()
        if (sel) {
          sel.removeAllRanges()
          sel.addRange(savedSelectionRef.current)
        }
        // Create anchor element with attributes
        const anchor = document.createElement('a')
        anchor.href = linkUrl
        anchor.textContent = text
        if (linkTarget) anchor.target = '_blank'
        if (rel) anchor.rel = rel
        savedSelectionRef.current.deleteContents()
        savedSelectionRef.current.insertNode(anchor)
        setHasUnsavedChanges(true)
      }
    } else {
      const textarea = document.getElementById('article-content') as HTMLTextAreaElement
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const current = article.content || ''
        const tag = `<a href="${linkUrl}"${targetAttr}${relAttr}>${text}</a>`
        updateField('content', current.substring(0, start) + tag + current.substring(end))
      }
    }
    setShowLinkDialog(false)
  }

  // Format toolbar buttons
  const formatText = (format: string) => {
    // Heading formats
    if (format.startsWith('h') || format === 'p') {
      const tag = format === 'p' ? 'p' : format
      if (editorMode === 'visual') {
        document.execCommand('formatBlock', false, tag)
      } else {
        const textarea = document.getElementById('article-content') as HTMLTextAreaElement
        if (!textarea) return
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = (article.content || '').substring(start, end) || 'Heading'
        const current = article.content || ''
        const wrapped = `<${tag}>${selectedText}</${tag}>`
        updateField('content', current.substring(0, start) + wrapped + current.substring(end))
      }
      return
    }

    if (editorMode === 'visual') {
      // Visual mode: use execCommand on contentEditable div
      switch (format) {
        case 'bold':
          document.execCommand('bold')
          break
        case 'italic':
          document.execCommand('italic')
          break
        case 'link':
          openLinkDialog()
          return
        case 'list':
          document.execCommand('insertUnorderedList')
          break
        case 'quote':
          document.execCommand('formatBlock', false, 'blockquote')
          break
        case 'code':
          const selection = window.getSelection()
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            const code = document.createElement('code')
            range.surroundContents(code)
          }
          break
        case 'image':
          inlineImageInputRef.current?.click()
          return
      }
      return
    }

    // Code mode: manipulate textarea selection
    const textarea = document.getElementById('article-content') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = (article.content || '').substring(start, end)

    let formattedText = ''
    switch (format) {
      case 'bold':
        formattedText = `<strong>${selectedText}</strong>`
        break
      case 'italic':
        formattedText = `<em>${selectedText}</em>`
        break
      case 'link':
        openLinkDialog()
        return
      case 'list':
        formattedText = `<ul>\n  <li>${selectedText || 'List item'}</li>\n</ul>`
        break
      case 'quote':
        formattedText = `<blockquote>${selectedText}</blockquote>`
        break
      case 'code':
        formattedText = `<code>${selectedText}</code>`
        break
      case 'image':
        inlineImageInputRef.current?.click()
        return
      default:
        return
    }

    const currentContent = article.content || ''
    const newContent =
      currentContent.substring(0, start) + formattedText + currentContent.substring(end)
    updateField('content', newContent)
  }

  // Fetch version history
  const fetchVersions = useCallback(async () => {
    setIsLoadingVersions(true)
    try {
      const param = isWPPost ? `postId=${article.id}` : `articleId=${article.id}`
      const res = await fetch(`/api/versions?${param}`)
      const data = await res.json()
      if (data.success) {
        setVersions(data.versions)
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error)
    } finally {
      setIsLoadingVersions(false)
    }
  }, [article.id, isWPPost])

  // Fetch WordPress revisions (only for WP posts)
  const fetchWPRevisions = useCallback(async () => {
    if (!isWPPost) return
    setIsLoadingWPRevisions(true)
    try {
      const res = await fetch(`/api/posts/${article.id}/revisions`)
      const data = await res.json()
      if (data.success) {
        setWpRevisions(data.revisions)
      }
    } catch (error) {
      console.error('Failed to fetch WP revisions:', error)
    } finally {
      setIsLoadingWPRevisions(false)
    }
  }, [article.id, isWPPost])

  // Load versions when History tab is opened
  useEffect(() => {
    if (activeTab === 'history') {
      fetchVersions()
      if (isWPPost) {
        fetchWPRevisions()
      }
    }
  }, [activeTab, fetchVersions, fetchWPRevisions, isWPPost])

  // Create manual backup
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true)
    try {
      // Save current changes first
      if (hasUnsavedChanges) {
        await handleSave()
      }
      const res = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: isWPPost ? undefined : article.id,
          postId: isWPPost ? article.id : undefined,
          siteId: article.site_id,
          label: 'Manual backup',
        }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchVersions()
      }
    } catch (error) {
      console.error('Failed to create backup:', error)
    } finally {
      setIsCreatingBackup(false)
    }
  }

  // Restore a version
  const handleRestore = async (versionId: string, versionNumber: number) => {
    if (!confirm(`Restore to version #${versionNumber}? Current state will be backed up first.`)) {
      return
    }
    setIsRestoring(versionId)
    try {
      const res = await fetch(`/api/versions/${versionId}/restore`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success && data.data) {
        // Update article state with restored data
        setArticle((prev) => ({ ...prev, ...data.data }))
        setHasUnsavedChanges(false)
        setPreviewVersion(null)
        await fetchVersions()
      }
    } catch (error) {
      console.error('Failed to restore version:', error)
    } finally {
      setIsRestoring(null)
    }
  }

  // Fetch full version snapshot for preview
  const handlePreview = async (versionId: string) => {
    try {
      const param = isWPPost ? `postId=${article.id}` : `articleId=${article.id}`
      const res = await fetch(`/api/versions?${param}`)
      const data = await res.json()
      if (data.success) {
        const version = data.versions.find((v: any) => v.id === versionId)
        if (version) {
          // Fetch full snapshot via dedicated endpoint
          const fullRes = await fetch(`/api/versions/${versionId}/preview`)
          const fullData = await fullRes.json()
          if (fullData.success) {
            setPreviewVersion(fullData.version)
          }
        }
      }
    } catch (error) {
      console.error('Failed to preview version:', error)
    }
  }

  // Format relative time
  const timeAgo = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-[1800px] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {article.title || 'Untitled Article'}
              </h2>
              {lastSaved && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Last saved {lastSaved.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* SEO Score - show Rank Math score or preliminary */}
            {(article.seo_score || article.preliminary_seo_score) && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                {article.seo_score ? (
                  <>
                    <span className="text-xs text-gray-600">Rank Math:</span>
                    <span className={`text-sm font-semibold ${
                      article.seo_score >= 80 ? 'text-emerald-600' :
                      article.seo_score >= 60 ? 'text-amber-600' :
                      'text-rose-600'
                    }`}>
                      {article.seo_score}/100
                    </span>
                  </>
                ) : article.preliminary_seo_score ? (
                  <>
                    <span className="text-xs text-gray-600">SEO Score:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {article.preliminary_seo_score}/100
                    </span>
                  </>
                ) : null}
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Eye size={16} />
                  Analyze SEO
                </>
              )}
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Draft
                </>
              )}
            </button>

            {/* Publish / Update WP Button */}
            <button
              onClick={async () => {
                if (!article.content || !article.title) {
                  alert('Please add title and content before publishing.')
                  return
                }
                // Save first to persist content to DB
                setIsPublishing(true)
                try {
                  await handleSave()
                  await onPublish([], [])
                } catch (error) {
                  console.error('Publish failed:', error)
                } finally {
                  setIsPublishing(false)
                }
              }}
              disabled={isPublishing || isSaving}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                article.wp_post_id
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isPublishing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {article.wp_post_id ? 'Updating...' : 'Publishing...'}
                </>
              ) : (
                <>
                  <Send size={16} />
                  {article.wp_post_id ? 'Update WP' : 'Publish'}
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Editor (70%) */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 mb-4 p-2 bg-gray-50 rounded-lg border border-gray-200">
              {/* Visual / Code toggle */}
              <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden mr-2">
                <button
                  onClick={() => setEditorMode('visual')}
                  className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${
                    editorMode === 'visual' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Visual mode - renders HTML"
                >
                  <MonitorPlay size={14} /> Visual
                </button>
                <button
                  onClick={() => setEditorMode('code')}
                  className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${
                    editorMode === 'code' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Code mode - edit raw HTML"
                >
                  <FileCode size={14} /> Code
                </button>
              </div>
              {/* Heading dropdown */}
              <div className="relative">
                <button
                  onMouseDown={(e) => { e.preventDefault(); setShowHeadingMenu(!showHeadingMenu) }}
                  className="flex items-center gap-1 px-2 py-1.5 hover:bg-white rounded transition-colors text-sm font-medium text-gray-700"
                  title="Headings"
                >
                  <Heading size={16} />
                  <ChevronDown size={12} />
                </button>
                {showHeadingMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
                    {[
                      { tag: 'p', label: 'Paragraph', cls: 'text-sm' },
                      { tag: 'h1', label: 'Heading 1', cls: 'text-lg font-bold' },
                      { tag: 'h2', label: 'Heading 2', cls: 'text-base font-bold' },
                      { tag: 'h3', label: 'Heading 3', cls: 'text-sm font-bold' },
                      { tag: 'h4', label: 'Heading 4', cls: 'text-sm font-semibold' },
                      { tag: 'h5', label: 'Heading 5', cls: 'text-xs font-semibold' },
                      { tag: 'h6', label: 'Heading 6', cls: 'text-xs font-medium' },
                    ].map(({ tag, label, cls }) => (
                      <button
                        key={tag}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          formatText(tag)
                          setShowHeadingMenu(false)
                        }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 transition-colors ${cls}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('bold') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Bold"
              >
                <Bold size={18} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('italic') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Italic"
              >
                <Italic size={18} />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('list') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="List"
              >
                <List size={18} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('quote') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Quote"
              >
                <Quote size={18} />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('link') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Link"
              >
                <Link2 size={18} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('code') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Code"
              >
                <Code size={18} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('image') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Insert Image"
              >
                {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
              </button>
            </div>

            {/* Hidden file input for inline image insertion */}
            <input
              ref={inlineImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleInlineImageUpload}
            />

            {/* Title Input */}
            <div className="mb-6">
              <input
                type="text"
                value={article.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full text-4xl font-bold border-none outline-none focus:ring-0 placeholder-gray-300"
                placeholder="Add title"
              />
              <div className="mt-2 text-sm text-gray-500">
                Permalink: <span className="text-indigo-600">/article-slug-here</span>
              </div>
            </div>

            {/* Content Editor - Visual / Code modes */}
            <div className="mb-6">
              {editorMode === 'visual' ? (
                <div
                  id="visual-editor"
                  className="w-full min-h-[600px] border border-gray-200 rounded-lg px-6 py-4 text-base leading-relaxed focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent overflow-y-auto bg-white prose prose-sm max-w-none
                    prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-indigo-600 prose-strong:text-gray-900
                    prose-img:rounded-lg prose-img:shadow-sm"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => {
                    setHasUnsavedChanges(true)
                  }}
                  onBlur={(e) => {
                    updateField('content', e.currentTarget.innerHTML)
                  }}
                  dangerouslySetInnerHTML={{ __html: article.content || '<p>Start writing your article...</p>' }}
                />
              ) : (
                <textarea
                  id="article-content"
                  value={article.content || ''}
                  onChange={(e) => updateField('content', e.target.value)}
                  className="w-full min-h-[600px] border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-gray-50"
                  placeholder="Start writing your article HTML..."
                />
              )}
              <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                <span>Word count: {wordCount}</span>
                <span className="text-xs text-gray-400">
                  {editorMode === 'visual' ? 'Visual mode - click to edit' : 'Code mode - edit raw HTML'}
                </span>
              </div>
            </div>

            {/* Featured Image */}
            <input
              ref={featuredImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFeaturedImageUpload}
            />
            {generatedCoverUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                <img src={generatedCoverUrl} alt="Featured image" className="w-full h-48 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-white text-xs font-semibold drop-shadow">Featured Image</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => featuredImageInputRef.current?.click()}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-lg hover:bg-white/30 transition-colors"
                    >
                      <ImageIcon size={12} />
                      Replace
                    </button>
                    {isNanaBananaEnabled && (
                      <button
                        onClick={async () => {
                          setGeneratingCover(true)
                          setCoverPipelineStep('prompt')
                          try {
                            const res = await fetch('/api/nana-banana/pipeline', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ site_id: article.site_id, post_id: article.id }),
                            })
                            const data = await res.json()
                            if (!res.ok) throw new Error(data.error || 'Pipeline failed')
                            setCoverPipelineStep('done')
                            if (data.media_url) {
                              setGeneratedCoverUrl(data.media_url)
                              setArticle(prev => ({ ...prev, og_image_url: data.media_url }))
                              setHasUnsavedChanges(true)
                            }
                          } catch (err) {
                            setCoverPipelineStep('idle')
                          } finally {
                            setGeneratingCover(false)
                          }
                        }}
                        disabled={generatingCover}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50"
                      >
                        {generatingCover ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Regenerate
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setGeneratedCoverUrl(null)
                        setArticle(prev => ({ ...prev, og_image_url: null }))
                        setHasUnsavedChanges(true)
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-red-500/30 backdrop-blur-sm text-white text-xs font-semibold rounded-lg hover:bg-red-500/50 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                <ImageIcon size={36} className="mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-4">Featured Image</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => featuredImageInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                  >
                    <ImageIcon size={16} />
                    Upload Image
                  </button>
                  {isNanaBananaEnabled && (
                    <button
                      onClick={async () => {
                        setGeneratingCover(true)
                        setCoverPipelineStep('prompt')
                        try {
                          const res = await fetch('/api/nana-banana/pipeline', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ site_id: article.site_id, post_id: article.id }),
                          })
                          const data = await res.json()
                          if (!res.ok) throw new Error(data.error || 'Pipeline failed')
                          setCoverPipelineStep('done')
                          if (data.media_url) {
                            setGeneratedCoverUrl(data.media_url)
                            setArticle(prev => ({ ...prev, og_image_url: data.media_url }))
                            setHasUnsavedChanges(true)
                          }
                        } catch (err) {
                          setCoverPipelineStep('idle')
                        } finally {
                          setGeneratingCover(false)
                        }
                      }}
                      disabled={generatingCover}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold rounded-lg text-sm hover:from-yellow-500 hover:to-orange-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingCover ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {coverPipelineStep === 'prompt' ? 'Prompt...' :
                           coverPipelineStep === 'image' ? 'Image...' :
                           coverPipelineStep === 'seo' ? 'SEO...' :
                           coverPipelineStep === 'push' ? 'Upload...' : 'Processing...'}
                        </>
                      ) : (
                        <>
                          <Wand2 size={16} />
                          Generate Cover
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Sidebar (30%) */}
          <div className="w-[400px] border-l border-gray-200 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('seo')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'seo'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                SEO
              </button>
              <button
                onClick={() => setActiveTab('schema')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'schema'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Schema
              </button>
              <button
                onClick={() => setActiveTab('advanced')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'advanced'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Advanced
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <History size={14} />
                History
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* SEO Tab */}
              {activeTab === 'seo' && (
                <div className="space-y-6">
                  {/* Rank Math Score from WordPress (if available) */}
                  {article.seo_score && !analysisData && (
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-900">Rank Math Score</h4>
                        <span className={`text-2xl font-bold ${
                          article.seo_score >= 80 ? 'text-emerald-600' :
                          article.seo_score >= 60 ? 'text-amber-600' :
                          'text-rose-600'
                        }`}>
                          {article.seo_score}/100
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Score from Rank Math WordPress plugin. Click "Analyze SEO" for detailed breakdown.
                      </p>
                    </div>
                  )}

                  {/* Content Analysis */}
                  {analysisData && (
                    <ContentAnalysis
                      content={article.content || ''}
                      keyword={article.keyword || ''}
                      seoScore={article.preliminary_seo_score || 0}
                      preliminaryScore={article.preliminary_seo_score || undefined}
                      wordCount={wordCount}
                      readabilityScore={article.readability_score || undefined}
                      imagesCount={article.images_count || 0}
                      imagesAltCount={article.images_alt_count || 0}
                      internalLinksCount={article.internal_links_count || 0}
                      externalLinksCount={article.external_links_count || 0}
                    />
                  )}

                  {/* SEO Meta Fields */}
                  <SEOMetaEditor article={article} onChange={updateField} />

                  {/* SERP Preview */}
                  <SERPPreview
                    title={article.seo_title || article.title || ''}
                    description={article.seo_description || ''}
                    url="example.com/article-slug"
                  />

                  {/* Social Previews */}
                  <SocialPreview
                    ogTitle={article.og_title || article.seo_title || article.title || ''}
                    ogDescription={
                      article.og_description || article.seo_description || ''
                    }
                    ogImage={article.og_image_url || ''}
                    twitterTitle={
                      article.twitter_title || article.seo_title || article.title || ''
                    }
                    twitterDescription={
                      article.twitter_description || article.seo_description || ''
                    }
                    twitterImage={article.twitter_image_url || ''}
                    url="example.com/article-slug"
                  />
                </div>
              )}

              {/* Schema Tab */}
              {activeTab === 'schema' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Schema Type
                    </label>
                    <select
                      value={article.schema_article_type || 'Article'}
                      onChange={(e) => updateField('schema_article_type', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      <option value="Article">Article</option>
                      <option value="NewsArticle">News Article</option>
                      <option value="BlogPosting">Blog Posting</option>
                      <option value="FAQPage">FAQ Page</option>
                      <option value="HowTo">How-To</option>
                      <option value="Review">Review</option>
                      <option value="Course">Course</option>
                      <option value="VideoObject">Video</option>
                    </select>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      Schema markup helps search engines understand your content better.
                      Select the appropriate type for this article.
                    </p>
                  </div>
                </div>
              )}

              {/* Advanced Tab */}
              {activeTab === 'advanced' && (
                <div className="space-y-6">
                  {/* Categories & Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Categories
                    </label>
                    <select
                      multiple
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      <option>Technology</option>
                      <option>SEO</option>
                      <option>Marketing</option>
                      <option>Tutorial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>

                  {/* Publish Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Publish Date
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Author
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
                      <option>Default Author</option>
                      <option>Sarah, The Analyst</option>
                      <option>Marcus, The Maverick</option>
                    </select>
                  </div>
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {/* Create Backup Button */}
                  <button
                    onClick={handleCreateBackup}
                    disabled={isCreatingBackup}
                    className="w-full px-4 py-3 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCreatingBackup ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Creating backup...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Create Backup
                      </>
                    )}
                  </button>

                  {/* Local / WordPress toggle (only for WP posts) */}
                  {isWPPost && (
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setHistoryView('local')}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          historyView === 'local'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        SEO OS ({versions.length})
                      </button>
                      <button
                        onClick={() => setHistoryView('wordpress')}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          historyView === 'wordpress'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        WordPress ({wpRevisions.length})
                      </button>
                    </div>
                  )}

                  {/* LOCAL VERSIONS */}
                  {historyView === 'local' && (
                    <>
                      {isLoadingVersions ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 size={24} className="animate-spin text-gray-400" />
                        </div>
                      ) : versions.length === 0 ? (
                        <div className="text-center py-12">
                          <History size={36} className="mx-auto text-gray-300 mb-3" />
                          <p className="text-sm text-gray-500 mb-1">No versions yet</p>
                          <p className="text-xs text-gray-400">
                            Versions are created automatically when you save, or click "Create Backup" above.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {versions.map((version) => (
                            <div
                              key={version.id}
                              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                    v{version.version_number}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {version.version_label || 'Auto-backup'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                  <Clock size={12} />
                                  {timeAgo(version.created_at)}
                                </div>
                              </div>

                              <div className="mb-3">
                                <p className="text-sm text-gray-700 truncate">
                                  {version.title || 'Untitled'}
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                  {version.word_count != null && version.word_count > 0 && (
                                    <span className="text-xs text-gray-500">
                                      {version.word_count} words
                                    </span>
                                  )}
                                  {version.seo_score != null && version.seo_score > 0 && (
                                    <span className={`text-xs font-medium ${
                                      version.seo_score >= 80 ? 'text-emerald-600' :
                                      version.seo_score >= 60 ? 'text-amber-600' :
                                      'text-rose-600'
                                    }`}>
                                      SEO: {version.seo_score}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRestore(version.id, version.version_number)}
                                  disabled={isRestoring === version.id}
                                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                  {isRestoring === version.id ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <RotateCcw size={12} />
                                  )}
                                  Restore
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* WORDPRESS REVISIONS */}
                  {historyView === 'wordpress' && isWPPost && (
                    <>
                      {isLoadingWPRevisions ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 size={24} className="animate-spin text-gray-400" />
                        </div>
                      ) : wpRevisions.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText size={36} className="mx-auto text-gray-300 mb-3" />
                          <p className="text-sm text-gray-500 mb-1">No WordPress revisions</p>
                          <p className="text-xs text-gray-400">
                            WordPress revisions appear after editing in WP admin or publishing updates.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {wpRevisions.map((rev) => (
                            <div
                              key={rev.id}
                              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                    WP #{rev.revision_number}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                  <Clock size={12} />
                                  {timeAgo(rev.date)}
                                </div>
                              </div>

                              <div className="mb-2">
                                <p className="text-sm text-gray-700 truncate">
                                  {rev.title || 'Untitled'}
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs text-gray-500">
                                    {rev.word_count} words
                                  </span>
                                </div>
                              </div>

                              {rev.content_preview && (
                                <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                                  {rev.content_preview}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Link Dialog */}
        {showLinkDialog && (
          <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center" onClick={() => setShowLinkDialog(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-[420px] p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Link2 size={20} />
                Insert Link
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Link Text</label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Click here"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={linkTarget} onChange={(e) => setLinkTarget(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <ExternalLink size={14} />
                    Open in new tab
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={linkNoFollow} onChange={(e) => setLinkNoFollow(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    nofollow
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={linkSponsored} onChange={(e) => setLinkSponsored(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    sponsored
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  onClick={() => setShowLinkDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={insertLink}
                  disabled={!linkUrl}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Insert Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Loading Overlay */}
        {uploadingImage && (
          <div className="fixed inset-0 bg-black/20 z-[60] flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-lg px-6 py-4 flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
              <span className="text-sm font-medium text-gray-700">Uploading to WordPress...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
