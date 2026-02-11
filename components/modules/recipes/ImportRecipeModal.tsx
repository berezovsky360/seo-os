'use client'

import React, { useState, useMemo } from 'react'
import {
  X, Download, Loader2, AlertTriangle, CheckCircle2,
  ArrowRight, Zap, FileJson
} from 'lucide-react'
import { useImportTemplate } from '@/hooks/useMarketplaceTemplates'
import { useToast } from '@/lib/contexts/ToastContext'

interface ImportRecipeModalProps {
  onClose: () => void
  onImported?: () => void
}

export default function ImportRecipeModal({ onClose, onImported }: ImportRecipeModalProps) {
  const [jsonText, setJsonText] = useState('')
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

        <div className="p-6">
          <p className="text-xs text-gray-500 mb-3">Paste a recipe JSON to preview and import it into your recipes.</p>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={'{\n  "name": "My Recipe",\n  "trigger_event": "cron.job_executed",\n  "actions": [\n    { "module": "content-engine", "action": "poll_all_feeds", "params": {} }\n  ]\n}'}
            rows={8}
            className="w-full bg-gray-900 text-gray-100 font-mono text-xs p-4 rounded-xl outline-none resize-none placeholder-gray-600 focus:ring-2 focus:ring-indigo-400"
          />

          {/* Validation feedback */}
          {parsed && 'error' in parsed && (
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
