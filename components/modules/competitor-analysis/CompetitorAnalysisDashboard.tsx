'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  ChevronLeft, Swords, Plus, Trash2, RefreshCw, Loader2,
  TrendingUp, TrendingDown, Search,
  Globe, BarChart3, FileText, Target, Compass, Zap, Shield,
  ArrowUpRight, ArrowDownRight, Minus, Info, X, Microscope,
  Rss, Link2, Unlink,
} from 'lucide-react'
import { useSites } from '@/hooks/useSites'
import {
  useCompetitors,
  useAddCompetitor,
  useDeleteCompetitor,
  useRunAnalysis,
  useKeywordGaps,
  useRankingComparison,
  useFetchOverview,
  useFetchTopPages,
  useTopPages,
  useDiscoverCompetitors,
  useDiscoveries,
  useContentGap,
  useDeepAnalysis,
  usePrecheck,
  useCompetitorSnapshots,
} from '@/hooks/useCompetitorAnalysis'
import { useContentFeeds, useCreateFeed, useDeleteFeed } from '@/hooks/useContentEngine'
import type {
  Competitor,
  ContentGapItem,
  PrecheckResult,
} from '@/hooks/useCompetitorAnalysis'
import { useStartCrawl } from '@/hooks/useCompetitorAnatomy'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useBackgroundTasks } from '@/lib/contexts/BackgroundTaskContext'
import { useQueryClient } from '@tanstack/react-query'

interface CompetitorAnalysisDashboardProps {
  onBack?: () => void
}

type DetailTab = 'overview' | 'keywords' | 'top-pages' | 'content-gap' | 'gaps' | 'compare'

export default function CompetitorAnalysisDashboard({ onBack }: CompetitorAnalysisDashboardProps) {
  const { data: sites = [] } = useSites()
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showDiscover, setShowDiscover] = useState(false)

  React.useEffect(() => {
    if (sites.length > 0 && !selectedSiteId) {
      setSelectedSiteId(sites[0].id)
    }
  }, [sites, selectedSiteId])

  const { data: competitors = [], isLoading } = useCompetitors(selectedSiteId)
  const deleteCompetitor = useDeleteCompetitor()
  const deepAnalysis = useDeepAnalysis()
  const queryClient = useQueryClient()
  const { tasks } = useBackgroundTasks()

  // Watch background tasks for completion → invalidate queries
  const completedTaskIds = useRef(new Set<string>())
  useEffect(() => {
    for (const task of tasks) {
      if (task.status !== 'completed' || completedTaskIds.current.has(task.id)) continue
      completedTaskIds.current.add(task.id)

      if (task.task_type === 'deep_analysis') {
        queryClient.invalidateQueries({ queryKey: ['competitors', selectedSiteId] })
        queryClient.invalidateQueries({ queryKey: ['competitor-top-pages'] })
        queryClient.invalidateQueries({ queryKey: ['competitor-snapshots'] })
      }
      if (task.task_type === 'competitor_discover') {
        queryClient.invalidateQueries({ queryKey: ['competitor-discoveries', selectedSiteId] })
      }
    }
  }, [tasks, selectedSiteId, queryClient])

  const selectedComp = competitors.find(c => c.id === selectedCompetitorId) || null

  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId)
    setSelectedCompetitorId(null)
    setShowDiscover(false)
  }

  const handleSelectCompetitor = (id: string) => {
    setSelectedCompetitorId(id)
    setActiveTab('overview')
    setShowDiscover(false)
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 bg-[#F5F5F7] border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <>
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
              >
                <ChevronLeft size={14} />
                Back
              </button>
              <div className="h-4 w-px bg-gray-300" />
            </>
          )}
          <Swords size={20} className="text-gray-900" />
          <h1 className="text-lg font-bold text-gray-900">Competitor Analysis</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Site Selector */}
          <select
            value={selectedSiteId}
            onChange={(e) => handleSiteChange(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {sites.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Two-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel — Competitor List */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          {/* Actions Bar */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <button
              onClick={() => { setShowAddForm(!showAddForm); setShowDiscover(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
            >
              <Plus size={12} />
              Add
            </button>
            <button
              onClick={() => { setShowDiscover(!showDiscover); setShowAddForm(false); setSelectedCompetitorId(null) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
            >
              <Compass size={12} />
              Discover
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <AddCompetitorForm
              siteId={selectedSiteId}
              onClose={() => setShowAddForm(false)}
              onAdded={(id) => {
                setShowAddForm(false)
                setSelectedCompetitorId(id)
                setActiveTab('overview')
              }}
            />
          )}

          {/* Competitor List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : competitors.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Swords size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-900 mb-1">No competitors</p>
                <p className="text-xs text-gray-500">Add a domain or use Discover.</p>
              </div>
            ) : (
              competitors.map(comp => (
                <CompetitorListItem
                  key={comp.id}
                  competitor={comp}
                  isSelected={selectedCompetitorId === comp.id}
                  onSelect={() => handleSelectCompetitor(comp.id)}
                  onDelete={() => {
                    deleteCompetitor.mutate({ id: comp.id, siteId: selectedSiteId })
                    if (selectedCompetitorId === comp.id) setSelectedCompetitorId(null)
                  }}
                  onDeepAnalyze={() => deepAnalysis.mutate({ competitorId: comp.id, siteId: selectedSiteId })}
                  isAnalyzing={deepAnalysis.isPending && deepAnalysis.variables?.competitorId === comp.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel — Detail View or Discover */}
        <div className="flex-1 overflow-y-auto bg-[#FAFAFA]">
          {showDiscover ? (
            <DiscoverPanel siteId={selectedSiteId} />
          ) : selectedComp ? (
            <CompetitorDetailView
              competitor={selectedComp}
              siteId={selectedSiteId}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Swords size={48} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm font-semibold text-gray-500">Select a competitor</p>
                <p className="text-xs text-gray-400 mt-1">or discover new ones</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ====== Add Competitor Form with Precheck ======

function AddCompetitorForm({
  siteId,
  onClose,
  onAdded,
}: {
  siteId: string
  onClose: () => void
  onAdded: (id: string) => void
}) {
  const [domain, setDomain] = useState('')
  const [name, setName] = useState('')
  const [precheckData, setPrecheckData] = useState<PrecheckResult | null>(null)

  const addCompetitor = useAddCompetitor()
  const deepAnalysis = useDeepAnalysis()
  const precheck = usePrecheck()

  const handlePrecheck = () => {
    if (!domain.trim()) return
    const cleanDomain = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
    precheck.mutate(
      { domain: cleanDomain, siteId },
      { onSuccess: (data) => setPrecheckData(data) }
    )
  }

  const handleAddAndAnalyze = () => {
    const cleanDomain = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
    addCompetitor.mutate(
      { site_id: siteId, domain: cleanDomain, name: name.trim() || undefined },
      {
        onSuccess: (data) => {
          if (data.competitor?.id) {
            deepAnalysis.mutate({ competitorId: data.competitor.id, siteId })
            onAdded(data.competitor.id)
          } else {
            onClose()
          }
        },
      }
    )
  }

  return (
    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Add Competitor</span>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
      <input
        type="text"
        value={domain}
        onChange={(e) => { setDomain(e.target.value); setPrecheckData(null) }}
        placeholder="competitor.com"
        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 mb-2"
        onKeyDown={(e) => e.key === 'Enter' && handlePrecheck()}
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Label (optional)"
        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 mb-2"
      />

      {!precheckData ? (
        <button
          onClick={handlePrecheck}
          disabled={precheck.isPending || !domain.trim()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {precheck.isPending ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          {precheck.isPending ? 'Checking...' : 'Pre-Check Domain'}
        </button>
      ) : (
        <div className="space-y-2">
          {/* Precheck Result Card */}
          <div className="bg-white rounded-lg border border-indigo-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={14} className="text-indigo-600" />
              <span className="text-sm font-bold text-gray-900">{precheckData.domain}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">DR</span>
                <span className="font-bold text-gray-900">{precheckData.domain_rank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Traffic</span>
                <span className="font-bold text-gray-900">{formatNumber(precheckData.organic_etv)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Keywords</span>
                <span className="font-bold text-gray-900">{formatNumber(precheckData.organic_keywords_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Top 10</span>
                <span className="font-bold text-gray-900">{formatNumber(precheckData.keywords_top10)}</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
              {precheckData.cost_breakdown && Object.entries(precheckData.cost_breakdown).map(([label, cost]) => (
                <div key={label} className="flex justify-between text-[10px]">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-700 font-mono">${(cost as number).toFixed(4)}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-1 border-t border-gray-50">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="font-bold text-gray-900">${precheckData.estimated_credits.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400">Balance</span>
                <span className={precheckData.balance < precheckData.estimated_credits ? 'text-red-500 font-semibold' : 'text-emerald-600'}>
                  ${precheckData.balance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPrecheckData(null)}
              className="flex-1 px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddAndAnalyze}
              disabled={addCompetitor.isPending || deepAnalysis.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-black transition-colors disabled:opacity-50"
            >
              {(addCompetitor.isPending || deepAnalysis.isPending) ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Zap size={12} />
              )}
              Add & Analyze
            </button>
          </div>
        </div>
      )}

      {precheck.isError && (
        <p className="text-xs text-red-500 mt-2">{precheck.error.message}</p>
      )}
      {addCompetitor.isError && (
        <p className="text-xs text-red-500 mt-2">{addCompetitor.error.message}</p>
      )}
    </div>
  )
}

// ====== Competitor List Item ======

function CompetitorListItem({
  competitor,
  isSelected,
  onSelect,
  onDelete,
  onDeepAnalyze,
  isAnalyzing,
}: {
  competitor: Competitor
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onDeepAnalyze: () => void
  isAnalyzing: boolean
}) {
  return (
    <div
      onClick={onSelect}
      className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${
        isSelected ? 'bg-indigo-50 border-l-2 border-l-indigo-600' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <img
          src={`https://www.google.com/s2/favicons?domain=${competitor.domain}&sz=32`}
          alt=""
          className="w-7 h-7 rounded-md flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {competitor.name || competitor.domain}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {competitor.domain_rank != null && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                DR {competitor.domain_rank}
              </span>
            )}
            {competitor.organic_etv != null && (
              <span className="text-[10px] text-gray-500">
                {formatNumber(competitor.organic_etv)} traffic
              </span>
            )}
            {competitor.organic_keywords_total != null && (
              <span className="text-[10px] text-gray-400">
                {formatNumber(competitor.organic_keywords_total)} kw
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onDeepAnalyze}
            disabled={isAnalyzing}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors disabled:opacity-50"
            title="Deep Analysis"
          >
            {isAnalyzing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="Remove"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {competitor.last_synced_at && (
        <p className="text-[10px] text-gray-400 mt-1 pl-10">
          Synced {new Date(competitor.last_synced_at).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

// ====== Discover Panel ======

function DiscoverPanel({ siteId }: { siteId: string }) {
  const discover = useDiscoverCompetitors()
  const { data: discoveries = [], isLoading } = useDiscoveries(siteId)
  const addCompetitor = useAddCompetitor()

  const handleDiscover = () => {
    discover.mutate({ siteId })
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Compass size={20} className="text-violet-600" />
            Discover Competitors
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Auto-find domains that compete for the same keywords as your site.
          </p>
        </div>
        <button
          onClick={handleDiscover}
          disabled={discover.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50"
        >
          {discover.isPending ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {discover.isPending ? 'Discovering...' : 'Run Discovery'}
        </button>
      </div>

      {discover.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-600">
          {discover.error.message}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
      ) : discoveries.length === 0 ? (
        <div className="text-center py-16">
          <Compass size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-500">No discoveries yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Run Discovery" to find competing domains.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {discoveries.map(disc => (
            <div key={disc.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${disc.discovered_domain}&sz=32`}
                    alt=""
                    className="w-6 h-6 rounded"
                  />
                  <span className="text-sm font-bold text-gray-900">{disc.discovered_domain}</span>
                </div>
                <button
                  onClick={() => addCompetitor.mutate({ site_id: siteId, domain: disc.discovered_domain })}
                  disabled={addCompetitor.isPending}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                >
                  <Plus size={11} />
                  Add
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Overlap</span>
                  <span className="font-semibold text-gray-800">{disc.intersections} kw</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Traffic</span>
                  <span className="font-semibold text-gray-800">{formatNumber(disc.organic_etv)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Keywords</span>
                  <span className="font-semibold text-gray-800">{formatNumber(disc.organic_keywords)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg Pos</span>
                  <span className="font-semibold text-gray-800">{disc.avg_position.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ====== Competitor Detail View ======

const TABS: { id: DetailTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'keywords', label: 'Keywords', icon: Target },
  { id: 'top-pages', label: 'Top Pages', icon: FileText },
  { id: 'content-gap', label: 'Content Gap', icon: Search },
  { id: 'gaps', label: 'Keyword Gaps', icon: TrendingDown },
  { id: 'compare', label: 'Comparison', icon: Swords },
]

function CompetitorDetailView({
  competitor,
  siteId,
  activeTab,
  onTabChange,
}: {
  competitor: Competitor
  siteId: string
  activeTab: DetailTab
  onTabChange: (tab: DetailTab) => void
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Competitor Header */}
      <div className="px-6 pt-5 pb-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <img
            src={`https://www.google.com/s2/favicons?domain=${competitor.domain}&sz=32`}
            alt=""
            className="w-8 h-8 rounded-lg"
          />
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {competitor.name || competitor.domain}
            </h2>
            {competitor.name && (
              <p className="text-xs text-gray-400">{competitor.domain}</p>
            )}
          </div>
          {competitor.domain_rank != null && (
            <span className="ml-auto text-xs font-bold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-lg">
              DR {competitor.domain_rank}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && <OverviewTab competitor={competitor} siteId={siteId} />}
        {activeTab === 'keywords' && <KeywordsTab siteId={siteId} competitorId={competitor.id} />}
        {activeTab === 'top-pages' && <TopPagesTab competitorId={competitor.id} />}
        {activeTab === 'content-gap' && <ContentGapTab siteId={siteId} competitorId={competitor.id} />}
        {activeTab === 'gaps' && <KeywordGapsTab siteId={siteId} competitorId={competitor.id} />}
        {activeTab === 'compare' && <CompareTab siteId={siteId} competitorId={competitor.id} />}
      </div>
    </div>
  )
}

// ====== Overview Tab ======

function OverviewTab({ competitor, siteId }: { competitor: Competitor; siteId: string }) {
  const { data: snapshots = [] } = useCompetitorSnapshots(competitor.id)
  const fetchOverview = useFetchOverview()
  const startCrawl = useStartCrawl()
  const { user } = useAuth()

  // RSS feed sync for Content Engine
  const { data: allFeeds = [] } = useContentFeeds()
  const createFeed = useCreateFeed()
  const deleteFeedMutation = useDeleteFeed()
  const [rssUrl, setRssUrl] = useState('')

  const linkedFeed = (allFeeds as any[]).find((f: any) =>
    f.feed_url?.includes(competitor.domain) || f.name?.toLowerCase().includes(competitor.domain.split('.')[0])
  )

  const handleSyncRSS = async () => {
    const feedUrl = rssUrl.trim() || `https://${competitor.domain}/feed/`
    const feedName = competitor.name || competitor.domain
    await createFeed.mutateAsync({ name: feedName, feed_url: feedUrl, site_id: siteId })
    setRssUrl('')
  }

  const handleUnlinkRSS = () => {
    if (!linkedFeed) return
    if (!confirm('Disconnect RSS feed from this competitor?')) return
    deleteFeedMutation.mutate(linkedFeed.id)
  }

  const metrics = [
    { label: 'Domain Rank', value: competitor.domain_rank ?? '—', color: 'text-indigo-600' },
    { label: 'Organic Traffic', value: competitor.organic_etv != null ? formatNumber(competitor.organic_etv) : '—', color: 'text-emerald-600' },
    { label: 'Total Keywords', value: competitor.organic_keywords_total != null ? formatNumber(competitor.organic_keywords_total) : '—', color: 'text-blue-600' },
    { label: 'Top 3', value: competitor.keywords_top3 != null ? formatNumber(competitor.keywords_top3) : '—', color: 'text-amber-600' },
    { label: 'Top 10', value: competitor.keywords_top10 != null ? formatNumber(competitor.keywords_top10) : '—', color: 'text-orange-600' },
    { label: 'Referring Domains', value: competitor.referring_domains != null ? formatNumber(competitor.referring_domains) : '—', color: 'text-purple-600' },
    { label: 'Backlinks', value: competitor.backlinks_count != null ? formatNumber(competitor.backlinks_count) : '—', color: 'text-pink-600' },
  ]

  const hasData = competitor.domain_rank != null

  return (
    <div className="space-y-6 max-w-3xl">
      {!hasData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Info size={16} className="text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">No overview data yet</p>
            <p className="text-xs text-amber-600 mt-0.5">Run a deep analysis to fetch domain metrics.</p>
          </div>
          <button
            onClick={() => fetchOverview.mutate({ competitorId: competitor.id, siteId })}
            disabled={fetchOverview.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {fetchOverview.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Fetch
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{m.label}</p>
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Run Site Crawl — cross-module link to Competitor Anatomy */}
      {hasData && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center gap-3">
          <Microscope size={16} className="text-violet-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-violet-800">Run Site Crawl</p>
            <p className="text-xs text-violet-600 mt-0.5">Crawl {competitor.domain} to analyze pages, SEO issues, duplicates, and redirects.</p>
          </div>
          <button
            onClick={() => {
              if (!user?.id) return
              startCrawl.mutate({
                target_domain: competitor.domain,
                user_id: user.id,
                max_crawl_pages: 100,
                competitor_id: competitor.id,
                site_id: siteId,
              })
            }}
            disabled={startCrawl.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50"
          >
            {startCrawl.isPending ? <Loader2 size={12} className="animate-spin" /> : <Microscope size={12} />}
            Crawl
          </button>
        </div>
      )}

      {/* RSS Feed Sync — Content Engine integration */}
      {hasData && !linkedFeed && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Rss size={16} className="text-orange-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800">RSS Feed Detected</p>
              <p className="text-xs text-orange-600 mt-0.5">
                Sync {competitor.domain} RSS feed with Content Engine to track their new pages in Overview.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 pl-7">
            <input
              type="text"
              placeholder={`https://${competitor.domain}/feed/`}
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            />
            <button
              onClick={handleSyncRSS}
              disabled={createFeed.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {createFeed.isPending ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
              Sync RSS
            </button>
          </div>
        </div>
      )}

      {/* Linked RSS Feed */}
      {hasData && linkedFeed && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <Rss size={16} className="text-green-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">RSS feed synced</p>
            <p className="text-xs text-green-600 mt-0.5">
              {linkedFeed.feed_url} — {linkedFeed.last_item_count || 0} items tracked
            </p>
          </div>
          <button
            onClick={handleUnlinkRSS}
            disabled={deleteFeedMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-600 text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-50 disabled:opacity-50"
          >
            {deleteFeedMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
            Disconnect
          </button>
        </div>
      )}

      {/* Keyword Distribution */}
      {hasData && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Keyword Position Distribution</h3>
          <KeywordDistributionBar competitor={competitor} />
        </div>
      )}

      {/* History */}
      {snapshots.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Historical Trend</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-semibold text-gray-500 pb-2">Date</th>
                  <th className="text-right font-semibold text-gray-500 pb-2">DR</th>
                  <th className="text-right font-semibold text-gray-500 pb-2">Traffic</th>
                  <th className="text-right font-semibold text-gray-500 pb-2">Keywords</th>
                  <th className="text-right font-semibold text-gray-500 pb-2">Backlinks</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.slice(-10).map((snap, i) => {
                  const prev = i > 0 ? snapshots[snapshots.length - 10 + i - 1] : null
                  return (
                    <tr key={snap.id} className="border-b border-gray-50">
                      <td className="py-2 text-gray-700 font-medium">{snap.snapshot_date}</td>
                      <td className="py-2 text-right text-gray-700">{snap.domain_rank ?? '—'}</td>
                      <td className="py-2 text-right">
                        <TrendCell current={snap.organic_etv} prev={prev?.organic_etv} />
                      </td>
                      <td className="py-2 text-right">
                        <TrendCell current={snap.organic_keywords_total} prev={prev?.organic_keywords_total} />
                      </td>
                      <td className="py-2 text-right text-gray-700">{snap.backlinks_count != null ? formatNumber(snap.backlinks_count) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ====== Keyword Distribution Bar ======

function KeywordDistributionBar({ competitor }: { competitor: Competitor }) {
  const total = competitor.organic_keywords_total || 1
  const top3 = competitor.keywords_top3 || 0
  const top10 = (competitor.keywords_top10 || 0) - top3
  const top100 = (competitor.keywords_top100 || 0) - (competitor.keywords_top10 || 0)

  const segments = [
    { label: 'Top 3', value: top3, pct: (top3 / total) * 100, color: 'bg-emerald-500' },
    { label: 'Top 4–10', value: top10, pct: (top10 / total) * 100, color: 'bg-blue-500' },
    { label: 'Top 11–100', value: top100, pct: (top100 / total) * 100, color: 'bg-gray-300' },
  ]

  return (
    <div>
      <div className="flex h-6 rounded-lg overflow-hidden mb-3">
        {segments.map(seg => (
          seg.pct > 0 && (
            <div
              key={seg.label}
              className={`${seg.color} transition-all`}
              style={{ width: `${Math.max(seg.pct, 2)}%` }}
              title={`${seg.label}: ${seg.value}`}
            />
          )
        ))}
      </div>
      <div className="flex gap-4">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <div className={`w-2.5 h-2.5 rounded-sm ${seg.color}`} />
            <span className="text-gray-600">{seg.label}: <strong className="text-gray-900">{formatNumber(seg.value)}</strong></span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ====== Trend Cell ======

function TrendCell({ current, prev }: { current: number | null; prev: number | null | undefined }) {
  if (current == null) return <span className="text-gray-400">—</span>
  if (prev == null) return <span className="text-gray-700">{formatNumber(current)}</span>

  const diff = current - prev
  if (diff > 0) return (
    <span className="text-emerald-600 font-medium">
      {formatNumber(current)} <ArrowUpRight size={10} className="inline" />
    </span>
  )
  if (diff < 0) return (
    <span className="text-red-500 font-medium">
      {formatNumber(current)} <ArrowDownRight size={10} className="inline" />
    </span>
  )
  return <span className="text-gray-700">{formatNumber(current)}</span>
}

// ====== Keywords Tab (existing ranked keywords) ======

function KeywordsTab({ siteId, competitorId }: { siteId: string; competitorId: string }) {
  const { data: gapsData, isLoading } = useKeywordGaps(siteId, competitorId)
  const runAnalysis = useRunAnalysis()

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Ranked Keywords</h3>
        <button
          onClick={() => runAnalysis.mutate({ competitorId, siteId })}
          disabled={runAnalysis.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
        >
          {runAnalysis.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Refresh Keywords
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : !gapsData || gapsData.gaps.length === 0 ? (
        <EmptyState icon={Target} message="No keyword data" hint="Run analysis to fetch ranked keywords." />
      ) : (
        <DataTable
          headers={['Keyword', 'Volume', 'Position', 'KD']}
          rows={gapsData.gaps.slice(0, 50).map(g => [
            g.keyword,
            g.search_volume?.toLocaleString() || '—',
            g.position?.toString() || '—',
            g.keyword_difficulty?.toString() || '—',
          ])}
        />
      )}
    </div>
  )
}

// ====== Top Pages Tab ======

function TopPagesTab({ competitorId }: { competitorId: string }) {
  const { data: pages = [], isLoading } = useTopPages(competitorId)
  const fetchTopPages = useFetchTopPages()

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Top Pages by Traffic</h3>
        <button
          onClick={() => fetchTopPages.mutate({ competitorId })}
          disabled={fetchTopPages.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
        >
          {fetchTopPages.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Fetch Pages
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : pages.length === 0 ? (
        <EmptyState icon={FileText} message="No top pages data" hint="Click 'Fetch Pages' to load data from DataForSEO." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Page URL</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Traffic</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">KW</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Top 3</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Top 10</th>
              </tr>
            </thead>
            <tbody>
              {pages.slice(0, 50).map((page, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-800 font-medium truncate max-w-[400px]" title={page.page_url}>
                    {page.page_url.replace(/^https?:\/\/[^/]+/, '')}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700 font-semibold">{formatNumber(page.etv)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{page.keywords_count}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{page.top3_count}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{page.top10_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ====== Content Gap Tab ======

function ContentGapTab({ siteId, competitorId }: { siteId: string; competitorId: string }) {
  const contentGap = useContentGap(siteId, competitorId)
  const [data, setData] = useState<{ gaps: ContentGapItem[]; total: number } | null>(null)

  const handleRun = () => {
    contentGap.mutate(undefined, {
      onSuccess: (result) => setData(result),
    })
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Content Gap Analysis</h3>
          <p className="text-xs text-gray-500 mt-0.5">Keywords the competitor ranks for but you don't.</p>
        </div>
        <button
          onClick={handleRun}
          disabled={contentGap.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
        >
          {contentGap.isPending ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          Run Analysis
        </button>
      </div>

      {contentGap.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-600">
          {contentGap.error.message}
        </div>
      )}

      {contentGap.isPending ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-indigo-400 mb-2" />
          <p className="text-xs text-gray-500">Analyzing domain intersection...</p>
        </div>
      ) : !data ? (
        <EmptyState icon={Search} message="Run content gap analysis" hint="Click 'Run Analysis' to find keyword opportunities." />
      ) : data.gaps.length === 0 ? (
        <EmptyState icon={Shield} message="No content gaps found" hint="The competitor doesn't rank for unique keywords." />
      ) : (
        <>
          <div className="mb-3 text-xs text-gray-500">
            Found <strong className="text-gray-900">{data.total}</strong> keyword opportunities
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Keyword</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Volume</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">KD</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Their Pos</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">URL</th>
                </tr>
              </thead>
              <tbody>
                {data.gaps.slice(0, 50).map((gap, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-800 font-medium">{gap.keyword}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{gap.search_volume?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <KDPill value={gap.keyword_difficulty} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">#{gap.competitor_position || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-400 truncate max-w-[200px] text-xs" title={gap.competitor_url || undefined}>
                      {gap.competitor_url?.replace(/^https?:\/\/[^/]+/, '') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ====== Keyword Gaps Tab (from DB) ======

function KeywordGapsTab({ siteId, competitorId }: { siteId: string; competitorId: string }) {
  const { data: gapsData, isLoading } = useKeywordGaps(siteId, competitorId)

  return (
    <div className="max-w-4xl">
      <h3 className="text-sm font-bold text-gray-900 mb-4">Keyword Gaps (DB-based)</h3>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : !gapsData || gapsData.gaps.length === 0 ? (
        <EmptyState icon={TrendingDown} message="No keyword gaps" hint="Run analysis first to populate keyword data." />
      ) : (
        <>
          <div className="mb-3 text-xs text-gray-500">
            {gapsData.total} keywords the competitor ranks for that you don't track
          </div>
          <DataTable
            headers={['Keyword', 'Volume', 'Position', 'KD']}
            rows={gapsData.gaps.slice(0, 50).map(g => [
              g.keyword,
              g.search_volume?.toLocaleString() || '—',
              g.position?.toString() || '—',
              g.keyword_difficulty?.toString() || '—',
            ])}
          />
        </>
      )}
    </div>
  )
}

// ====== Compare Tab ======

function CompareTab({ siteId, competitorId }: { siteId: string; competitorId: string }) {
  const { data: compareData, isLoading } = useRankingComparison(siteId, competitorId)

  return (
    <div className="max-w-4xl">
      <h3 className="text-sm font-bold text-gray-900 mb-4">Ranking Comparison</h3>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : !compareData || compareData.overlapping.length === 0 ? (
        <EmptyState icon={Swords} message="No overlapping keywords" hint="Run analysis and add keywords to your site for comparison." />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="flex gap-3 mb-4">
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <TrendingUp size={16} className="text-emerald-600" />
              <div>
                <p className="text-lg font-bold text-emerald-700">{compareData.winning}</p>
                <p className="text-[10px] font-semibold text-emerald-600 uppercase">Winning</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-xl border border-red-200">
              <TrendingDown size={16} className="text-red-600" />
              <div>
                <p className="text-lg font-bold text-red-700">{compareData.losing}</p>
                <p className="text-[10px] font-semibold text-red-600 uppercase">Losing</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
              <Minus size={16} className="text-gray-400" />
              <div>
                <p className="text-lg font-bold text-gray-700">{compareData.total}</p>
                <p className="text-[10px] font-semibold text-gray-500 uppercase">Total</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Keyword</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">You</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Them</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Volume</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {compareData.overlapping.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-800 font-medium">{row.keyword}</td>
                    <td className={`px-4 py-2.5 text-right font-bold ${row.winning ? 'text-emerald-600' : 'text-red-500'}`}>
                      #{row.your_position}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold ${!row.winning ? 'text-emerald-600' : 'text-red-500'}`}>
                      #{row.competitor_position}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{row.search_volume?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      {row.winning ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
                          <TrendingUp size={10} /> WIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full">
                          <TrendingDown size={10} /> LOSE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ====== Shared Components ======

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {headers.map((h, i) => (
              <th
                key={h}
                className={`text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 ${
                  i === 0 ? 'text-left' : 'text-right'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-4 py-2.5 ${
                    j === 0 ? 'text-gray-800 font-medium' : 'text-right text-gray-500'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState({ icon: Icon, message, hint }: { icon: React.ElementType; message: string; hint: string }) {
  return (
    <div className="text-center py-12">
      <Icon size={36} className="mx-auto text-gray-300 mb-3" />
      <p className="text-sm font-semibold text-gray-500">{message}</p>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  )
}

function KDPill({ value }: { value: number | null }) {
  if (value == null) return <span className="text-gray-400">—</span>
  const color = value <= 30 ? 'bg-emerald-100 text-emerald-700' :
    value <= 60 ? 'bg-amber-100 text-amber-700' :
    'bg-red-100 text-red-700'
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${color}`}>
      {value}
    </span>
  )
}

// ====== Utility ======

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}
