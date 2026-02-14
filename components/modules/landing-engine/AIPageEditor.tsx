'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Sparkles, Eye, Code, Loader2, Upload, Send, Monitor, Tablet, Smartphone,
  AlertCircle, X, CheckCircle2, XCircle, History, Square, ChevronDown, Circle,
  ChevronRight, Clock, Zap, Image as ImageIcon, PanelLeftClose, PanelLeftOpen,
  RotateCcw, Copy, Download, Maximize2, Minimize2,
} from 'lucide-react'
import { useAIGenerate } from '@/hooks/useLandingEngine'

// ====== Types ======

interface AIPageEditorProps {
  content: string
  onChange: (html: string) => void
  siteId: string
}

type PreviewMode = 'preview' | 'code'
type PreviewWidth = 'desktop' | 'tablet' | 'mobile'

interface ChatMessage { role: 'user' | 'model'; text: string; timestamp?: Date }
interface RefImage { data: string; mime: string; name: string }

interface LogEntry {
  timestamp: Date
  mode: 'reference' | 'prompt' | 'refine'
  description: string
  imageCount: number
  status: 'success' | 'error' | 'cancelled'
  error?: string
  model?: string
  totalTokens?: number
  cost?: number
  durationMs: number
  thinkingMs?: number
}

// ====== Constants ======

const MAX_IMAGES = 10
const GENERATION_TIMEOUT = 300_000 // 5 minutes

const PREVIEW_WIDTHS: Record<PreviewWidth, number> = {
  desktop: 1280, tablet: 768, mobile: 375,
}

const fmtElapsed = (ms: number) => {
  const s = ms / 1000
  return s < 60 ? `${s.toFixed(0)}s` : `${Math.floor(s / 60)}m ${(s % 60).toFixed(0)}s`
}

// Quick suggestion chips
const QUICK_SUGGESTIONS = [
  { label: 'AI Features', prompt: 'Add an AI-powered features section with icons and descriptions' },
  { label: 'Add CTA section', prompt: 'Add a bold call-to-action section before the footer' },
  { label: 'Testimonials', prompt: 'Add a testimonials section with 3 customer reviews and star ratings' },
  { label: 'Pricing table', prompt: 'Add a 3-tier pricing table (Basic, Pro, Enterprise)' },
  { label: 'FAQ section', prompt: 'Add a FAQ section with 5 common questions' },
]

// ====== Component ======

export default function AIPageEditor({ content, onChange, siteId }: AIPageEditorProps) {
  // Layout
  const [chatOpen, setChatOpen] = useState(true)
  const [previewMode, setPreviewMode] = useState<PreviewMode>('preview')
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>('desktop')
  const [fullscreen, setFullscreen] = useState(false)

  // Chat
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [images, setImages] = useState<RefImage[]>([])

  // Generation
  const [lastCost, setLastCost] = useState<number | null>(null)
  const [lastModel, setLastModel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [genMode, setGenMode] = useState<string | null>(null)
  const [genImageCount, setGenImageCount] = useState(0)
  const [thinkingCollapsed, setThinkingCollapsed] = useState(false)

  // History
  const [requestLog, setRequestLog] = useState<LogEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const aiGenerate = useAIGenerate()

  // ── Elapsed time ticker ──
  useEffect(() => {
    if (!aiGenerate.isPending) return
    const id = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 100)
    return () => clearInterval(id)
  }, [aiGenerate.isPending])

  // ── Auto-scroll chat ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiGenerate.isPending])

  // ── Cleanup on unmount ──
  useEffect(() => () => {
    abortControllerRef.current?.abort()
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  // ── Image handlers ──

  const addImages = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (fileArray.length === 0) return
    setImages(prev => {
      const remaining = MAX_IMAGES - prev.length
      if (remaining <= 0) return prev
      const toAdd = fileArray.slice(0, remaining)
      for (const file of toAdd) {
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          setImages(current => {
            if (current.length >= MAX_IMAGES) return current
            return [...current, { data: base64, mime: file.type, name: file.name }]
          })
        }
        reader.readAsDataURL(file)
      }
      return prev
    })
  }, [])

  const removeImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) addImages(e.dataTransfer.files)
  }, [addImages])

  // ── Generation lifecycle ──

  const beginGeneration = useCallback((mode: string, imageCount: number) => {
    abortControllerRef.current?.abort()
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    setError(null)
    startTimeRef.current = Date.now()
    setElapsedMs(0)
    setGenMode(mode)
    setGenImageCount(imageCount)
    setThinkingCollapsed(false)

    const controller = new AbortController()
    abortControllerRef.current = controller
    timeoutRef.current = setTimeout(() => controller.abort(), GENERATION_TIMEOUT)
    return controller
  }, [])

  const logResult = useCallback((
    mode: 'reference' | 'prompt' | 'refine',
    description: string,
    imageCount: number,
    status: 'success' | 'error' | 'cancelled',
    extra?: { model?: string; totalTokens?: number; cost?: number; error?: string }
  ) => {
    const durationMs = Date.now() - startTimeRef.current
    setGenMode(null)
    abortControllerRef.current = null
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    setRequestLog(prev => [{
      timestamp: new Date(), mode, description, imageCount, status, durationMs,
      thinkingMs: durationMs,
      ...(extra || {}),
    }, ...prev].slice(0, 50))
  }, [])

  // ── Generate / Refine / Cancel ──

  const handleGenerate = useCallback((overridePrompt?: string) => {
    const usedPrompt = overridePrompt || prompt
    if (images.length > 0) {
      const desc = usedPrompt || `Generate from ${images.length} image${images.length > 1 ? 's' : ''}`
      setMessages(prev => [...prev, { role: 'user', text: desc, timestamp: new Date() }])
      const ctrl = beginGeneration('reference', images.length)
      aiGenerate.mutate(
        { mode: 'reference', referenceImages: images.map(i => ({ data: i.data, mime: i.mime })), prompt: usedPrompt || undefined, signal: ctrl.signal },
        {
          onSuccess: (data) => {
            onChange(data.html)
            setLastCost(data.estimated_cost)
            setLastModel(data.model || null)
            setMessages(prev => [...prev, { role: 'model', text: '(generated HTML)', timestamp: new Date() }])
            setPrompt('')
            logResult('reference', desc, images.length, 'success', {
              model: data.model, totalTokens: data.usage?.total_tokens, cost: data.estimated_cost,
            })
          },
          onError: (err: Error) => {
            setError(err.message)
            logResult('reference', desc, images.length, err.message.includes('cancelled') ? 'cancelled' : 'error', { error: err.message })
          },
        }
      )
    } else if (usedPrompt.trim()) {
      setMessages(prev => [...prev, { role: 'user', text: usedPrompt, timestamp: new Date() }])
      const ctrl = beginGeneration(content && messages.length > 0 ? 'refine' : 'prompt', 0)
      const mode = content && messages.length > 0 ? 'refine' as const : 'prompt' as const
      const params = mode === 'refine'
        ? { mode, prompt: usedPrompt, currentHtml: content, history: messages.filter(m => m.role === 'user' || m.role === 'model').map(m => ({ role: m.role, text: m.text })), signal: ctrl.signal }
        : { mode, prompt: usedPrompt, signal: ctrl.signal }
      aiGenerate.mutate(params, {
        onSuccess: (data) => {
          onChange(data.html)
          setLastCost(data.estimated_cost)
          setLastModel(data.model || null)
          setMessages(prev => [...prev, { role: 'model', text: '(updated HTML)', timestamp: new Date() }])
          setPrompt('')
          logResult(mode, usedPrompt, 0, 'success', {
            model: data.model, totalTokens: data.usage?.total_tokens, cost: data.estimated_cost,
          })
        },
        onError: (err: Error) => {
          setError(err.message)
          logResult(mode, usedPrompt, 0, err.message.includes('cancelled') ? 'cancelled' : 'error', { error: err.message })
        },
      })
    }
  }, [images, prompt, content, messages, aiGenerate, onChange, beginGeneration, logResult])

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }, [handleGenerate])

  const handleSuggestion = useCallback((suggestion: string) => {
    setPrompt(suggestion)
    handleGenerate(suggestion)
  }, [handleGenerate])

  const handleCopyHtml = useCallback(() => {
    navigator.clipboard.writeText(content)
  }, [content])

  const handleDownloadHtml = useCallback(() => {
    const blob = new Blob([content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'landing-page.html'
    a.click()
    URL.revokeObjectURL(url)
  }, [content])

  const handleNewChat = useCallback(() => {
    setMessages([])
    setImages([])
    setPrompt('')
    setError(null)
    setLastCost(null)
    setLastModel(null)
  }, [])

  // ── Render ──

  return (
    <div className={`flex h-full bg-[#F8F9FA] rounded-xl border border-gray-200 overflow-hidden ${fullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
      {/* ════════════ LEFT PANEL: Chat ════════════ */}
      {chatOpen && (
        <div className="w-[380px] min-w-[320px] max-w-[440px] flex flex-col bg-white border-r border-gray-200">
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Sparkles size={12} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Code assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {requestLog.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`p-1.5 rounded-md transition-colors ${showHistory ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                  title="History"
                >
                  <History size={14} />
                </button>
              )}
              {messages.length > 0 && (
                <button onClick={handleNewChat} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors" title="New chat">
                  <RotateCcw size={14} />
                </button>
              )}
              <button onClick={() => setChatOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors" title="Close panel">
                <PanelLeftClose size={14} />
              </button>
            </div>
          </div>

          {/* Chat body */}
          <div className="flex-1 overflow-y-auto">
            {/* ── History overlay ── */}
            {showHistory && requestLog.length > 0 && (
              <div className="border-b border-gray-100">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                  <span className="text-xs font-semibold text-gray-600">History ({requestLog.length})</span>
                  <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                  {requestLog.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 px-4 py-2 text-xs">
                      {entry.status === 'success' ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> :
                       entry.status === 'cancelled' ? <XCircle size={12} className="text-amber-500 shrink-0" /> :
                       <XCircle size={12} className="text-red-500 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-700 truncate">{entry.description.substring(0, 60)}</p>
                        <div className="flex items-center gap-2 text-gray-400 mt-0.5">
                          {entry.model && <span>{entry.model.replace('gemini-', '')}</span>}
                          <span>{fmtElapsed(entry.durationMs)}</span>
                          {entry.cost != null && entry.cost > 0 && <span>${entry.cost.toFixed(4)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* Image upload zone — compact when images exist */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className={`border-2 border-dashed rounded-xl text-center transition-colors cursor-pointer ${
                  images.length >= MAX_IMAGES ? 'border-gray-100 bg-gray-50 cursor-default' :
                  images.length > 0 ? 'border-gray-200 hover:border-indigo-300' : 'border-gray-200 hover:border-indigo-300'
                }`}
                onClick={() => images.length < MAX_IMAGES && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => {
                    if (e.target.files?.length) addImages(e.target.files)
                    e.target.value = ''
                  }}
                />
                {images.length > 0 ? (
                  <div className="p-3">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                            <img src={`data:${img.mime};base64,${img.data}`} alt={img.name} className="w-full h-full object-cover" />
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); removeImage(idx) }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={8} />
                          </button>
                        </div>
                      ))}
                      {images.length < MAX_IMAGES && (
                        <div className="w-14 h-14 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-300 hover:border-indigo-300 hover:text-indigo-400 transition-colors">
                          <Upload size={14} />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">{images.length}/{MAX_IMAGES} references</p>
                  </div>
                ) : (
                  <div className="p-4">
                    <ImageIcon size={20} className="mx-auto text-gray-300 mb-1.5" />
                    <p className="text-xs text-gray-500 font-medium">Upload reference screenshots</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Drop or click. Up to {MAX_IMAGES} images.</p>
                  </div>
                )}
              </div>

              {/* ── Chat messages ── */}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-700 rounded-bl-md'
                  }`}>
                    {msg.role === 'model' ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        <span className="text-xs">
                          {lastModel && <span className="text-gray-500">{lastModel.replace('gemini-', '')} · </span>}
                          Generated HTML
                          {lastCost != null && lastCost > 0 && <span className="text-gray-400"> · ${lastCost.toFixed(4)}</span>}
                        </span>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* ── Thinking indicator (AI Studio style) ── */}
              {aiGenerate.isPending && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setThinkingCollapsed(!thinkingCollapsed)}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <Loader2 size={14} className="text-indigo-500 animate-spin shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-700">
                        {genMode === 'reference'
                          ? `${lastModel?.replace('gemini-', '') || 'Gemini'} · Processing ${genImageCount} image${genImageCount > 1 ? 's' : ''}...`
                          : genMode === 'refine'
                            ? `${lastModel?.replace('gemini-', '') || 'Gemini'} · Refining...`
                            : `${lastModel?.replace('gemini-', '') || 'Gemini'} · Generating...`}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-gray-400 tabular-nums shrink-0">
                      {fmtElapsed(elapsedMs)}
                    </span>
                    <ChevronRight size={12} className={`text-gray-400 transition-transform ${thinkingCollapsed ? '' : 'rotate-90'}`} />
                  </button>

                  {!thinkingCollapsed && (
                    <div className="px-4 pb-3 space-y-2.5">
                      {/* Thinking steps */}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock size={11} className="shrink-0" />
                        <span>Thought for {fmtElapsed(elapsedMs)}</span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-400 to-blue-500 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${Math.min(95, (elapsedMs / GENERATION_TIMEOUT) * 100)}%` }}
                        />
                      </div>

                      {/* Cancel button */}
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                      >
                        <Square size={10} />
                        Stop
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Last completed generation summary (AI Studio style) ── */}
              {!aiGenerate.isPending && requestLog.length > 0 && requestLog[0].status === 'success' && messages.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2.5 px-4 py-2.5">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0 text-xs text-gray-600">
                      <span className="font-medium">{requestLog[0].model?.replace('gemini-', '') || 'Gemini'}</span>
                      <span className="text-gray-400"> · Ran for {fmtElapsed(requestLog[0].durationMs)}</span>
                    </div>
                  </div>
                  <div className="px-4 pb-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Zap size={11} />
                      <span>Edited 1 file</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-gray-400 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                      <Code size={10} />
                      <span>index.html</span>
                      <CheckCircle2 size={10} className="text-emerald-400 ml-auto" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && !aiGenerate.isPending && (
                <div className="flex items-start gap-2 bg-red-50 text-red-700 text-xs px-3 py-2.5 rounded-xl border border-red-100">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{error}</p>
                    {requestLog.length > 0 && requestLog[0].durationMs > 0 && requestLog[0].status !== 'success' && (
                      <p className="text-red-500 mt-0.5">After {fmtElapsed(requestLog[0].durationMs)}</p>
                    )}
                  </div>
                  <button onClick={() => setError(null)} className="shrink-0 hover:text-red-900"><X size={12} /></button>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* ── Quick suggestions (AI Studio style chips) ── */}
          {!aiGenerate.isPending && content && messages.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-50 overflow-x-auto">
              <div className="flex gap-1.5 whitespace-nowrap">
                {QUICK_SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(s.prompt)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 text-[11px] font-medium rounded-full transition-colors shrink-0"
                  >
                    {i === 0 && <Sparkles size={10} className="text-indigo-500" />}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Input area (bottom) ── */}
          <div className="border-t border-gray-200 px-4 py-3 bg-white">
            <div className="flex items-end gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                title="Attach images"
              >
                <ImageIcon size={16} />
              </button>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={aiGenerate.isPending}
                placeholder="Make changes, add new features, ask for anything"
                rows={1}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-50 disabled:bg-gray-50 max-h-32 overflow-y-auto"
                style={{ minHeight: '38px' }}
                onInput={(e) => {
                  const t = e.currentTarget
                  t.style.height = '38px'
                  t.style.height = Math.min(t.scrollHeight, 128) + 'px'
                }}
              />
              {aiGenerate.isPending ? (
                <button
                  onClick={handleCancel}
                  className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors shrink-0"
                  title="Stop"
                >
                  <Square size={16} />
                </button>
              ) : (
                <button
                  onClick={() => handleGenerate()}
                  disabled={!prompt.trim() && images.length === 0}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors shrink-0"
                  title="Generate"
                >
                  <Send size={16} />
                </button>
              )}
            </div>

            {/* Model info */}
            {lastModel && (
              <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{lastModel.replace('gemini-', '')}</span>
                {lastCost != null && lastCost > 0 && <span>~${lastCost.toFixed(4)}</span>}
                {requestLog.length > 0 && (
                  <span>{requestLog.length} request{requestLog.length > 1 ? 's' : ''}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════ RIGHT PANEL: Preview / Code ════════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Preview header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            {!chatOpen && (
              <button onClick={() => setChatOpen(true)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors mr-1" title="Open chat">
                <PanelLeftOpen size={14} />
              </button>
            )}
            {/* Preview / Code toggle (AI Studio style) */}
            <div className="flex bg-gray-100 p-0.5 rounded-lg">
              <button
                onClick={() => setPreviewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  previewMode === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {content && previewMode === 'preview' && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                Preview
              </button>
              <button
                onClick={() => setPreviewMode('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  previewMode === 'code' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Code
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Responsive toggles */}
            {previewMode === 'preview' && (
              <div className="flex gap-0.5 mr-2">
                {([
                  { key: 'desktop' as PreviewWidth, icon: <Monitor size={13} /> },
                  { key: 'tablet' as PreviewWidth, icon: <Tablet size={13} /> },
                  { key: 'mobile' as PreviewWidth, icon: <Smartphone size={13} /> },
                ]).map(({ key, icon }) => (
                  <button
                    key={key}
                    onClick={() => setPreviewWidth(key)}
                    className={`p-1.5 rounded-md transition-colors ${
                      previewWidth === key ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={key}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}

            {/* Code actions */}
            {previewMode === 'code' && content && (
              <>
                <button onClick={handleCopyHtml} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors" title="Copy HTML">
                  <Copy size={13} />
                </button>
                <button onClick={handleDownloadHtml} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors" title="Download HTML">
                  <Download size={13} />
                </button>
              </>
            )}

            {/* Fullscreen */}
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>

        {/* Preview/Code content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {previewMode === 'preview' ? (
            <div className="h-full flex items-start justify-center p-4 bg-[#F0F0F2] overflow-auto">
              {content ? (
                <iframe
                  srcDoc={content}
                  sandbox="allow-scripts allow-same-origin"
                  className="bg-white shadow-lg rounded-lg border border-gray-200 transition-all duration-300"
                  style={{
                    width: PREVIEW_WIDTHS[previewWidth],
                    maxWidth: '100%',
                    height: '100%',
                    minHeight: 600,
                  }}
                  title="Page Preview"
                />
              ) : (
                <div className="text-center py-20">
                  <Eye size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-500 font-medium">No content yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Use the chat to generate a landing page with AI
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full">
              <textarea
                value={content}
                onChange={e => onChange(e.target.value)}
                className="w-full h-full px-4 py-3 font-mono text-[13px] leading-relaxed text-gray-800 bg-[#1E1E2E] text-[#CDD6F4] border-0 resize-none focus:outline-none"
                placeholder={"<!-- Your landing page HTML here -->\n<section>\n  <h1>Hello World</h1>\n</section>"}
                spellCheck={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
