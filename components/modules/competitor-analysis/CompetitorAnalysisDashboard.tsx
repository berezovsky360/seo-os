'use client'

import React, { useState } from 'react'
import {
  ChevronLeft, Swords, Plus, Trash2, RefreshCw, Loader2,
  TrendingUp, TrendingDown, Search, ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useSites } from '@/hooks/useSites'
import {
  useCompetitors,
  useAddCompetitor,
  useDeleteCompetitor,
  useRunAnalysis,
  useKeywordGaps,
  useRankingComparison,
} from '@/hooks/useCompetitorAnalysis'
import type { Competitor } from '@/hooks/useCompetitorAnalysis'

interface CompetitorAnalysisDashboardProps {
  onBack?: () => void
}

export default function CompetitorAnalysisDashboard({ onBack }: CompetitorAnalysisDashboardProps) {
  const { data: sites = [] } = useSites()
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [newDomain, setNewDomain] = useState('')
  const [newName, setNewName] = useState('')
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null)

  // Auto-select first site
  React.useEffect(() => {
    if (sites.length > 0 && !selectedSiteId) {
      setSelectedSiteId(sites[0].id)
    }
  }, [sites, selectedSiteId])

  const { data: competitors = [], isLoading } = useCompetitors(selectedSiteId)
  const addCompetitor = useAddCompetitor()
  const deleteCompetitor = useDeleteCompetitor()
  const runAnalysis = useRunAnalysis()

  const handleAdd = () => {
    if (!newDomain.trim() || !selectedSiteId) return
    addCompetitor.mutate(
      { site_id: selectedSiteId, domain: newDomain.trim(), name: newName.trim() || undefined },
      {
        onSuccess: () => {
          setNewDomain('')
          setNewName('')
        },
      }
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-5 bg-[#F5F5F7] border-b border-gray-200 sticky top-0 z-10">
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
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl space-y-6">
        {/* Site Selector */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Select Site</label>
            <select
              value={selectedSiteId}
              onChange={(e) => {
                setSelectedSiteId(e.target.value)
                setExpandedCompetitor(null)
              }}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
            >
              {sites.map(site => (
                <option key={site.id} value={site.id}>{site.name} — {site.url}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Add Competitor */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Add Competitor</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="competitor.com"
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (optional)"
              className="sm:w-48 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={addCompetitor.isPending || !newDomain.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-black transition-colors disabled:opacity-50"
            >
              {addCompetitor.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add
            </button>
          </div>
          {addCompetitor.isError && (
            <p className="text-xs text-red-500 mt-2">{addCompetitor.error.message}</p>
          )}
        </div>

        {/* Competitor List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-gray-400" />
          </div>
        ) : competitors.length === 0 ? (
          <div className="text-center py-16">
            <Swords size={40} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No competitors yet</h3>
            <p className="text-sm text-gray-500">Add a competitor domain to start tracking.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {competitors.map((comp) => (
              <CompetitorCard
                key={comp.id}
                competitor={comp}
                siteId={selectedSiteId}
                isExpanded={expandedCompetitor === comp.id}
                onToggle={() => setExpandedCompetitor(expandedCompetitor === comp.id ? null : comp.id)}
                onDelete={() => deleteCompetitor.mutate({ id: comp.id, siteId: selectedSiteId })}
                onAnalyze={() => runAnalysis.mutate({ competitorId: comp.id, siteId: selectedSiteId })}
                isAnalyzing={runAnalysis.isPending && runAnalysis.variables?.competitorId === comp.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ====== Competitor Card ======

function CompetitorCard({
  competitor,
  siteId,
  isExpanded,
  onToggle,
  onDelete,
  onAnalyze,
  isAnalyzing,
}: {
  competitor: Competitor
  siteId: string
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
  onAnalyze: () => void
  isAnalyzing: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header Row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <img
          src={`https://www.google.com/s2/favicons?domain=${competitor.domain}&sz=32`}
          alt=""
          className="w-8 h-8 rounded-lg"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 truncate">
              {competitor.name || competitor.domain}
            </h3>
            {competitor.name && (
              <span className="text-xs text-gray-400 truncate">{competitor.domain}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
            <span>{competitor.ranked_keywords_count} keywords</span>
            {competitor.last_synced_at && (
              <span>Synced {new Date(competitor.last_synced_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded: Keyword Gaps + Ranking Comparison */}
      {isExpanded && (
        <CompetitorDetails siteId={siteId} competitorId={competitor.id} />
      )}
    </div>
  )
}

// ====== Competitor Details (Gaps + Comparison) ======

function CompetitorDetails({ siteId, competitorId }: { siteId: string; competitorId: string }) {
  const [tab, setTab] = useState<'gaps' | 'compare'>('gaps')
  const { data: gapsData, isLoading: gapsLoading } = useKeywordGaps(siteId, competitorId)
  const { data: compareData, isLoading: compareLoading } = useRankingComparison(siteId, competitorId)

  return (
    <div className="border-t border-gray-100 px-5 py-4">
      {/* Tabs */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setTab('gaps')}
          className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
            tab === 'gaps' ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600'
          }`}
        >
          Keyword Gaps {gapsData ? `(${gapsData.total})` : ''}
        </button>
        <button
          onClick={() => setTab('compare')}
          className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
            tab === 'compare' ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600'
          }`}
        >
          Ranking Comparison {compareData ? `(${compareData.total})` : ''}
        </button>
      </div>

      {tab === 'gaps' ? (
        gapsLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
        ) : !gapsData || gapsData.gaps.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No keyword gaps found. Run analysis first.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2">Keyword</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2">Volume</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2">Position</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2">KD</th>
                </tr>
              </thead>
              <tbody>
                {gapsData.gaps.slice(0, 20).map((gap, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 text-gray-800 font-medium">{gap.keyword}</td>
                    <td className="py-2 text-right text-gray-500">{gap.search_volume?.toLocaleString() || '—'}</td>
                    <td className="py-2 text-right text-gray-500">{gap.position || '—'}</td>
                    <td className="py-2 text-right text-gray-500">{gap.keyword_difficulty || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        compareLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
        ) : !compareData || compareData.overlapping.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No overlapping keywords found.</p>
        ) : (
          <>
            {/* Summary */}
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg">
                <TrendingUp size={14} className="text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">{compareData.winning}</span>
                <span className="text-xs text-emerald-600">winning</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                <TrendingDown size={14} className="text-red-600" />
                <span className="text-sm font-bold text-red-700">{compareData.losing}</span>
                <span className="text-xs text-red-600">losing</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2">Keyword</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2">You</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2">Them</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {compareData.overlapping.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 text-gray-800 font-medium">{row.keyword}</td>
                      <td className={`py-2 text-right font-bold ${row.winning ? 'text-emerald-600' : 'text-red-500'}`}>
                        #{row.your_position}
                      </td>
                      <td className={`py-2 text-right font-bold ${!row.winning ? 'text-emerald-600' : 'text-red-500'}`}>
                        #{row.competitor_position}
                      </td>
                      <td className="py-2 text-right text-gray-500">{row.search_volume?.toLocaleString() || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      )}
    </div>
  )
}
