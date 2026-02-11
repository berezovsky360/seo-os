'use client'

import React, { useState, useMemo } from 'react'
import {
  X, Copy, Check, Share2, Upload, Link2, Globe,
  Loader2
} from 'lucide-react'
import { usePublishTemplate } from '@/hooks/useMarketplaceTemplates'
import { useToast } from '@/lib/contexts/ToastContext'
import type { Recipe } from '@/lib/core/events'

interface ShareRecipeModalProps {
  recipe: Recipe
  onClose: () => void
}

const CATEGORIES = ['general', 'content', 'seo', 'monitoring', 'automation']

export default function ShareRecipeModal({ recipe, onClose }: ShareRecipeModalProps) {
  const [tab, setTab] = useState<'json' | 'publish' | 'link'>('json')
  const [copied, setCopied] = useState(false)
  const toast = useToast()
  const publishTemplate = usePublishTemplate()

  // Publish form state
  const [pubName, setPubName] = useState(recipe.name)
  const [pubDesc, setPubDesc] = useState(recipe.description || '')
  const [pubCategory, setPubCategory] = useState('general')
  const [pubTags, setPubTags] = useState('')

  // Export JSON (clean format)
  const exportJson = useMemo(() => {
    return JSON.stringify({
      name: recipe.name,
      description: recipe.description || '',
      trigger_event: recipe.trigger_event,
      trigger_conditions: recipe.trigger_conditions || {},
      actions: recipe.actions.map(a => ({
        module: a.module,
        action: a.action,
        params: a.params || {},
      })),
      ...(recipe.graph_layout ? { graph_layout: recipe.graph_layout } : {}),
    }, null, 2)
  }, [recipe])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportJson)
    setCopied(true)
    toast.success('JSON copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePublish = async () => {
    const modules = [...new Set(recipe.actions.map(a => a.module))]
    try {
      await publishTemplate.mutateAsync({
        name: pubName,
        description: pubDesc || undefined,
        category: pubCategory,
        tags: pubTags.split(',').map(t => t.trim()).filter(Boolean),
        trigger_event: recipe.trigger_event,
        trigger_conditions: recipe.trigger_conditions,
        actions: recipe.actions,
        graph_layout: recipe.graph_layout || undefined,
        required_modules: modules,
      })
      toast.success('Recipe published to marketplace!')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish')
    }
  }

  const tabs = [
    { id: 'json' as const, label: 'JSON', icon: <Copy size={14} /> },
    { id: 'publish' as const, label: 'Publish', icon: <Upload size={14} /> },
    { id: 'link' as const, label: 'Link', icon: <Link2 size={14} /> },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-indigo-600" />
            <h2 className="text-base font-bold text-gray-900">Share Recipe</h2>
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
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-colors ${
                tab === t.id
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {tab === 'json' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">Copy this JSON and share it. Others can import it via "Import JSON" in their Recipes.</p>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 text-xs p-4 rounded-xl overflow-auto max-h-64 font-mono leading-relaxed">
                  {exportJson}
                </pre>
                <button
                  onClick={handleCopy}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg backdrop-blur transition-colors"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {tab === 'publish' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 mb-1">Publish this recipe to the marketplace so others can discover and install it.</p>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Name</label>
                <input
                  value={pubName}
                  onChange={(e) => setPubName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Description</label>
                <textarea
                  value={pubDesc}
                  onChange={(e) => setPubDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Category</label>
                  <select
                    value={pubCategory}
                    onChange={(e) => setPubCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Tags (comma-separated)</label>
                  <input
                    value={pubTags}
                    onChange={(e) => setPubTags(e.target.value)}
                    placeholder="ai, seo, content"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                  />
                </div>
              </div>
              <button
                onClick={handlePublish}
                disabled={!pubName.trim() || publishTemplate.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {publishTemplate.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Globe size={14} />
                    Publish to Marketplace
                  </>
                )}
              </button>
            </div>
          )}

          {tab === 'link' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                Publish this recipe first, then share the marketplace link with others.
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                <Link2 size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-3">
                  Publish your recipe to the marketplace to get a shareable link.
                </p>
                <button
                  onClick={() => setTab('publish')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Upload size={12} />
                  Go to Publish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
