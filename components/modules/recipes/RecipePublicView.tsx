'use client'

import React from 'react'
import {
  Zap, ArrowRight, Download, User, Calendar, Tag,
  Folder, BookOpen, Share2
} from 'lucide-react'

interface RecipeTemplateData {
  name: string
  description: string | null
  author_name: string
  category: string
  tags: string[]
  trigger_event: string
  trigger_conditions: Record<string, any>
  actions: { module: string; action: string; params: Record<string, any> }[]
  required_modules: string[]
  install_count: number
  created_at: string
}

interface RecipePublicViewProps {
  template: RecipeTemplateData
}

export default function RecipePublicView({ template }: RecipePublicViewProps) {
  const formatEvent = (type: string) => {
    const action = type.split('.').slice(1).join('.')
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const formatModule = (mod: string) =>
    mod.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const handleCopyJson = async () => {
    const json = JSON.stringify({
      name: template.name,
      description: template.description || '',
      trigger_event: template.trigger_event,
      trigger_conditions: template.trigger_conditions || {},
      actions: template.actions.map(a => ({
        module: a.module,
        action: a.action,
        params: a.params || {},
      })),
    }, null, 2)
    await navigator.clipboard.writeText(json)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <BookOpen size={20} className="text-indigo-600" />
          <span className="text-sm font-semibold text-indigo-600">SEO OS Recipe</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Title */}
          <div className="px-8 py-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{template.name}</h1>
            {template.description && (
              <p className="text-sm text-gray-500">{template.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <User size={12} />
                {template.author_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(template.created_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Download size={12} />
                {template.install_count} installs
              </span>
            </div>
          </div>

          {/* Flow */}
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 mb-4">Automation Flow</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg border border-amber-200">
                <Zap size={12} />
                {formatEvent(template.trigger_event)}
              </span>
              {template.actions.map((action, i) => (
                <React.Fragment key={i}>
                  <ArrowRight size={14} className="text-gray-300" />
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
                    {formatModule(action.module)} &rarr; {action.action.replace(/_/g, ' ')}
                  </span>
                </React.Fragment>
              ))}
            </div>

            {/* Conditions */}
            {Object.keys(template.trigger_conditions || {}).length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">Trigger Conditions</p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <pre className="text-xs text-gray-600 font-mono">
                    {JSON.stringify(template.trigger_conditions, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                <Folder size={11} />
                {template.category}
              </span>
              {template.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-lg">
                  <Tag size={11} />
                  {tag}
                </span>
              ))}
            </div>
            {template.required_modules.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1">Required Modules:</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {template.required_modules.map(mod => (
                    <span key={mod} className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[11px] font-medium rounded border border-gray-200">
                      {formatModule(mod)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-8 py-6 flex items-center gap-3">
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Share2 size={14} />
              Copy Recipe JSON
            </button>
            <span className="text-xs text-gray-400">
              Paste into SEO OS &rarr; Recipes &rarr; Import
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Powered by SEO OS
        </p>
      </div>
    </div>
  )
}
