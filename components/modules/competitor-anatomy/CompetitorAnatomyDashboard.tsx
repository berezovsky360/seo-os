'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  ChevronLeft, Microscope, Plus, Trash2, Loader2,
  Globe, BarChart3, FileText, AlertTriangle, Copy, ArrowRightLeft,
  Zap, Search, ChevronDown, ChevronUp, ExternalLink,
  CheckCircle2, XCircle, Info,
} from 'lucide-react'
import { useAuth } from '@/lib/contexts/AuthContext'
import {
  useCrawls,
  useCrawlDetail,
  useStartCrawl,
  useDeleteCrawl,
  useCrawlPages,
  useCrawlDuplicates,
  useCrawlRedirects,
  useInstantAudit,
  useInstantAudits,
  useEstimateCrawlCost,
} from '@/hooks/useCompetitorAnatomy'
import type { OnPageCrawl, OnPagePage, OnPageDuplicate, OnPageRedirect, InstantAudit } from '@/hooks/useCompetitorAnatomy'
import { useBackgroundTasks } from '@/lib/contexts/BackgroundTaskContext'
import { useQueryClient } from '@tanstack/react-query'

interface CompetitorAnatomyDashboardProps {
  onBack?: () => void
}

type DetailTab = 'summary' | 'pages' | 'articles' | 'issues' | 'duplicates' | 'redirects'

const TABS: { id: DetailTab; label: string; icon: React.ElementType }[] = [
  { id: 'summary', label: 'Summary', icon: BarChart3 },
  { id: 'pages', label: 'Pages', icon: Globe },
  { id: 'articles', label: 'Articles', icon: FileText },
  { id: 'issues', label: 'Issues', icon: AlertTriangle },
  { id: 'duplicates', label: 'Duplicates', icon: Copy },
  { id: 'redirects', label: 'Redirects', icon: ArrowRightLeft },
]

export default function CompetitorAnatomyDashboard({ onBack }: CompetitorAnatomyDashboardProps) {
  const { user } = useAuth()
  const userId = user?.id || ''

  const [selectedCrawlId, setSelectedCrawlId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>('summary')
  const [showNewCrawl, setShowNewCrawl] = useState(false)
  const [showInstantAudit, setShowInstantAudit] = useState(false)

  const { data: crawls = [], isLoading } = useCrawls(userId)
  const deleteCrawl = useDeleteCrawl()
  const queryClient = useQueryClient()
  const { tasks } = useBackgroundTasks()

  // Watch background tasks for crawl completion or failure → invalidate queries
  const handledTaskIds = useRef(new Set<string>())
  useEffect(() => {
    for (const task of tasks) {
      if ((task.status !== 'completed' && task.status !== 'failed') || handledTaskIds.current.has(task.id)) continue
      handledTaskIds.current.add(task.id)
      if (task.task_type === 'onpage_crawl') {
        queryClient.invalidateQueries({ queryKey: ['anatomy-crawls', userId] })
        queryClient.invalidateQueries({ queryKey: ['anatomy-crawl'] })
        queryClient.invalidateQueries({ queryKey: ['anatomy-pages'] })
        queryClient.invalidateQueries({ queryKey: ['anatomy-duplicates'] })
        queryClient.invalidateQueries({ queryKey: ['anatomy-redirects'] })
      }
    }
  }, [tasks, userId, queryClient])

  const selectedCrawl = crawls.find(c => c.id === selectedCrawlId) || null

  const handleSelectCrawl = (id: string) => {
    setSelectedCrawlId(id)
    setActiveTab('summary')
    setShowNewCrawl(false)
    setShowInstantAudit(false)
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
          <Microscope size={20} className="text-gray-900" />
          <h1 className="text-lg font-bold text-gray-900">Competitor Anatomy</h1>
        </div>
      </div>

      {/* Two-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL — Crawl list */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          {/* Actions Bar */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <button
              onClick={() => { setShowNewCrawl(!showNewCrawl); setShowInstantAudit(false) }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                showNewCrawl ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Plus size={13} />
              New Crawl
            </button>
            <button
              onClick={() => { setShowInstantAudit(!showInstantAudit); setShowNewCrawl(false) }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                showInstantAudit ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Zap size={13} />
              Instant Audit
            </button>
          </div>

          {/* New Crawl Form */}
          {showNewCrawl && <NewCrawlForm userId={userId} onClose={() => setShowNewCrawl(false)} />}

          {/* Instant Audit Form */}
          {showInstantAudit && <InstantAuditPanel userId={userId} />}

          {/* Crawl List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-gray-400" />
              </div>
            ) : crawls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Microscope size={32} className="text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">No crawls yet</p>
                <p className="text-xs text-gray-400 mt-1">Start a new crawl to analyze a competitor site</p>
              </div>
            ) : (
              crawls.map(crawl => (
                <CrawlListItem
                  key={crawl.id}
                  crawl={crawl}
                  isSelected={selectedCrawlId === crawl.id}
                  onSelect={() => handleSelectCrawl(crawl.id)}
                  onDelete={() => deleteCrawl.mutate({ crawlId: crawl.id, userId })}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANEL — Crawl detail */}
        <div className="flex-1 overflow-y-auto bg-[#FAFAFA]">
          {selectedCrawl ? (
            <CrawlDetailView
              crawlId={selectedCrawl.id}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Microscope size={48} className="text-gray-200 mb-4" />
              <p className="text-sm font-medium text-gray-400">Select a crawl to view details</p>
              <p className="text-xs text-gray-300 mt-1">or start a new crawl</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ====== Crawl List Item ======

function CrawlListItem({
  crawl,
  isSelected,
  onSelect,
  onDelete,
}: {
  crawl: OnPageCrawl
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const statusColor = {
    pending: 'bg-yellow-100 text-yellow-700',
    crawling: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  }[crawl.status] || 'bg-gray-100 text-gray-600'

  return (
    <div
      onClick={onSelect}
      className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${
        isSelected ? 'bg-gray-50 border-l-2 border-l-violet-500' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">
          {crawl.target_domain}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusColor}`}>
            {crawl.status}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-gray-400">
        <span>{crawl.pages_crawled || 0} / {crawl.max_crawl_pages} pages</span>
        {crawl.estimated_cost != null && <span>${crawl.estimated_cost.toFixed(4)}</span>}
        <span>{new Date(crawl.created_at).toLocaleDateString()}</span>
      </div>
      {crawl.status === 'crawling' && (
        <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-violet-500 h-1.5 rounded-full transition-all"
            style={{ width: `${crawl.crawl_progress || 0}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ====== New Crawl Form ======

function NewCrawlForm({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [domain, setDomain] = useState('')
  const [maxPages, setMaxPages] = useState(100)
  const [enableJs, setEnableJs] = useState(false)
  const [loadResources, setLoadResources] = useState(false)

  const startCrawl = useStartCrawl()
  const estimatedCost = useEstimateCrawlCost({
    maxPages,
    enableJavascript: enableJs,
    loadResources,
  })

  const pageOptions = [10, 50, 100, 500, 1000]

  const handleSubmit = () => {
    if (!domain.trim()) return
    startCrawl.mutate({
      target_domain: domain.trim().replace(/^https?:\/\//, ''),
      user_id: userId,
      max_crawl_pages: maxPages,
      enable_javascript: enableJs,
      load_resources: loadResources,
    })
    onClose()
  }

  return (
    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 space-y-3">
      <div>
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Domain</label>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className="mt-1 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-200"
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Max Pages</label>
        <div className="flex gap-1.5 mt-1">
          {pageOptions.map(n => (
            <button
              key={n}
              onClick={() => setMaxPages(n)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                maxPages === n ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enableJs}
            onChange={(e) => setEnableJs(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-200"
          />
          <span className="text-xs text-gray-600">JavaScript</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={loadResources}
            onChange={(e) => setLoadResources(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-200"
          />
          <span className="text-xs text-gray-600">Resources</span>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Est. cost: <span className="font-bold text-gray-900">${estimatedCost.toFixed(4)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!domain.trim() || startCrawl.isPending}
            className="px-4 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            {startCrawl.isPending ? 'Starting...' : 'Start Crawl'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ====== Instant Audit Panel ======

function InstantAuditPanel({ userId }: { userId: string }) {
  const [url, setUrl] = useState('')
  const audit = useInstantAudit()
  const { data: pastAudits = [] } = useInstantAudits(userId)

  const handleAudit = () => {
    if (!url.trim()) return
    let fullUrl = url.trim()
    if (!fullUrl.startsWith('http')) fullUrl = 'https://' + fullUrl
    audit.mutate({ url: fullUrl, user_id: userId })
  }

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="px-4 py-3 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/page"
            onKeyDown={(e) => e.key === 'Enter' && handleAudit()}
            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
          <button
            onClick={handleAudit}
            disabled={!url.trim() || audit.isPending}
            className="px-3 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            {audit.isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          </button>
        </div>

        {/* Inline result */}
        {audit.data && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 truncate max-w-[200px]">{audit.data.url}</span>
              <ScoreBadge score={audit.data.onpage_score} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Stat label="Words" value={audit.data.word_count} />
              <Stat label="H1" value={audit.data.h1_count} />
              <Stat label="Int. Links" value={audit.data.internal_links} />
              <Stat label="Ext. Links" value={audit.data.external_links} />
              <Stat label="Images" value={audit.data.images_count} />
              <Stat label="No ALT" value={audit.data.images_without_alt} warn={audit.data.images_without_alt > 0} />
              <Stat label="Status" value={audit.data.status_code} />
              <Stat label="Indexable" value={audit.data.is_indexable ? 'Yes' : 'No'} warn={!audit.data.is_indexable} />
            </div>
          </div>
        )}

        {audit.error && (
          <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {audit.error.message}
          </div>
        )}
      </div>

      {/* Past audits */}
      {pastAudits.length > 0 && (
        <div className="px-4 pb-3 max-h-40 overflow-y-auto">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Recent Audits</p>
          {pastAudits.slice(0, 5).map(a => (
            <div key={a.id} className="flex items-center justify-between py-1.5 border-t border-gray-50">
              <span className="text-[11px] text-gray-600 truncate max-w-[180px]">{a.url}</span>
              <ScoreBadge score={a.onpage_score ?? 0} small />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ====== Crawl Detail View ======

function CrawlDetailView({
  crawlId,
  activeTab,
  onTabChange,
}: {
  crawlId: string
  activeTab: DetailTab
  onTabChange: (tab: DetailTab) => void
}) {
  const { data: crawl } = useCrawlDetail(crawlId)

  if (!crawl) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    )
  }

  const domainInfo = crawl.summary?.domain_info

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <img
            src={`https://www.google.com/s2/favicons?domain=${crawl.target_domain}&sz=32`}
            alt=""
            className="w-6 h-6 rounded"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div>
            <h2 className="text-base font-bold text-gray-900">{crawl.target_domain}</h2>
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              {domainInfo?.cms && <span>CMS: {domainInfo.cms}</span>}
              {domainInfo?.server && <span>Server: {domainInfo.server}</span>}
              <span>{crawl.pages_crawled} pages crawled</span>
            </div>
          </div>
          <span className={`ml-auto text-[10px] font-bold px-2 py-1 rounded ${
            crawl.status === 'completed' ? 'bg-green-100 text-green-700'
            : crawl.status === 'crawling' ? 'bg-blue-100 text-blue-700'
            : crawl.status === 'failed' ? 'bg-red-100 text-red-700'
            : 'bg-yellow-100 text-yellow-700'
          }`}>
            {crawl.status}
          </span>
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
        {activeTab === 'summary' && <SummaryTab crawl={crawl} />}
        {activeTab === 'pages' && <PagesTab crawlId={crawl.id} />}
        {activeTab === 'articles' && <ArticlesTab crawlId={crawl.id} />}
        {activeTab === 'issues' && <IssuesTab crawl={crawl} />}
        {activeTab === 'duplicates' && <DuplicatesTab crawlId={crawl.id} />}
        {activeTab === 'redirects' && <RedirectsTab crawlId={crawl.id} />}
      </div>
    </div>
  )
}

// ====== Summary Tab ======

function SummaryTab({ crawl }: { crawl: OnPageCrawl }) {
  const summary = crawl.summary
  const pageMetrics = summary?.page_metrics || {}
  const checks = pageMetrics?.checks || {}
  const domainInfo = summary?.domain_info

  // Calculate overall score from page_metrics
  const onpageScore = pageMetrics?.onpage_score ?? null

  const issueCount = Object.entries(checks).filter(([, v]) => typeof v === 'number' && v > 0).length

  return (
    <div className="space-y-6">
      {/* Score + Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {onpageScore != null && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className={`text-3xl font-black ${
              onpageScore >= 80 ? 'text-green-600' : onpageScore >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {onpageScore.toFixed(1)}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">On-Page Score</div>
          </div>
        )}
        <MetricCard label="Pages Crawled" value={crawl.pages_crawled} />
        <MetricCard label="Issues Found" value={issueCount} />
        <MetricCard label="Cost" value={`$${(crawl.actual_cost ?? crawl.estimated_cost ?? 0).toFixed(4)}`} />
      </div>

      {/* Domain Info */}
      {domainInfo && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Domain Info</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-400">Domain</span>
              <p className="font-semibold text-gray-900">{domainInfo.name}</p>
            </div>
            {domainInfo.cms && (
              <div>
                <span className="text-gray-400">CMS</span>
                <p className="font-semibold text-gray-900">{domainInfo.cms}</p>
              </div>
            )}
            <div>
              <span className="text-gray-400">Server</span>
              <p className="font-semibold text-gray-900">{domainInfo.server || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-400">IP</span>
              <p className="font-semibold text-gray-900">{domainInfo.ip || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Page Metrics Breakdown */}
      {Object.keys(pageMetrics).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Page Metrics</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {pageMetrics.links_external != null && <SmallMetric label="External Links" value={pageMetrics.links_external} />}
            {pageMetrics.links_internal != null && <SmallMetric label="Internal Links" value={pageMetrics.links_internal} />}
            {pageMetrics.duplicate_title != null && <SmallMetric label="Duplicate Titles" value={pageMetrics.duplicate_title} warn={pageMetrics.duplicate_title > 0} />}
            {pageMetrics.duplicate_description != null && <SmallMetric label="Duplicate Desc." value={pageMetrics.duplicate_description} warn={pageMetrics.duplicate_description > 0} />}
            {pageMetrics.duplicate_content != null && <SmallMetric label="Duplicate Content" value={pageMetrics.duplicate_content} warn={pageMetrics.duplicate_content > 0} />}
            {pageMetrics.broken_links != null && <SmallMetric label="Broken Links" value={pageMetrics.broken_links} warn={pageMetrics.broken_links > 0} />}
          </div>
        </div>
      )}

      {/* Issue Summary from checks */}
      {Object.keys(checks).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Issue Checks Summary</h3>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {Object.entries(checks)
              .filter(([, v]) => typeof v === 'number' && v > 0)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([key, count]) => (
                <div key={key} className="flex items-center justify-between py-1 text-xs">
                  <span className="text-gray-600">{formatCheckName(key)}</span>
                  <span className="font-bold text-gray-900">{count as number}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ====== Pages Tab ======

function PagesTab({ crawlId }: { crawlId: string }) {
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState('onpage_score')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const limit = 50

  const { data, isLoading } = useCrawlPages(crawlId, {
    limit,
    offset: page * limit,
    sort,
    order,
    resource_type: 'html',
  })

  const pages = data?.pages || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  const handleSort = (col: string) => {
    if (sort === col) {
      setOrder(order === 'desc' ? 'asc' : 'desc')
    } else {
      setSort(col)
      setOrder('desc')
    }
    setPage(0)
  }

  const SortIcon = ({ col }: { col: string }) => (
    sort === col ? (order === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />) : null
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">All Pages ({total})</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          Page {page + 1} of {totalPages || 1}
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2 py-1 bg-white border border-gray-200 rounded disabled:opacity-30">Prev</button>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-2 py-1 bg-white border border-gray-200 rounded disabled:opacity-30">Next</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-3 py-2.5 font-semibold">URL</th>
                  <th className="text-center px-2 py-2.5 font-semibold cursor-pointer" onClick={() => handleSort('onpage_score')}>
                    <span className="inline-flex items-center gap-0.5">Score <SortIcon col="onpage_score" /></span>
                  </th>
                  <th className="text-center px-2 py-2.5 font-semibold cursor-pointer" onClick={() => handleSort('content_word_count')}>
                    <span className="inline-flex items-center gap-0.5">Words <SortIcon col="content_word_count" /></span>
                  </th>
                  <th className="text-center px-2 py-2.5 font-semibold">Title</th>
                  <th className="text-center px-2 py-2.5 font-semibold cursor-pointer" onClick={() => handleSort('h1_count')}>
                    <span className="inline-flex items-center gap-0.5">H1 <SortIcon col="h1_count" /></span>
                  </th>
                  <th className="text-center px-2 py-2.5 font-semibold cursor-pointer" onClick={() => handleSort('internal_links_count')}>
                    <span className="inline-flex items-center gap-0.5">Int.Links <SortIcon col="internal_links_count" /></span>
                  </th>
                  <th className="text-center px-2 py-2.5 font-semibold">Imgs</th>
                  <th className="text-center px-2 py-2.5 font-semibold cursor-pointer" onClick={() => handleSort('fetch_time')}>
                    <span className="inline-flex items-center gap-0.5">Fetch <SortIcon col="fetch_time" /></span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pages.map(p => (
                  <PageRow key={p.id} page={p} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function PageRow({ page }: { page: OnPagePage }) {
  const urlPath = (() => {
    try { return new URL(page.url).pathname } catch { return page.url }
  })()

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-3 py-2 max-w-[250px]">
        <div className="flex items-center gap-1">
          <span className="truncate text-gray-700" title={page.url}>{urlPath}</span>
          <a href={page.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-violet-500 flex-shrink-0">
            <ExternalLink size={10} />
          </a>
        </div>
        {page.meta_title && (
          <p className="text-[10px] text-gray-400 truncate max-w-[240px]">{page.meta_title}</p>
        )}
      </td>
      <td className="text-center px-2 py-2"><ScoreBadge score={page.onpage_score} small /></td>
      <td className="text-center px-2 py-2 text-gray-600">{page.content_word_count ?? '-'}</td>
      <td className="text-center px-2 py-2 text-gray-600">{page.meta_title_length ?? '-'}</td>
      <td className="text-center px-2 py-2 text-gray-600">{page.h1_count}</td>
      <td className="text-center px-2 py-2 text-gray-600">{page.internal_links_count}</td>
      <td className="text-center px-2 py-2">
        {page.images_without_alt > 0 ? (
          <span className="text-yellow-600">{page.images_count} ({page.images_without_alt})</span>
        ) : (
          <span className="text-gray-600">{page.images_count}</span>
        )}
      </td>
      <td className="text-center px-2 py-2 text-gray-600">{page.fetch_time ? `${(page.fetch_time * 1000).toFixed(0)}ms` : '-'}</td>
    </tr>
  )
}

// ====== Articles Tab ======

function ArticlesTab({ crawlId }: { crawlId: string }) {
  const [page, setPage] = useState(0)
  const limit = 50

  const { data, isLoading } = useCrawlPages(crawlId, {
    limit,
    offset: page * limit,
    sort: 'content_word_count',
    order: 'desc',
    resource_type: 'html',
    min_word_count: 200,
  })

  const pages = data?.pages || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Articles ({total})</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          Page {page + 1} of {totalPages || 1}
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2 py-1 bg-white border border-gray-200 rounded disabled:opacity-30">Prev</button>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-2 py-1 bg-white border border-gray-200 rounded disabled:opacity-30">Next</button>
        </div>
      </div>

      <p className="text-xs text-gray-400">HTML pages with 200+ words — likely blog posts and articles.</p>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : pages.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">No articles found</div>
      ) : (
        <div className="space-y-2">
          {pages.map(p => {
            const urlPath = (() => { try { return new URL(p.url).pathname } catch { return p.url } })()
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-gray-900 hover:text-violet-600 truncate">
                        {p.meta_title || urlPath}
                      </a>
                      <ExternalLink size={12} className="text-gray-300 flex-shrink-0" />
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">{urlPath}</p>
                    {p.meta_description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.meta_description}</p>
                    )}
                  </div>
                  <ScoreBadge score={p.onpage_score} />
                </div>
                <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-400">
                  <span>{p.content_word_count} words</span>
                  <span>H1: {p.h1_count}</span>
                  <span>{p.internal_links_count} int. links</span>
                  <span>{p.images_count} images</span>
                  {p.last_modified && <span>{new Date(p.last_modified).toLocaleDateString()}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ====== Issues Tab ======

function IssuesTab({ crawl }: { crawl: OnPageCrawl }) {
  const checks = crawl.summary?.page_metrics?.checks || {}
  const [expanded, setExpanded] = useState<string | null>(null)

  const issues = Object.entries(checks)
    .filter(([, v]) => typeof v === 'number' && v > 0)
    .sort(([, a], [, b]) => (b as number) - (a as number))

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 size={40} className="text-green-400 mb-3" />
        <p className="text-sm font-semibold text-gray-600">No issues detected</p>
        <p className="text-xs text-gray-400 mt-1">The crawl didn&apos;t find any SEO issues</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-900">SEO Issues ({issues.length})</h3>
      {issues.map(([key, count]) => (
        <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === key ? null : key)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={14} className={(count as number) > 10 ? 'text-red-500' : 'text-yellow-500'} />
              <span className="text-sm font-semibold text-gray-900">{formatCheckName(key)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-700">{count as number} pages</span>
              {expanded === key ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </div>
          </button>
          {expanded === key && (
            <div className="px-4 pb-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 py-2">Affected pages will be listed here when page-level data is available. Use the Pages tab to filter by specific issues.</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ====== Duplicates Tab ======

function DuplicatesTab({ crawlId }: { crawlId: string }) {
  const [filterType, setFilterType] = useState<string>('')
  const { data: duplicates = [], isLoading } = useCrawlDuplicates(crawlId, filterType || undefined)

  const grouped = useMemo(() => {
    const groups: Record<string, OnPageDuplicate[]> = { title: [], description: [], content: [] }
    for (const d of duplicates) {
      if (groups[d.duplicate_type]) groups[d.duplicate_type].push(d)
    }
    return groups
  }, [duplicates])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Duplicates ({duplicates.length})</h3>
        <div className="flex gap-1">
          {['', 'title', 'description', 'content'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                filterType === t ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t || 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : duplicates.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">No duplicates found</div>
      ) : (
        <div className="space-y-2">
          {duplicates.map(dup => (
            <div key={dup.id} className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  dup.duplicate_type === 'content' ? 'bg-red-100 text-red-700'
                  : dup.duplicate_type === 'title' ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-blue-100 text-blue-700'
                }`}>
                  {dup.duplicate_type}
                </span>
                {dup.similarity != null && <span className="text-[10px] text-gray-400">{dup.similarity}% similar</span>}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 truncate">{dup.url_1}</span>
                  <a href={dup.url_1} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-violet-500"><ExternalLink size={10} /></a>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 truncate">{dup.url_2}</span>
                  <a href={dup.url_2} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-violet-500"><ExternalLink size={10} /></a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ====== Redirects Tab ======

function RedirectsTab({ crawlId }: { crawlId: string }) {
  const { data: redirects = [], isLoading } = useCrawlRedirects(crawlId)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-900">Redirect Chains ({redirects.length})</h3>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : redirects.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">No redirect chains detected</div>
      ) : (
        <div className="space-y-2">
          {redirects.map(r => (
            <div key={r.id} className={`bg-white rounded-xl border p-3 ${
              r.is_redirect_loop ? 'border-red-200' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  r.redirect_code === 301 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {r.redirect_code}
                </span>
                <span className="text-[10px] text-gray-400">Chain: {r.chain_length}</span>
                {r.is_redirect_loop && (
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">LOOP</span>
                )}
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-gray-500 truncate">{r.from_url}</div>
                <div className="text-gray-400">→</div>
                <div className="text-gray-500 truncate">{r.to_url}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ====== Shared Components ======

function ScoreBadge({ score, small }: { score: number; small?: boolean }) {
  const color = score >= 80 ? 'bg-green-100 text-green-700'
    : score >= 50 ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700'

  return (
    <span className={`font-bold rounded-lg ${color} ${
      small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
    }`}>
      {score.toFixed(1)}
    </span>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <div className="text-[11px] text-gray-400 mt-1">{label}</div>
    </div>
  )
}

function SmallMetric({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-50">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className={`text-xs font-bold ${warn ? 'text-red-600' : 'text-gray-900'}`}>{value}</span>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string | number | boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-gray-400">{label}</span>
      <span className={`font-bold ${warn ? 'text-red-600' : 'text-gray-700'}`}>{String(value)}</span>
    </div>
  )
}

function formatCheckName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\bSeo\b/g, 'SEO')
    .replace(/\bUrl\b/g, 'URL')
    .replace(/\bHttp\b/g, 'HTTP')
    .replace(/\bHtml\b/g, 'HTML')
    .replace(/\bCss\b/g, 'CSS')
}
