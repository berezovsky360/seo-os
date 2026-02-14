'use client'

import { useState, useRef, useCallback } from 'react'
import { Sparkles, Eye, Code, Loader2, Upload, Send, Monitor, Tablet, Smartphone, AlertCircle, X } from 'lucide-react'
import { useAIGenerate } from '@/hooks/useLandingEngine'

interface AIPageEditorProps {
  content: string
  onChange: (html: string) => void
  siteId: string
}

type ViewMode = 'generate' | 'preview' | 'code'
type PreviewWidth = 'desktop' | 'tablet' | 'mobile'

interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

interface RefImage {
  data: string
  mime: string
  name: string
}

const MAX_IMAGES = 10

const PREVIEW_WIDTHS: Record<PreviewWidth, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
}

export default function AIPageEditor({ content, onChange, siteId }: AIPageEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(content ? 'preview' : 'generate')
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>('desktop')
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [images, setImages] = useState<RefImage[]>([])
  const [lastCost, setLastCost] = useState<number | null>(null)
  const [lastModel, setLastModel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const aiGenerate = useAIGenerate()

  const addImages = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (fileArray.length === 0) return

    setImages(prev => {
      const remaining = MAX_IMAGES - prev.length
      if (remaining <= 0) return prev
      const toAdd = fileArray.slice(0, remaining)

      // Read all files and update state
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
      return prev // actual update happens in reader.onload
    })
  }, [])

  const removeImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) {
      addImages(e.dataTransfer.files)
    }
  }, [addImages])

  const handleGenerate = useCallback(async () => {
    setError(null)

    if (images.length > 0) {
      // Reference mode
      aiGenerate.mutate(
        {
          mode: 'reference',
          referenceImages: images.map(img => ({ data: img.data, mime: img.mime })),
          prompt: prompt || undefined,
        },
        {
          onSuccess: (data) => {
            onChange(data.html)
            setLastCost(data.estimated_cost)
            setLastModel(data.model || null)
            setMessages([
              { role: 'user', text: prompt || `Generate from ${images.length} reference image${images.length > 1 ? 's' : ''}` },
              { role: 'model', text: '(generated HTML)' },
            ])
            setViewMode('preview')
          },
          onError: (err) => setError(err.message),
        }
      )
    } else if (prompt.trim()) {
      // Prompt mode
      aiGenerate.mutate(
        { mode: 'prompt', prompt },
        {
          onSuccess: (data) => {
            onChange(data.html)
            setLastCost(data.estimated_cost)
            setLastModel(data.model || null)
            setMessages([
              { role: 'user', text: prompt },
              { role: 'model', text: '(generated HTML)' },
            ])
            setViewMode('preview')
          },
          onError: (err) => setError(err.message),
        }
      )
    }
  }, [images, prompt, aiGenerate, onChange])

  const handleRefine = useCallback(async () => {
    if (!prompt.trim() || !content) return
    setError(null)

    const newMessages = [...messages, { role: 'user' as const, text: prompt }]

    aiGenerate.mutate(
      { mode: 'refine', prompt, currentHtml: content, history: messages },
      {
        onSuccess: (data) => {
          onChange(data.html)
          setLastCost(data.estimated_cost)
          setLastModel(data.model || null)
          setMessages([...newMessages, { role: 'model', text: '(updated HTML)' }])
          setPrompt('')
          setViewMode('preview')
        },
        onError: (err) => setError(err.message),
      }
    )
  }, [prompt, content, messages, aiGenerate, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (content && messages.length > 0) {
        handleRefine()
      } else {
        handleGenerate()
      }
    }
  }, [content, messages, handleRefine, handleGenerate])

  const tabs: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'generate', label: 'Generate', icon: <Sparkles size={14} /> },
    { key: 'preview', label: 'Preview', icon: <Eye size={14} /> },
    { key: 'code', label: 'HTML', icon: <Code size={14} /> },
  ]

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        {/* Preview width toggle */}
        {viewMode === 'preview' && (
          <div className="flex gap-1">
            {([
              { key: 'desktop' as PreviewWidth, icon: <Monitor size={14} /> },
              { key: 'tablet' as PreviewWidth, icon: <Tablet size={14} /> },
              { key: 'mobile' as PreviewWidth, icon: <Smartphone size={14} /> },
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
        {/* Cost + model indicator */}
        {lastCost !== null && (
          <span className="text-[10px] text-gray-400 flex items-center gap-1.5">
            {lastModel && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{lastModel.replace('gemini-', '')}</span>}
            {lastCost > 0 && <span>~${lastCost.toFixed(4)}</span>}
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Generate tab */}
        {viewMode === 'generate' && (
          <div className="h-full flex flex-col p-5">
            {/* Reference images upload zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`border-2 border-dashed rounded-xl text-center hover:border-indigo-300 transition-colors cursor-pointer mb-4 ${
                images.length >= MAX_IMAGES ? 'border-gray-100 bg-gray-50 cursor-default' : 'border-gray-200'
              }`}
              onClick={() => images.length < MAX_IMAGES && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    addImages(e.target.files)
                  }
                  e.target.value = ''
                }}
              />

              {images.length > 0 ? (
                <div className="p-4">
                  <div className="flex flex-wrap gap-3 justify-center">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={`data:${img.mime};base64,${img.data}`}
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeImage(idx)
                          }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <X size={10} />
                        </button>
                        <div className="text-[9px] text-gray-400 text-center mt-1 max-w-[80px] truncate">
                          {img.name}
                        </div>
                      </div>
                    ))}
                    {images.length < MAX_IMAGES && (
                      <div
                        className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-300 hover:border-indigo-300 hover:text-indigo-400 transition-colors"
                      >
                        <Upload size={16} />
                        <span className="text-[9px] mt-1">Add more</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    {images.length}/{MAX_IMAGES} images
                  </p>
                </div>
              ) : (
                <div className="p-6">
                  <Upload size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Upload reference screenshots</p>
                  <p className="text-xs text-gray-400 mt-1">Drag & drop or click to browse. Up to {MAX_IMAGES} images. AI will recreate the design.</p>
                </div>
              )}
            </div>

            {/* Prompt input */}
            <div className="flex-1 flex flex-col">
              {/* Chat history */}
              {messages.length > 0 && (
                <div className="flex-1 overflow-y-auto space-y-2 mb-3 max-h-60">
                  {messages.filter(m => m.role === 'user').map((msg, i) => (
                    <div key={i} className="flex justify-end">
                      <div className="bg-indigo-50 text-indigo-900 text-xs px-3 py-1.5 rounded-lg max-w-[80%]">
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {/* Input area */}
              <div className="flex items-end gap-2">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    content && messages.length > 0
                      ? 'Refine: "change the headline to...", "make it more modern", "add a pricing section"'
                      : images.length > 0
                        ? 'Optional: add specific instructions for the AI...'
                        : 'Describe the landing page you want to create...'
                  }
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <button
                  onClick={content && messages.length > 0 ? handleRefine : handleGenerate}
                  disabled={aiGenerate.isPending || (!prompt.trim() && images.length === 0)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 h-[42px]"
                >
                  {aiGenerate.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : content && messages.length > 0 ? (
                    <Send size={14} />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {aiGenerate.isPending
                    ? 'Generating...'
                    : content && messages.length > 0
                      ? 'Refine'
                      : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview tab */}
        {viewMode === 'preview' && (
          <div className="h-full flex items-start justify-center p-4 bg-gray-50 overflow-auto">
            {content ? (
              <iframe
                srcDoc={content}
                sandbox="allow-same-origin"
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
                  Switch to the Generate tab to create content with AI
                </p>
              </div>
            )}
          </div>
        )}

        {/* HTML Code tab */}
        {viewMode === 'code' && (
          <div className="h-full p-4">
            <textarea
              value={content}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-full px-4 py-3 font-mono text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="<section>&#10;  <h1>Your landing page HTML here...</h1>&#10;</section>"
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}
