'use client'

import React, { useState, useMemo } from 'react'
import {
  Store, Search, Download, Star, Loader2, X, ChevronLeft,
  Zap, BarChart3, Newspaper, Shield, Bell, TrendingDown,
  ArrowRight, Package, CheckCircle2, AlertTriangle
} from 'lucide-react'
import { useMarketplaceTemplates, useInstallTemplate } from '@/hooks/useMarketplaceTemplates'
import { useCore } from '@/lib/contexts/CoreContext'
import { useToast } from '@/lib/contexts/ToastContext'
import type { RecipeTemplate } from '@/hooks/useMarketplaceTemplates'
import type { ModuleId } from '@/lib/core/events'

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'content', label: 'Content' },
  { id: 'seo', label: 'SEO' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'automation', label: 'Automation' },
  { id: 'general', label: 'General' },
]

const SORT_OPTIONS = [
  { id: 'popular', label: 'Popular' },
  { id: 'newest', label: 'Newest' },
  { id: 'featured', label: 'Featured' },
] as const

const ICON_MAP: Record<string, React.ReactNode> = {
  Newspaper: <Newspaper size={20} />,
  Zap: <Zap size={20} />,
  TrendingDown: <TrendingDown size={20} />,
  Shield: <Shield size={20} />,
  Bell: <Bell size={20} />,
  BarChart3: <BarChart3 size={20} />,
}

const CATEGORY_COLORS: Record<string, string> = {
  content: 'bg-blue-100 text-blue-700',
  seo: 'bg-emerald-100 text-emerald-700',
  monitoring: 'bg-amber-100 text-amber-700',
  automation: 'bg-purple-100 text-purple-700',
  general: 'bg-gray-100 text-gray-600',
}

const MODULE_NAMES: Record<string, string> = {
  'content-engine': 'Content Engine',
  'gemini-architect': 'Gemini Architect',
  'rankmath-bridge': 'RankMath Bridge',
  'rank-pulse': 'Rank Pulse',
  'gsc-insights': 'GSC Insights',
  'nana-banana': 'Nana Banana',
  'ai-writer': 'AI Writer',
  'cron': 'Cron Scheduler',
  'recipes': 'Recipes',
  'personas': 'Personas',
  'llm-tracker': 'LLM Tracker',
  'keyword-research': 'Keyword Research',
  'keyword-magic': 'Keyword Magic',
  'docs': 'Documentation',
  'telegraph': 'Telegraph',
}

interface RecipeMarketplaceProps {
  onClose: () => void
  onInstalled?: (recipeName: string) => void
}

export default function RecipeMarketplace({ onClose, onInstalled }: RecipeMarketplaceProps) {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'popular' | 'newest' | 'featured'>('featured')
  const [installingSlug, setInstallingSlug] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<RecipeTemplate | null>(null)

  const { isModuleEnabled } = useCore()
  const toast = useToast()
  const installTemplate = useInstallTemplate()

  const { data: templates = [], isLoading } = useMarketplaceTemplates({
    category: category !== 'all' ? category : undefined,
    search: search || undefined,
    sort,
  })

  // Separate featured from rest
  const { featured, regular } = useMemo(() => {
    const f: RecipeTemplate[] = []
    const r: RecipeTemplate[] = []
    for (const t of templates) {
      if (t.featured) f.push(t)
      else r.push(t)
    }
    return { featured: f, regular: r }
  }, [templates])

  const handleInstall = async (template: RecipeTemplate) => {
    setInstallingSlug(template.slug)
    try {
      await installTemplate.mutateAsync(template.slug)
      toast.success(`"${template.name}" installed — open it in My Recipes`)
      onInstalled?.(template.name)
    } catch (err: any) {
      toast.error(err.message || 'Failed to install')
    } finally {
      setInstallingSlug(null)
    }
  }

  const getMissingModules = (requiredModules: string[]) => {
    return requiredModules.filter(m => !isModuleEnabled(m as ModuleId))
  }

  const formatInstalls = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return String(count)
  }

  // Detail view
  if (selectedTemplate) {
    const missing = getMissingModules(selectedTemplate.required_modules)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTemplate(null)} />
        <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <button onClick={() => setSelectedTemplate(null)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
              <ChevronLeft size={14} /> Back
            </button>
            <button onClick={() => setSelectedTemplate(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          <div className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                {ICON_MAP[selectedTemplate.icon] || <Zap size={24} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                  {selectedTemplate.is_official && (
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">OFFICIAL</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">by {selectedTemplate.author_name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Download size={14} />
                  {formatInstalls(selectedTemplate.install_count)} installs
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-6">{selectedTemplate.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${CATEGORY_COLORS[selectedTemplate.category] || CATEGORY_COLORS.general}`}>
                {selectedTemplate.category}
              </span>
              {selectedTemplate.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 text-[11px] bg-gray-100 text-gray-500 rounded-full">
                  {tag}
                </span>
              ))}
            </div>

            {/* Actions chain */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Action Chain</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg border border-amber-200">
                    <Zap size={10} />
                    {selectedTemplate.trigger_event}
                  </span>
                </div>
                {selectedTemplate.actions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2 pl-4">
                    <ArrowRight size={12} className="text-gray-300" />
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg border border-emerald-200">
                      {MODULE_NAMES[action.module] || action.module} → {action.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Required modules */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Required Modules</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.required_modules.map(mod => {
                  const installed = isModuleEnabled(mod as ModuleId)
                  return (
                    <span
                      key={mod}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg ${
                        installed
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                    >
                      {installed ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                      {MODULE_NAMES[mod] || mod}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Missing modules warning */}
            {missing.length > 0 && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Missing modules</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Install <strong>{missing.map(m => MODULE_NAMES[m] || m).join(', ')}</strong> from the Marketplace first for this recipe to work.
                  </p>
                </div>
              </div>
            )}

            {/* Install button */}
            <button
              onClick={() => handleInstall(selectedTemplate)}
              disabled={installingSlug === selectedTemplate.slug}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {installingSlug === selectedTemplate.slug ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Download size={16} />
                  Install Recipe
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl mx-auto mt-8 mb-8 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Store size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Recipe Marketplace</h1>
              <p className="text-xs text-gray-400">Browse and install automation templates</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 gap-2 flex-1 max-w-xs focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-300 transition-all">
              <Search size={14} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
              />
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    category === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 outline-none"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-gray-300" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-16">
              <Package size={48} className="text-gray-200 mx-auto mb-4" />
              <h3 className="text-gray-500 font-medium mb-1">No templates found</h3>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured.length > 0 && sort !== 'newest' && (
                <div className="mb-8">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Star size={12} className="text-amber-400" />
                    Featured
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {featured.map(t => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        featured
                        installing={installingSlug === t.slug}
                        onInstall={() => handleInstall(t)}
                        onViewDetails={() => setSelectedTemplate(t)}
                        formatInstalls={formatInstalls}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular */}
              {regular.length > 0 && (
                <div>
                  {featured.length > 0 && sort !== 'newest' && (
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">All Templates</h2>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(sort === 'newest' ? templates : regular).map(t => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        installing={installingSlug === t.slug}
                        onInstall={() => handleInstall(t)}
                        onViewDetails={() => setSelectedTemplate(t)}
                        formatInstalls={formatInstalls}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ====== Template Card ======

function TemplateCard({
  template,
  featured,
  installing,
  onInstall,
  onViewDetails,
  formatInstalls,
}: {
  template: RecipeTemplate
  featured?: boolean
  installing: boolean
  onInstall: () => void
  onViewDetails: () => void
  formatInstalls: (n: number) => string
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer ${
        featured
          ? 'border-indigo-200 shadow-md shadow-indigo-50 ring-1 ring-indigo-100'
          : 'border-gray-200 shadow-sm'
      }`}
      onClick={onViewDetails}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          featured ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-gray-100 text-gray-600'
        }`}>
          {ICON_MAP[template.icon] || <Zap size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-gray-900 truncate">{template.name}</h3>
            {template.is_official && (
              <span className="px-1 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-bold rounded-full flex-shrink-0">
                OFFICIAL
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{template.author_name}</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">
        {template.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
            CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general
          }`}>
            {template.category}
          </span>
          <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
            <Download size={10} />
            {formatInstalls(template.install_count)}
          </span>
          <span className="text-[11px] text-gray-400">
            {template.actions.length} actions
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onInstall(); }}
          disabled={installing}
          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white text-[11px] font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {installing ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <>
              <Download size={10} />
              Install
            </>
          )}
        </button>
      </div>
    </div>
  )
}
