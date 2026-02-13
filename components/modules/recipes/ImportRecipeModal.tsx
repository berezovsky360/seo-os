'use client'

import React, { useState, useMemo, useRef } from 'react'
import {
  X, Download, Loader2, AlertTriangle, CheckCircle2,
  ArrowRight, Zap, FileJson, Upload, Link2
} from 'lucide-react'
import { useImportTemplate } from '@/hooks/useMarketplaceTemplates'
import { useToast } from '@/lib/contexts/ToastContext'

interface ImportRecipeModalProps {
  onClose: () => void
  onImported?: () => void
}

export default function ImportRecipeModal({ onClose, onImported }: ImportRecipeModalProps) {
  const [activeTab, setActiveTab] = useState<'json' | 'file' | 'url'>('json')
  const [jsonText, setJsonText] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const importTemplate = useImportTemplate()

  const parsed = useMemo(() => {
    if (!jsonText.trim()) return null
    try {
      const obj = JSON.parse(jsonText)
      if (!obj.name || !obj.trigger_event || !Array.isArray(obj.actions) || obj.actions.length === 0) {
        return { error: 'Missing required fields: name, trigger_event, actions' }
      }
      for (const action of obj.actions) {
        if (!action.module || !action.action) {
          return { error: 'Each action must have "module" and "action" fields' }
        }
      }
      return { data: obj }
    } catch {
      return { error: 'Invalid JSON' }
    }
  }, [jsonText])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      setJsonText(content)
      setActiveTab('json')
    }
    reader.readAsText(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      setJsonText(content)
      setActiveTab('json')
    }
    reader.readAsText(file)
  }

  const handleUrlFetch = async () => {
    if (!urlInput.trim()) return
    setUrlLoading(true)
    setUrlError('')
    try {
      const res = await fetch('/api/core/recipes/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUrlError(data.error || 'Failed to fetch')
        return
      }
      setJsonText(JSON.stringify(data, null, 2))
      setActiveTab('json')
      toast.success('Recipe loaded from URL')
    } catch (err: any) {
      setUrlError(err.message || 'Network error')
    } finally {
      setUrlLoading(false)
    }
  }

  const handleImport = async () => {
    if (!parsed || 'error' in parsed) return
    try {
      await importTemplate.mutateAsync(parsed.data)
      toast.success(`"${parsed.data.name}" imported to My Recipes`)
      onImported?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to import')
    }
  }

  const recipe = parsed && 'data' in parsed ? parsed.data : null

  const tabs = [
    { id: 'json' as const, label: 'Paste JSON', icon: <FileJson size={13} /> },
    { id: 'file' as const, label: 'Upload File', icon: <Upload size={13} /> },
    { id: 'url' as const, label: 'From URL', icon: <Link2 size={13} /> },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileJson size={18} className="text-indigo-600" />
            <h2 className="text-base font-bold text-gray-900">Import Recipe</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-colors ${
                activeTab === t.id
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* JSON tab */}
          {activeTab === 'json' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">Paste a recipe JSON to preview and import it into your recipes.</p>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={'{\n  "name": "My Recipe",\n  "trigger_event": "cron.job_executed",\n  "actions": [\n    { "module": "content-engine", "action": "poll_all_feeds", "params": {} }\n  ]\n}'}
                rows={8}
                className="w-full bg-gray-900 text-gray-100 font-mono text-xs p-4 rounded-xl outline-none resize-none placeholder-gray-600 focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          )}

          {/* File upload tab */}
          {activeTab === 'file' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600 mb-1">Drop a .json file here or click to browse</p>
              <p className="text-xs text-gray-400">The file content will be loaded into the JSON editor</p>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* URL tab */}
          {activeTab === 'url' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">Enter a URL pointing to a recipe JSON file.</p>
              <div className="flex gap-2">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/recipe.json"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlFetch()}
                />
                <button
                  onClick={handleUrlFetch}
                  disabled={!urlInput.trim() || urlLoading}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {urlLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Fetch
                </button>
              </div>
              {urlError && (
                <div className="flex items-center gap-2 mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  {urlError}
                </div>
              )}
            </div>
          )}

          {/* Validation feedback */}
          {parsed && 'error' in parsed && activeTab === 'json' && (
            <div className="flex items-center gap-2 mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="flex-shrink-0" />
              {parsed.error}
            </div>
          )}

          {/* Preview */}
          {recipe && (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={14} className="text-green-600" />
                <span className="text-xs font-bold text-green-700">Valid Recipe</span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{recipe.name}</h3>
              {recipe.description && (
                <p className="text-xs text-gray-500 mb-3">{recipe.description}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-medium rounded-lg border border-amber-200">
                  <Zap size={9} />
                  {recipe.trigger_event}
                </span>
                {recipe.actions.map((action: any, i: number) => (
                  <React.Fragment key={i}>
                    <ArrowRight size={10} className="text-gray-300" />
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-medium rounded-lg border border-emerald-200">
                      {action.module} → {action.action}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                {recipe.actions.length} action{recipe.actions.length !== 1 ? 's' : ''} • Will be imported as disabled
              </p>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!recipe || importTemplate.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 mt-4 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importTemplate.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <Download size={14} />
                Import Recipe
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
