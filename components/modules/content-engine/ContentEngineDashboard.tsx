'use client'

import { useState } from 'react'
import {
  ChevronLeft,
  Rss,
  FileText,
  Zap,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Search,
  ChevronDown,
  ExternalLink,
  Play,
  Eye,
  Loader2,
} from 'lucide-react'
import {
  useContentFeeds,
  useCreateFeed,
  useDeleteFeed,
  usePollFeed,
  useContentItems,
  useScoreItems,
  useExtractFacts,
  usePipelineRuns,
  useStartPipeline,
} from '@/hooks/useContentEngine'

type Tab = 'feeds' | 'items' | 'pipeline'

interface Props {
  onBack: () => void
}

export default function ContentEngineDashboard({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('feeds')

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'feeds', label: 'RSS Feeds', icon: Rss },
    { id: 'items', label: 'Ingested Items', icon: FileText },
    { id: 'pipeline', label: 'Pipeline', icon: Zap },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-5 border-b border-gray-200 sticky top-0 z-10 bg-[#F5F5F7] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <div className="h-4 w-px bg-gray-300" />
          <Zap size={20} className="text-gray-900" />
          <h1 className="text-lg font-bold text-gray-900">Content Engine</h1>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-4 flex-shrink-0">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'feeds' && <FeedsTab />}
        {activeTab === 'items' && <ItemsTab />}
        {activeTab === 'pipeline' && <PipelineTab />}
      </div>
    </div>
  )
}

// ====== Feeds Tab ======

function FeedsTab() {
  const { data: feeds, isLoading } = useContentFeeds()
  const createFeed = useCreateFeed()
  const deleteFeed = useDeleteFeed()
  const pollFeed = usePollFeed()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [feedUrl, setFeedUrl] = useState('')
  const [pollingId, setPollingId] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim() || !feedUrl.trim()) return
    await createFeed.mutateAsync({ name, feed_url: feedUrl })
    setName('')
    setFeedUrl('')
    setShowForm(false)
  }

  const handlePoll = async (feedId: string) => {
    setPollingId(feedId)
    try {
      await pollFeed.mutateAsync(feedId)
    } finally {
      setPollingId(null)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 size={24} className="animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">RSS Feeds ({feeds?.length || 0})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Add Feed
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Feed name (e.g. The Rundown AI)"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="Feed URL (e.g. https://example.com/feed)"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createFeed.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {createFeed.isPending ? 'Creating...' : 'Create Feed'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {feeds?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Rss size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No feeds yet</p>
          <p className="text-sm">Add an RSS feed to start ingesting content</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">URL</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Last Polled</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Items</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {feeds?.map((feed) => (
                <tr key={feed.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{feed.name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{feed.feed_url}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {feed.last_polled_at ? new Date(feed.last_polled_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{feed.last_item_count}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      feed.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {feed.enabled ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handlePoll(feed.id)}
                        disabled={pollingId === feed.id}
                        className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                        title="Poll now"
                      >
                        <RefreshCw size={14} className={pollingId === feed.id ? 'animate-spin' : ''} />
                      </button>
                      <button
                        onClick={() => deleteFeed.mutate(feed.id)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ====== Items Tab ======

function ItemsTab() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useContentItems({ status: statusFilter || undefined, page, perPage: 25 })
  const scoreItems = useScoreItems()
  const extractFacts = useExtractFacts()

  const items = data?.items || []
  const total = data?.total || 0

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)))
    }
  }

  const handleScore = async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : undefined
    await scoreItems.mutateAsync(ids)
    setSelectedIds(new Set())
  }

  const handleExtract = async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : undefined
    await extractFacts.mutateAsync(ids)
    setSelectedIds(new Set())
  }

  const scoreBadge = (score: number | null) => {
    if (score === null || score === undefined) return <span className="text-gray-300">—</span>
    const color = score >= 70 ? 'bg-green-100 text-green-700' : score >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{Math.round(score)}</span>
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ingested: 'bg-gray-100 text-gray-600',
      scored: 'bg-blue-100 text-blue-600',
      extracted: 'bg-purple-100 text-purple-600',
      clustered: 'bg-indigo-100 text-indigo-600',
      used: 'bg-green-100 text-green-600',
      skipped: 'bg-gray-100 text-gray-400',
    }
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 size={24} className="animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Items ({total})</h2>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">All statuses</option>
            <option value="ingested">Ingested</option>
            <option value="scored">Scored</option>
            <option value="extracted">Extracted</option>
            <option value="clustered">Clustered</option>
            <option value="used">Used</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
          )}
          <button
            onClick={handleScore}
            disabled={scoreItems.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50"
          >
            <Sparkles size={14} />
            {scoreItems.isPending ? 'Scoring...' : 'Score'}
          </button>
          <button
            onClick={handleExtract}
            disabled={extractFacts.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 disabled:opacity-50"
          >
            <Search size={14} />
            {extractFacts.isPending ? 'Extracting...' : 'Extract Facts'}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No items</p>
          <p className="text-sm">Poll your RSS feeds to ingest content</p>
        </div>
      ) : (
        <>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-8 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selectedIds.size === items.length}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Source</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">SEO</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Viral</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Combined</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="w-8 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <>
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${expandedId === item.id ? 'bg-indigo-50' : ''}`}
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[300px] truncate">{item.title}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{(item as any).content_feeds?.name || '—'}</td>
                      <td className="px-4 py-3 text-center">{scoreBadge(item.seo_score)}</td>
                      <td className="px-4 py-3 text-center">{scoreBadge(item.viral_score)}</td>
                      <td className="px-4 py-3 text-center">{scoreBadge(item.combined_score)}</td>
                      <td className="px-4 py-3 text-center">{statusBadge(item.status)}</td>
                      <td className="px-4 py-3">
                        <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`} />
                      </td>
                    </tr>
                    {expandedId === item.id && (
                      <tr key={`${item.id}-detail`}>
                        <td colSpan={8} className="px-4 py-4 bg-gray-50 border-b border-gray-200">
                          <ItemDetail item={item} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 25 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * 25 >= total}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ====== Item Detail Panel ======

function ItemDetail({ item }: { item: any }) {
  const facts = (item.extracted_facts || []) as { fact: string; confidence: number; source_quote: string }[]
  const keywords = (item.extracted_keywords || []) as string[]
  const factCheck = item.fact_check_results as { verified?: any[]; unverified?: any[]; checked_at?: string } | null

  return (
    <div className="space-y-3">
      {item.score_reasoning && (
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Score Reasoning</span>
          <p className="text-sm text-gray-700 mt-1">{item.score_reasoning}</p>
        </div>
      )}

      {keywords.length > 0 && (
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Keywords</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {keywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {facts.length > 0 && (
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Extracted Facts ({facts.length})</span>
          <div className="mt-1 space-y-1.5">
            {facts.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  f.confidence >= 0.8 ? 'bg-green-100 text-green-700' : f.confidence >= 0.5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                }`}>
                  {Math.round(f.confidence * 100)}
                </span>
                <span className="text-gray-700">{f.fact}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {factCheck && (
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">
            Fact Check ({factCheck.verified?.length || 0} verified, {factCheck.unverified?.length || 0} unverified)
          </span>
          {factCheck.verified?.map((f: any, i: number) => (
            <div key={i} className="mt-1 text-sm text-green-700 flex items-start gap-1">
              <span className="shrink-0">&#10003;</span>
              <span>{f.fact}</span>
            </div>
          ))}
          {factCheck.unverified?.map((f: any, i: number) => (
            <div key={i} className="mt-1 text-sm text-red-600 flex items-start gap-1">
              <span className="shrink-0">&#10007;</span>
              <span>{f.fact} — {f.reason}</span>
            </div>
          ))}
        </div>
      )}

      {item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <ExternalLink size={12} /> View original
        </a>
      )}
    </div>
  )
}

// ====== Pipeline Tab ======

function PipelineTab() {
  const { data: runs, isLoading } = usePipelineRuns()
  const startPipeline = useStartPipeline()
  const [showNew, setShowNew] = useState(false)
  const [preset, setPreset] = useState<string>('full-article')
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)

  const handleStart = async () => {
    await startPipeline.mutateAsync({ preset })
    setShowNew(false)
  }

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-600',
      generating: 'bg-blue-100 text-blue-600',
      assembling: 'bg-purple-100 text-purple-600',
      publishing: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-600',
    }
    return colors[status] || 'bg-gray-100 text-gray-500'
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 size={24} className="animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Pipeline Runs ({runs?.length || 0})</h2>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Play size={16} />
          New Pipeline Run
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preset</label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white w-64"
            >
              <option value="full-article">Full Article (2000+ words)</option>
              <option value="news-post">News Post (500-800 words)</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleStart}
              disabled={startPipeline.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {startPipeline.isPending ? 'Starting...' : 'Start Pipeline'}
            </button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {!runs?.length ? (
        <div className="text-center py-16 text-gray-400">
          <Zap size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No pipeline runs</p>
          <p className="text-sm">Start a pipeline to generate content from ingested items</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Preset</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Words</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Started</th>
                <th className="w-8 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <>
                  <tr
                    key={run.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${expandedRunId === run.id ? 'bg-indigo-50' : ''}`}
                    onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{run.title || 'Untitled'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        run.preset === 'full-article' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {run.preset === 'full-article' ? 'Full Article' : 'News Post'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(run.status)}`}>
                        {(run.status === 'generating' || run.status === 'assembling' || run.status === 'publishing') && (
                          <Loader2 size={10} className="animate-spin" />
                        )}
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{run.word_count || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(run.started_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Eye size={14} className="text-gray-400" />
                    </td>
                  </tr>
                  {expandedRunId === run.id && (
                    <tr key={`${run.id}-detail`}>
                      <td colSpan={6} className="px-4 py-4 bg-gray-50 border-b border-gray-200">
                        <RunDetail run={run} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ====== Run Detail Panel ======

function RunDetail({ run }: { run: any }) {
  const sections = run.sections || {}

  return (
    <div className="space-y-3">
      {run.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Error: {run.error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">SEO Title</span>
          <p className="text-gray-700 mt-0.5">{run.seo_title || '—'}</p>
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Focus Keyword</span>
          <p className="text-gray-700 mt-0.5">{run.focus_keyword || '—'}</p>
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Meta Description</span>
          <p className="text-gray-700 mt-0.5">{run.seo_description || '—'}</p>
        </div>
      </div>

      <div>
        <span className="text-xs font-semibold text-gray-500 uppercase">Sections Generated</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {sections.zero_click && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-xs">Zero-Click</span>}
          {sections.intro && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">Intro</span>}
          {sections.body?.length > 0 && <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs">Body ({sections.body.length})</span>}
          {sections.glossary?.length > 0 && <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">Glossary ({sections.glossary.length})</span>}
          {sections.faq?.length > 0 && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">FAQ ({sections.faq.length})</span>}
          {sections.conclusion && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">Conclusion</span>}
        </div>
      </div>

      {run.assembled_html && (
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Preview</span>
          <div
            className="mt-1 p-4 bg-white border border-gray-200 rounded-lg max-h-[300px] overflow-auto prose prose-sm"
            dangerouslySetInnerHTML={{ __html: run.assembled_html.slice(0, 3000) }}
          />
        </div>
      )}

      {run.wp_post_id && (
        <p className="text-sm text-green-600 font-medium">
          Published to WordPress (Post #{run.wp_post_id})
        </p>
      )}

      {run.completed_at && (
        <p className="text-xs text-gray-400">
          Completed: {new Date(run.completed_at).toLocaleString()}
        </p>
      )}
    </div>
  )
}
