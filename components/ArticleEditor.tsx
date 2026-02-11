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
  ChevronDown,
  ExternalLink,
  ListOrdered,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Redo2,
  Type,
  GripVertical,
  Columns2,
  Columns3,
  Columns4,
  Sparkles,
  Check,
  Minus,
} from 'lucide-react'
import SEOMetaEditor from './SEOMetaEditor'

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}
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
  isPage?: boolean // true when rendered as full page route instead of modal
}

// Normalize HTML into proper block elements (each line = separate <p>)
function normalizeBlockStructure(html: string): string {
  const temp = document.createElement('div')
  temp.innerHTML = html

  const result: Node[] = []

  temp.childNodes.forEach(node => {
    // Wrap loose text nodes in <p>
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) {
        const p = document.createElement('p')
        p.textContent = text
        result.push(p)
      }
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement

    // Preserve column containers as-is
    if (el.classList?.contains('wp-block-columns') || el.classList?.contains('wp-block-column')) {
      result.push(el.cloneNode(true))
      return
    }

    // Convert bare <div> (Chrome Enter artifact) to <p>, but not column divs
    if (el.tagName === 'DIV' && !el.className) {
      const p = document.createElement('p')
      p.innerHTML = el.innerHTML
      result.push(p)
      return
    }

    // Split <p> and headings that contain <br> into separate blocks
    if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
      if (el.querySelector('br')) {
        const tag = el.tagName.toLowerCase()
        const segments = el.innerHTML.split(/<br\s*\/?>/gi)
        segments.forEach(seg => {
          const trimmed = seg.trim()
          if (trimmed) {
            const newBlock = document.createElement(tag)
            newBlock.innerHTML = trimmed
            result.push(newBlock)
          }
        })
        return
      }
    }

    // Everything else passes through
    result.push(el.cloneNode(true))
  })

  const output = document.createElement('div')
  result.forEach(n => output.appendChild(n))
  return output.innerHTML || '<p><br></p>'
}

export default function ArticleEditor({
  article: initialArticle,
  onClose,
  onSave,
  onPublish,
  onAnalyze,
  isWPPost = false,
  isNanaBananaEnabled = false,
  isPage = false,
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
  const editorRef = useRef<HTMLDivElement>(null)
  const lastSyncedContentRef = useRef<string>('')

  const [uploadingImage, setUploadingImage] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  // Selection tracking for toolbar (fixes mobile where selection is lost on button tap)
  const savedRangeRef = useRef<Range | null>(null)
  const isFormattingRef = useRef(false)

  // Floating toolbar (Notion-style)
  const [floatingToolbar, setFloatingToolbar] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false })
  const floatingToolbarRef = useRef<HTMLDivElement>(null)
  const [showFloatingTurnInto, setShowFloatingTurnInto] = useState(false)

  // AI rewrite toolbar state
  const [showAIMenu, setShowAIMenu] = useState(false)
  const [aiRewriting, setAiRewriting] = useState(false)
  const [showToneSubmenu, setShowToneSubmenu] = useState(false)

  // Block drag-and-drop state
  const [hoveredBlock, setHoveredBlock] = useState<HTMLElement | null>(null)
  const [blockHandlePos, setBlockHandlePos] = useState<{ top: number; left: number } | null>(null)
  const [isDraggingBlock, setIsDraggingBlock] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragSourceRef = useRef<HTMLElement | null>(null)
  const gripHandleRef = useRef<HTMLDivElement | null>(null)

  // Sync editor content when article.content changes externally (restore, initial load)
  useEffect(() => {
    if (editorRef.current && editorMode === 'visual') {
      const raw = article.content || '<p>Start writing your article...</p>'
      const content = normalizeBlockStructure(raw)
      if (lastSyncedContentRef.current !== content) {
        editorRef.current.innerHTML = content
        lastSyncedContentRef.current = content
      }
      // Ensure Enter creates <p> tags, not <br> or <div>
      document.execCommand('defaultParagraphSeparator', false, 'p')
    }
  }, [article.content, editorMode])

  // Floating toolbar — track selection changes within the editor
  useEffect(() => {
    if (editorMode !== 'visual') {
      setFloatingToolbar(prev => ({ ...prev, show: false }))
      return
    }

    const handleSelectionChange = () => {
      // Don't react to selection changes caused by our own formatting
      if (isFormattingRef.current) return

      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || !editorRef.current) return

      const range = sel.getRangeAt(0)
      if (!editorRef.current.contains(range.commonAncestorContainer)) {
        setFloatingToolbar(prev => ({ ...prev, show: false }))
        return
      }

      // Detect current block tag for toolbar heading buttons
      let node: Node | null = sel.anchorNode
      let foundTag = 'p'
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = (node as HTMLElement).tagName.toLowerCase()
          if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
            foundTag = tag
            break
          }
        }
        node = node.parentNode
      }
      setActiveBlockTag(foundTag)

      if (!sel.isCollapsed && range.toString().trim().length > 0) {
        const rect = range.getBoundingClientRect()
        const x = Math.max(140, Math.min(rect.left + rect.width / 2, window.innerWidth - 140))
        const y = rect.top
        setFloatingToolbar({ x, y: y < 60 ? rect.bottom + 8 : y, show: true })
      } else {
        setFloatingToolbar(prev => ({ ...prev, show: false }))
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [editorMode])

  // Close dropdowns when floating toolbar hides
  useEffect(() => {
    if (!floatingToolbar.show) {
      setShowFloatingTurnInto(false)
      setShowAIMenu(false)
      setShowToneSubmenu(false)
    }
  }, [floatingToolbar.show])

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
        if (editorRef.current) {
          editorRef.current.focus()
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
  const [activeBlockTag, setActiveBlockTag] = useState<string>('p')
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false)
  const headingDropdownRef = useRef<HTMLDivElement>(null)

  // Close heading dropdown on click outside
  useEffect(() => {
    if (!showHeadingDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (headingDropdownRef.current && !headingDropdownRef.current.contains(e.target as Node)) {
        setShowHeadingDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showHeadingDropdown])

  // Version history state
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [isRestoring, setIsRestoring] = useState<string | null>(null) // version ID being restored
  const [previewVersion, setPreviewVersion] = useState<any>(null) // version snapshot for preview modal
  const [wpRevisions, setWpRevisions] = useState<WPRevisionEntry[]>([])
  const [isLoadingWPRevisions, setIsLoadingWPRevisions] = useState(false)
  const [historyView, setHistoryView] = useState<'local' | 'wordpress'>('local')
  const [analysisHistory, setAnalysisHistory] = useState<Array<{ id: string; score: number; analyzed_at: string }>>([])
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false)

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
    // Sync DOM content to state before saving (visual mode may have unsaved DOM changes)
    const currentContent = (editorMode === 'visual' && editorRef.current)
      ? editorRef.current.innerHTML
      : article.content

    setIsSaving(true)
    try {
      const editableFields: Partial<Article> = {
        title: article.title,
        content: currentContent,
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
        // Persist analysis to history
        try {
          await fetch(`/api/articles/${article.id}/analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: data.score, results: data }),
          })
        } catch (persistErr) {
          console.error('Failed to persist analysis:', persistErr)
        }
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
      if (editorRef.current && savedSelectionRef.current) {
        editorRef.current.focus()
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

  // === Selection save/restore for toolbar (fixes mobile) ===

  // Eagerly save current editor selection — called on pointerdown/touchstart before browser clears it
  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    }
  }

  // === Editor keydown handler — reinforces block structure ===
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Don't interfere with list Enter behavior
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.anchorNode
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = (node as HTMLElement).tagName
            if (tag === 'LI' || tag === 'UL' || tag === 'OL') return
          }
          node = node.parentNode
        }
      }
      document.execCommand('defaultParagraphSeparator', false, 'p')
    }
  }

  // === Block utilities ===

  // Find the top-level block child of the editor
  const getTopLevelBlock = useCallback((node: Node | null): HTMLElement | null => {
    if (!node || !editorRef.current) return null
    let current = node
    while (current && current.parentNode !== editorRef.current) {
      current = current.parentNode as Node
    }
    if (current && current.nodeType === Node.ELEMENT_NODE && editorRef.current.contains(current)) {
      return current as HTMLElement
    }
    return null
  }, [])

  // Track hovered block for drag handle
  const handleEditorMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingBlock || editorMode !== 'visual' || !editorRef.current) return

    const target = document.elementFromPoint(e.clientX, e.clientY)

    // If hovering over the grip handle itself, keep current state
    if (target && gripHandleRef.current && gripHandleRef.current.contains(target as Node)) {
      return
    }

    if (!target || !editorRef.current.contains(target)) {
      setHoveredBlock(null)
      setBlockHandlePos(null)
      return
    }

    const block = getTopLevelBlock(target)
    if (!block) return
    if (block === hoveredBlock) return

    const editorRect = editorRef.current.getBoundingClientRect()
    const blockRect = block.getBoundingClientRect()

    setHoveredBlock(block)
    setBlockHandlePos({
      top: blockRect.top - editorRect.top + editorRef.current.scrollTop,
      left: 8,
    })
  }, [isDraggingBlock, editorMode, hoveredBlock, getTopLevelBlock])

  const handleEditorMouseLeave = useCallback((e: React.MouseEvent) => {
    if (isDraggingBlock) return
    // Don't clear if mouse moves to the grip handle
    const relatedTarget = e.relatedTarget as Node | null
    if (relatedTarget && gripHandleRef.current && gripHandleRef.current.contains(relatedTarget)) {
      return
    }
    setHoveredBlock(null)
    setBlockHandlePos(null)
  }, [isDraggingBlock])

  // === Mouse-based block drag-and-drop ===
  // (HTML5 DnD doesn't work reliably with contentEditable)

  const dragOverIndexRef = useRef<number | null>(null)

  const getDropIndicatorTop = (): number => {
    if (!editorRef.current || dragOverIndex === null) return 0
    const blocks = Array.from(editorRef.current.children) as HTMLElement[]
    if (dragOverIndex >= blocks.length) {
      const last = blocks[blocks.length - 1]
      const lastRect = last.getBoundingClientRect()
      const editorRect = editorRef.current.getBoundingClientRect()
      return lastRect.bottom - editorRect.top + editorRef.current.scrollTop
    }
    const targetBlock = blocks[dragOverIndex]
    const rect = targetBlock.getBoundingClientRect()
    const editorRect = editorRef.current.getBoundingClientRect()
    return rect.top - editorRect.top + editorRef.current.scrollTop
  }

  const handleGripMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!hoveredBlock || !editorRef.current) return

    const sourceBlock = hoveredBlock
    dragSourceRef.current = sourceBlock
    setIsDraggingBlock(true)
    sourceBlock.style.opacity = '0.4'
    sourceBlock.style.transition = 'none'

    const onMouseMove = (me: MouseEvent) => {
      if (!editorRef.current || !dragSourceRef.current) return

      const target = document.elementFromPoint(me.clientX, me.clientY)
      if (!target) return
      const overBlock = getTopLevelBlock(target)
      if (!overBlock || overBlock === dragSourceRef.current) {
        dragOverIndexRef.current = null
        setDragOverIndex(null)
        return
      }

      const blocks = Array.from(editorRef.current.children) as HTMLElement[]
      const overIndex = blocks.indexOf(overBlock)
      const rect = overBlock.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      const newIndex = me.clientY < midY ? overIndex : overIndex + 1
      dragOverIndexRef.current = newIndex
      setDragOverIndex(newIndex)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)

      const dropIdx = dragOverIndexRef.current
      if (dragSourceRef.current && editorRef.current && dropIdx !== null) {
        const blocks = Array.from(editorRef.current.children)
        const sourceIndex = blocks.indexOf(dragSourceRef.current)
        if (sourceIndex !== -1 && sourceIndex !== dropIdx && sourceIndex !== dropIdx - 1) {
          const referenceNode = dropIdx < blocks.length ? blocks[dropIdx] : null
          editorRef.current.insertBefore(dragSourceRef.current, referenceNode)
          // Sync reordered DOM back to React state
          setTimeout(() => {
            if (editorRef.current) {
              updateField('content', editorRef.current.innerHTML)
            }
          }, 0)
          setHasUnsavedChanges(true)
        }
      }

      // Cleanup
      if (dragSourceRef.current) {
        dragSourceRef.current.style.opacity = ''
        dragSourceRef.current.style.transition = ''
      }
      dragSourceRef.current = null
      dragOverIndexRef.current = null
      setIsDraggingBlock(false)
      setDragOverIndex(null)
      setHoveredBlock(null)
      setBlockHandlePos(null)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [hoveredBlock, getTopLevelBlock])

  // === Column insertion ===

  const insertColumns = (count: 2 | 3 | 4) => {
    if (!editorRef.current) return
    editorRef.current.focus()
    if (savedRangeRef.current) {
      const sel = window.getSelection()
      if (sel) {
        sel.removeAllRanges()
        sel.addRange(savedRangeRef.current)
      }
    }

    const columnDivs = Array.from({ length: count }, () =>
      `<div class="wp-block-column"><p>Column</p></div>`
    ).join('')

    const columnsHTML = `<div class="wp-block-columns" data-columns="${count}">${columnDivs}</div><p><br></p>`
    document.execCommand('insertHTML', false, columnsHTML)
    setHasUnsavedChanges(true)
  }

  // === Formatting engine using execCommand (reliable with ref-based editor) ===

  // Helper: wrap selection with inline tag (for code)
  const wrapWithCode = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const selectedText = range.toString()
    if (!selectedText) return

    // Check if already in <code> — toggle off
    let parent: Node | null = range.commonAncestorContainer
    while (parent && parent !== editorRef.current) {
      if (parent.nodeType === Node.ELEMENT_NODE && (parent as HTMLElement).tagName === 'CODE') {
        const textNode = document.createTextNode((parent as HTMLElement).textContent || '')
        parent.parentNode?.replaceChild(textNode, parent)
        return
      }
      parent = parent.parentNode
    }

    const code = document.createElement('code')
    try {
      range.surroundContents(code)
    } catch {
      const fragment = range.extractContents()
      code.appendChild(fragment)
      range.insertNode(code)
    }
  }

  // Main format dispatcher — uses execCommand for reliability
  const formatText = (format: string) => {
    if (format === 'link') {
      openLinkDialog()
      return
    }
    if (format === 'image') {
      inlineImageInputRef.current?.click()
      return
    }

    if (editorMode === 'visual') {
      // Restore saved selection (critical for mobile where selection is lost on toolbar tap)
      if (savedRangeRef.current && editorRef.current) {
        editorRef.current.focus()
        const sel = window.getSelection()
        if (sel) {
          sel.removeAllRanges()
          sel.addRange(savedRangeRef.current)
        }
      }

      isFormattingRef.current = true

      // Heading / paragraph formats
      if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(format)) {
        document.execCommand('formatBlock', false, `<${format}>`)
      } else {
        switch (format) {
          case 'bold':
            document.execCommand('bold')
            break
          case 'italic':
            document.execCommand('italic')
            break
          case 'underline':
            document.execCommand('underline')
            break
          case 'strikethrough':
            document.execCommand('strikeThrough')
            break
          case 'list':
            document.execCommand('insertUnorderedList')
            break
          case 'ordered-list':
            document.execCommand('insertOrderedList')
            break
          case 'quote':
            document.execCommand('formatBlock', false, '<blockquote>')
            break
          case 'code':
            wrapWithCode()
            break
          case 'undo':
            document.execCommand('undo')
            break
          case 'redo':
            document.execCommand('redo')
            break
        }
      }

      setHasUnsavedChanges(true)
      setShowFloatingTurnInto(false)

      // Update savedRange with new selection position after formatting
      requestAnimationFrame(() => {
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
          savedRangeRef.current = sel.getRangeAt(0).cloneRange()
        }
        isFormattingRef.current = false
      })
      return
    }

    // === Code mode: manipulate textarea ===
    const textarea = document.getElementById('article-content') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const content = article.content || ''
    const selectedText = content.substring(start, end)

    let formattedText = ''

    // Headings
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(format)) {
      formattedText = `<${format}>${selectedText || 'Text'}</${format}>`
    } else {
      switch (format) {
        case 'bold':
          formattedText = `<strong>${selectedText}</strong>`
          break
        case 'italic':
          formattedText = `<em>${selectedText}</em>`
          break
        case 'underline':
          formattedText = `<u>${selectedText}</u>`
          break
        case 'strikethrough':
          formattedText = `<s>${selectedText}</s>`
          break
        case 'list': {
          const items = selectedText ? selectedText.split('\n').filter(Boolean) : ['List item']
          formattedText = `<ul>\n${items.map(i => `  <li>${i.trim()}</li>`).join('\n')}\n</ul>`
          break
        }
        case 'ordered-list': {
          const items = selectedText ? selectedText.split('\n').filter(Boolean) : ['List item']
          formattedText = `<ol>\n${items.map(i => `  <li>${i.trim()}</li>`).join('\n')}\n</ol>`
          break
        }
        case 'quote':
          formattedText = `<blockquote>${selectedText || 'Quote'}</blockquote>`
          break
        case 'code':
          formattedText = `<code>${selectedText}</code>`
          break
        default:
          return
      }
    }

    updateField('content', content.substring(0, start) + formattedText + content.substring(end))
  }

  // AI rewrite handler — replaces selected text with AI-generated result
  const handleAIRewrite = async (action: string, tone?: string) => {
    setShowAIMenu(false)
    setShowToneSubmenu(false)

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return

    const selectedText = sel.toString()
    if (!selectedText.trim()) return

    // Save range for later replacement
    savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    setAiRewriting(true)

    try {
      const res = await fetch('/api/ai-writer/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedText, action, tone }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Rewrite failed')
      }
      const { result } = await res.json()

      // Restore selection and replace text
      editorRef.current?.focus()
      const s = window.getSelection()
      if (s && savedRangeRef.current) {
        s.removeAllRanges()
        s.addRange(savedRangeRef.current)
      }
      isFormattingRef.current = true
      document.execCommand('insertText', false, result)
      setHasUnsavedChanges(true)
      requestAnimationFrame(() => { isFormattingRef.current = false })
    } catch (err) {
      console.error('AI rewrite failed:', err)
    } finally {
      setAiRewriting(false)
    }
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

  // Fetch analysis history
  const fetchAnalysisHistory = useCallback(async () => {
    setIsLoadingAnalysis(true)
    try {
      const res = await fetch(`/api/articles/${article.id}/analysis`)
      if (res.ok) {
        const data = await res.json()
        setAnalysisHistory(data)
      }
    } catch (err) {
      console.error('Failed to load analysis history:', err)
    } finally {
      setIsLoadingAnalysis(false)
    }
  }, [article.id])

  // Load versions when History tab is opened
  useEffect(() => {
    if (activeTab === 'history') {
      fetchVersions()
      fetchAnalysisHistory()
      if (isWPPost) {
        fetchWPRevisions()
      }
    }
  }, [activeTab, fetchVersions, fetchAnalysisHistory, fetchWPRevisions, isWPPost])

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
    <div className={isPage ? "h-screen w-full" : "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-0 md:p-4"}>
      <div className={isPage ? "bg-white w-full h-full flex flex-col" : "bg-white md:rounded-2xl shadow-2xl w-full h-full max-w-[1800px] max-h-full md:max-h-[95vh] flex flex-col"}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-0">
              <h2 className="text-base md:text-xl font-semibold text-gray-900 truncate">
                {article.title || 'Untitled Article'}
              </h2>
              {lastSaved && (
                <p className="text-xs text-gray-500 mt-0.5 hidden md:block">
                  Last saved {lastSaved.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            {/* SEO Score - show Rank Math score or preliminary (hidden on mobile) */}
            {(article.seo_score || article.preliminary_seo_score) && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
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

            {/* Analyze Button — icon only on mobile */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="p-2 md:px-4 md:py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              title="Analyze SEO"
            >
              {isAnalyzing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Eye size={16} />
              )}
              <span className="hidden md:inline">
                {isAnalyzing ? 'Analyzing...' : 'Analyze SEO'}
              </span>
            </button>

            {/* Save Button — icon only on mobile */}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="p-2 md:px-4 md:py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Save Draft"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span className="hidden md:inline">
                {isSaving ? 'Saving...' : 'Save Draft'}
              </span>
            </button>

            {/* Publish / Update WP Button — icon only on mobile */}
            <button
              onClick={async () => {
                if (!article.content || !article.title) {
                  alert('Please add title and content before publishing.')
                  return
                }
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
              className={`p-2 md:px-4 md:py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                article.wp_post_id
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
              title={article.wp_post_id ? 'Update' : 'Send to WP'}
            >
              {isPublishing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              <span className="hidden md:inline">
                {isPublishing
                  ? (article.wp_post_id ? 'Updating...' : 'Sending...')
                  : (article.wp_post_id ? 'Update' : 'Send to WP')
                }
              </span>
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
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Editor (70%) */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6">
            {/* Formatting Toolbar — sticky */}
            <div
              className="flex items-center gap-1 mb-4 p-2 bg-gray-50 rounded-lg border border-gray-200 sticky top-0 z-10 flex-wrap md:flex-nowrap md:overflow-x-auto"
              onPointerDown={saveSelection}
            >
              {/* Visual / Code toggle */}
              <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden mr-2 shrink-0">
                <button
                  onClick={() => {
                    // Switching to visual: content will be set via useEffect
                    setEditorMode('visual')
                  }}
                  className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${
                    editorMode === 'visual' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Visual mode - renders HTML"
                >
                  <MonitorPlay size={14} /> Visual
                </button>
                <button
                  onClick={() => {
                    // Sync DOM to state before switching to code mode
                    if (editorRef.current) {
                      const html = editorRef.current.innerHTML
                      lastSyncedContentRef.current = html
                      setArticle(prev => ({ ...prev, content: html }))
                    }
                    setEditorMode('code')
                  }}
                  className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${
                    editorMode === 'code' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Code mode - edit raw HTML"
                >
                  <FileCode size={14} /> Code
                </button>
              </div>
              {/* Block type selector dropdown */}
              <div className="relative" ref={headingDropdownRef}>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowHeadingDropdown(!showHeadingDropdown)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-w-[120px]"
                >
                  <Type size={14} className="text-gray-500 shrink-0" />
                  <span className="text-sm font-medium text-gray-700">
                    {activeBlockTag === 'p' ? 'Paragraph' : activeBlockTag.toUpperCase()}
                  </span>
                  <ChevronDown size={12} className="text-gray-400 ml-auto shrink-0" />
                </button>
                {showHeadingDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden">
                    {[
                      { tag: 'p',  label: 'Paragraph', size: 'text-sm', weight: 'font-normal' },
                      { tag: 'h1', label: 'Heading 1', size: 'text-xl', weight: 'font-bold' },
                      { tag: 'h2', label: 'Heading 2', size: 'text-lg', weight: 'font-bold' },
                      { tag: 'h3', label: 'Heading 3', size: 'text-base', weight: 'font-bold' },
                      { tag: 'h4', label: 'Heading 4', size: 'text-sm', weight: 'font-semibold' },
                      { tag: 'h5', label: 'Heading 5', size: 'text-xs', weight: 'font-semibold' },
                      { tag: 'h6', label: 'Heading 6', size: 'text-xs', weight: 'font-medium' },
                    ].map(({ tag, label, size, weight }) => (
                      <button
                        key={tag}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          formatText(tag)
                          setShowHeadingDropdown(false)
                        }}
                        className={`w-full text-left px-4 py-2 transition-colors flex items-center justify-between ${
                          activeBlockTag === tag
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span className={`${size} ${weight}`}>{label}</span>
                        {tag !== 'p' && (
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide">{tag}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              {/* Text formatting */}
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('bold') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Bold (Ctrl+B)"
              >
                <Bold size={18} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('italic') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Italic (Ctrl+I)"
              >
                <Italic size={18} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('underline') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Underline (Ctrl+U)"
              >
                <UnderlineIcon size={18} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('strikethrough') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Strikethrough"
              >
                <Strikethrough size={18} />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              {/* Lists */}
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('list') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Bullet List"
              >
                <List size={18} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('ordered-list') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Numbered List"
              >
                <ListOrdered size={18} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('quote') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Blockquote"
              >
                <Quote size={18} />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              {/* Insert */}
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('link') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Insert Link"
              >
                <Link2 size={18} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('code') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Inline Code"
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
              <div className="w-px h-6 bg-gray-300 mx-1" />
              {/* Undo/Redo */}
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('undo') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Undo"
              >
                <Undo2 size={18} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('redo') }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Redo"
              >
                <Redo2 size={18} />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              {/* Column Layouts */}
              <button
                onMouseDown={(e) => { e.preventDefault(); saveSelection(); insertColumns(2) }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="2 Columns"
              >
                <Columns2 size={18} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); saveSelection(); insertColumns(3) }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="3 Columns"
              >
                <Columns3 size={18} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); saveSelection(); insertColumns(4) }}
                className="p-2 hover:bg-white rounded transition-colors"
                title="4 Columns"
              >
                <Columns4 size={18} />
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
                className="w-full text-2xl md:text-4xl font-bold border-none outline-none focus:ring-0 placeholder-gray-300"
                placeholder="Add title"
              />
              <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                <span>Permalink:</span>
                <span className="text-gray-400">/</span>
                <input
                  type="text"
                  value={article.slug || slugify(article.title || '')}
                  onChange={(e) => updateField('slug', slugify(e.target.value))}
                  className="text-indigo-600 border-b border-dashed border-gray-300 focus:border-indigo-500 outline-none bg-transparent text-sm px-0 py-0 min-w-[120px]"
                  placeholder="article-slug"
                />
              </div>
            </div>

            {/* Content Editor - Visual / Code modes */}
            <div className="mb-6">
              {editorMode === 'visual' ? (
                <div
                  className="relative"
                  onMouseMove={handleEditorMouseMove}
                  onMouseLeave={handleEditorMouseLeave}
                >
                  {/* Block drag handle */}
                  {blockHandlePos && (
                    <div
                      ref={gripHandleRef}
                      className={`absolute z-20 hidden md:flex items-center justify-center w-6 h-6 select-none rounded transition-colors ${
                        isDraggingBlock
                          ? 'cursor-grabbing text-indigo-500'
                          : 'cursor-grab text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                      }`}
                      style={{ top: blockHandlePos.top + 2, left: blockHandlePos.left }}
                      onMouseDown={handleGripMouseDown}
                      onMouseLeave={(e) => {
                        if (isDraggingBlock) return
                        const relatedTarget = e.relatedTarget as Node | null
                        if (!relatedTarget || !editorRef.current || !editorRef.current.contains(relatedTarget as Node)) {
                          setHoveredBlock(null)
                          setBlockHandlePos(null)
                        }
                      }}
                    >
                      <GripVertical size={14} />
                    </div>
                  )}

                  {/* Drop indicator line */}
                  {isDraggingBlock && dragOverIndex !== null && (
                    <div
                      className="absolute left-2 right-2 h-0.5 bg-indigo-500 z-30 pointer-events-none rounded-full"
                      style={{ top: getDropIndicatorTop() }}
                    />
                  )}

                  <div
                    ref={editorRef}
                    id="visual-editor"
                    className="w-full min-h-[300px] md:min-h-[600px] border border-gray-200 rounded-lg px-4 md:pl-10 md:pr-6 py-4 text-base leading-relaxed focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent overflow-y-auto bg-white prose prose-base max-w-none
                      prose-headings:text-gray-900 prose-headings:font-bold prose-headings:mt-6 prose-headings:mb-3
                      prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-h5:text-base prose-h6:text-sm
                      prose-p:text-gray-700 prose-p:my-3
                      prose-a:text-indigo-600 prose-a:underline
                      prose-strong:text-gray-900 prose-strong:font-bold
                      prose-em:italic
                      prose-blockquote:border-l-4 prose-blockquote:border-indigo-400 prose-blockquote:bg-indigo-50/50 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:my-4 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-blockquote:text-gray-600
                      prose-ul:list-disc prose-ul:pl-6 prose-ul:my-3
                      prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-3
                      prose-li:my-1 prose-li:text-gray-700
                      prose-code:bg-gray-100 prose-code:text-rose-600 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
                      prose-img:rounded-lg prose-img:shadow-sm prose-img:my-4"
                    contentEditable
                    suppressContentEditableWarning
                    onKeyDown={handleEditorKeyDown}
                    onInput={() => {
                      setHasUnsavedChanges(true)
                    }}
                    onBlur={(e) => {
                      const html = e.currentTarget.innerHTML
                      lastSyncedContentRef.current = html
                      updateField('content', html)
                    }}
                  />
                </div>
              ) : (
                <textarea
                  id="article-content"
                  value={article.content || ''}
                  onChange={(e) => updateField('content', e.target.value)}
                  className="w-full min-h-[300px] md:min-h-[600px] border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-gray-50"
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

          {/* Mobile FAB — toggle sidebar */}
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="md:hidden fixed bottom-6 right-6 z-20 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-600/30 flex items-center justify-center hover:bg-indigo-700 transition-colors"
          >
            <FileText size={22} />
          </button>

          {/* Mobile sidebar backdrop */}
          {showMobileSidebar && (
            <div
              className="md:hidden fixed inset-0 bg-black/30 z-30"
              onClick={() => setShowMobileSidebar(false)}
            />
          )}

          {/* Right: Sidebar (30%) — bottom sheet on mobile, side panel on desktop */}
          <div className={`
            fixed md:relative inset-x-0 bottom-0 z-40
            md:inset-auto md:z-auto
            w-full md:w-[400px]
            max-h-[85vh] md:max-h-none
            border-t md:border-t-0 md:border-l border-gray-200
            flex flex-col overflow-hidden shrink-0
            bg-white md:bg-transparent
            rounded-t-2xl md:rounded-none
            shadow-2xl md:shadow-none
            transition-transform duration-300 ease-in-out
            ${showMobileSidebar ? 'translate-y-0' : 'translate-y-full'}
            md:translate-y-0
          `}>
            {/* Mobile handle + close */}
            <div className="md:hidden flex items-center justify-between px-4 pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
            </div>
            <div className="md:hidden flex items-center justify-between px-4 pb-2">
              <h3 className="text-sm font-bold text-gray-900">SEO & Metadata</h3>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

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
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
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

                  {/* SEO Analysis History */}
                  {analysisHistory.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">SEO Analysis History</h4>
                      <div className="space-y-2">
                        {analysisHistory.slice(0, 5).map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                entry.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                entry.score >= 50 ? 'bg-amber-100 text-amber-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                                {entry.score}
                              </div>
                              <span className="text-gray-500">Score</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock size={12} />
                              {new Date(entry.analyzed_at).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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

        {/* Floating Selection Toolbar (Notion-style) */}
        {floatingToolbar.show && editorMode === 'visual' && (
          <div
            ref={floatingToolbarRef}
            className="fixed z-[55] animate-in fade-in duration-150"
            style={{
              left: `${floatingToolbar.x}px`,
              top: `${floatingToolbar.y < 60 ? floatingToolbar.y + 30 : floatingToolbar.y - 48}px`,
              transform: 'translateX(-50%)',
            }}
            onPointerDown={saveSelection}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-0.5 bg-[#1a1b23] text-white rounded-xl shadow-2xl px-1.5 py-1 border border-white/10">
              {/* Turn Into dropdown */}
              <div className="relative">
                <button
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowFloatingTurnInto(!showFloatingTurnInto)
                  }}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Type size={14} />
                  <span className="hidden sm:inline text-[11px]">Turn into</span>
                  <ChevronDown size={10} />
                </button>
                {showFloatingTurnInto && (
                  <div className="absolute bottom-full left-0 mb-2 bg-[#1a1b23] border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[170px]">
                    {[
                      { tag: 'p', label: 'Text', cls: 'text-sm' },
                      { tag: 'h1', label: 'Heading 1', cls: 'text-base font-bold' },
                      { tag: 'h2', label: 'Heading 2', cls: 'text-sm font-bold' },
                      { tag: 'h3', label: 'Heading 3', cls: 'text-sm font-semibold' },
                      { tag: 'h4', label: 'Heading 4', cls: 'text-xs font-semibold' },
                    ].map(({ tag, label, cls }) => (
                      <button
                        key={tag}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          formatText(tag)
                        }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-white/10 text-white/90 transition-colors ${cls}`}
                      >
                        {label}
                      </button>
                    ))}
                    <div className="h-px bg-white/10 my-1 mx-2" />
                    {[
                      { format: 'list', label: 'Bullet List' },
                      { format: 'ordered-list', label: 'Numbered List' },
                      { format: 'quote', label: 'Quote' },
                    ].map(({ format, label }) => (
                      <button
                        key={format}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          formatText(format)
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-white/90 text-sm transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-5 bg-white/20 mx-0.5" />

              {/* Inline formatting */}
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('bold') }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title="Bold"
              >
                <Bold size={15} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('italic') }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title="Italic"
              >
                <Italic size={15} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('underline') }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title="Underline"
              >
                <UnderlineIcon size={15} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('strikethrough') }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title="Strikethrough"
              >
                <Strikethrough size={15} />
              </button>

              <div className="w-px h-5 bg-white/20 mx-0.5" />

              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('link') }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title="Link"
              >
                <Link2 size={15} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); formatText('code') }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title="Code"
              >
                <Code size={15} />
              </button>

              <div className="w-px h-5 bg-white/20 mx-0.5" />

              {/* AI Rewrite button */}
              <div className="relative">
                <button
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowAIMenu(prev => !prev)
                    setShowToneSubmenu(false)
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${showAIMenu ? 'bg-purple-500/30' : 'hover:bg-white/10'}`}
                  title="AI Tools"
                >
                  {aiRewriting ? (
                    <Loader2 size={15} className="animate-spin text-purple-400" />
                  ) : (
                    <Sparkles size={15} className="text-purple-400" />
                  )}
                </button>

                {/* AI dropdown menu */}
                {showAIMenu && !aiRewriting && (
                  <div
                    className="absolute bottom-full right-0 mb-2 bg-[#1a1b23] border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[200px] z-[60]"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <button
                      onMouseDown={(e) => { e.preventDefault(); handleAIRewrite('improve') }}
                      className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/90 text-sm transition-colors flex items-center gap-2"
                    >
                      <Wand2 size={14} className="text-purple-400" /> Improve Writing
                    </button>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); handleAIRewrite('simplify') }}
                      className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/90 text-sm transition-colors flex items-center gap-2"
                    >
                      <Type size={14} className="text-blue-400" /> Simplify Language
                    </button>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); handleAIRewrite('proofread') }}
                      className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/90 text-sm transition-colors flex items-center gap-2"
                    >
                      <Check size={14} className="text-emerald-400" /> Proofread
                    </button>

                    <div className="h-px bg-white/10 my-1 mx-2" />

                    <button
                      onMouseDown={(e) => { e.preventDefault(); handleAIRewrite('make_longer') }}
                      className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/90 text-sm transition-colors flex items-center gap-2"
                    >
                      <Plus size={14} className="text-amber-400" /> Make Longer
                    </button>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); handleAIRewrite('make_shorter') }}
                      className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/90 text-sm transition-colors flex items-center gap-2"
                    >
                      <Minus size={14} className="text-amber-400" /> Make Shorter
                    </button>

                    <div className="h-px bg-white/10 my-1 mx-2" />

                    {/* Change Tone with submenu */}
                    <div className="relative">
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setShowToneSubmenu(prev => !prev)
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/90 text-sm transition-colors flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <RefreshCw size={14} className="text-indigo-400" /> Change Tone
                        </span>
                        <ChevronDown size={12} className={`transition-transform ${showToneSubmenu ? 'rotate-180' : ''}`} />
                      </button>
                      {showToneSubmenu && (
                        <div className="px-2 pb-1">
                          {['Professional', 'Casual', 'Straightforward', 'Confident', 'Friendly'].map(t => (
                            <button
                              key={t}
                              onMouseDown={(e) => { e.preventDefault(); handleAIRewrite('change_tone', t.toLowerCase()) }}
                              className="w-full text-left px-3 py-1.5 hover:bg-white/10 text-white/70 text-xs transition-colors rounded"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Arrow pointing down */}
            <div
              className="w-3 h-3 bg-[#1a1b23] rotate-45 mx-auto -mt-1.5 border-r border-b border-white/10"
              style={{ display: floatingToolbar.y < 60 ? 'none' : 'block' }}
            />
          </div>
        )}

        {/* Link Dialog */}
        {showLinkDialog && (
          <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-4" onClick={() => setShowLinkDialog(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[420px] p-4 md:p-6" onClick={(e) => e.stopPropagation()}>
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
