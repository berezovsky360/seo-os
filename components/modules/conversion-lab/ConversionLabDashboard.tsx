'use client'

import React, { useState, useMemo } from 'react'
import {
  ChevronLeft,
  FlaskConical,
  Search,
  ChevronDown,
  Plus,
  Trash2,
  Loader2,
  Users,
  Ghost,
  Kanban,
  Pencil,
  Eye,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  usePipelineStages,
  useLeads,
  useUpdateLead,
  useGhostPopups,
  useCreatePopup,
  useUpdatePopup,
  useDeletePopup,
} from '@/hooks/useConversionLab'
import KanbanPipeline from './KanbanPipeline'
import LeadCard from './LeadCard'
import GhostPopupEditor from './GhostPopupEditor'

// ====== Types ======

type Tab = 'pipeline' | 'leads' | 'popups'

interface Props {
  onBack?: () => void
}

// ====== Helpers ======

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'N/A'
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return new Date(iso).toLocaleDateString()
}

function scoreColor(score: number | null): { bg: string; text: string } {
  if (score === null || score === undefined) return { bg: 'bg-gray-100', text: 'text-gray-500' }
  if (score >= 50) return { bg: 'bg-green-100', text: 'text-green-700' }
  if (score >= 25) return { bg: 'bg-yellow-100', text: 'text-yellow-700' }
  return { bg: 'bg-gray-100', text: 'text-gray-500' }
}

const PAGE_SIZE = 50

// ====== Component ======

export default function ConversionLabDashboard({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('pipeline')

  // Leads tab state
  const [searchTerm, setSearchTerm] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  // Ghost Popups tab state
  const [editingPopup, setEditingPopup] = useState<any | null>(null)
  const [showPopupEditor, setShowPopupEditor] = useState(false)
  const [deletingPopupId, setDeletingPopupId] = useState<string | null>(null)

  // Data hooks
  const { data: stages = [], isLoading: stagesLoading } = usePipelineStages()
  const { data: leadsData, isLoading: leadsLoading } = useLeads({
    siteId: siteFilter || undefined,
    stage: stageFilter || undefined,
    search: searchTerm || undefined,
    page: currentPage,
  })
  const leads = leadsData?.leads || []
  const leadsTotal = leadsData?.total || 0
  const updateLead = useUpdateLead()

  // Pipeline tab: fetch all leads without filters for kanban
  const { data: pipelineLeadsData, isLoading: pipelineLeadsLoading } = useLeads({
    siteId: siteFilter || undefined,
  })
  const pipelineLeads = pipelineLeadsData?.leads || []

  // Ghost Popups
  const { data: popups = [], isLoading: popupsLoading } = useGhostPopups(siteFilter || undefined)
  const createPopup = useCreatePopup()
  const updatePopup = useUpdatePopup()
  const deletePopup = useDeletePopup()

  // Landing sites for site selector
  const { data: landingSites = [] } = useQuery({
    queryKey: ['landing-sites'],
    queryFn: async () => {
      const res = await fetch('/api/landing/sites')
      if (!res.ok) return []
      return res.json()
    },
  })

  const totalPages = Math.ceil(leadsTotal / PAGE_SIZE)

  const handleStageDrop = (leadId: string, newStage: string) => {
    updateLead.mutate({ leadId, updates: { pipeline_stage: newStage || null } })
  }

  const handlePopupSave = async (data: Record<string, any>) => {
    if (editingPopup?.id) {
      await updatePopup.mutateAsync({ popupId: editingPopup.id, updates: data })
    } else {
      await createPopup.mutateAsync(data)
    }
    setShowPopupEditor(false)
    setEditingPopup(null)
  }

  const handlePopupDelete = async (popupId: string) => {
    await deletePopup.mutateAsync(popupId)
    setDeletingPopupId(null)
  }

  const handlePopupToggle = (popup: any) => {
    updatePopup.mutate({ popupId: popup.id, updates: { is_active: !popup.is_active } })
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'pipeline', label: 'Pipeline', icon: Kanban },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'popups', label: 'Ghost Popups', icon: Ghost },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-5 border-b border-gray-200 sticky top-0 z-10 bg-[#F5F5F7] flex-shrink-0">
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
          <FlaskConical size={20} className="text-fuchsia-600" />
          <h1 className="text-lg font-bold text-gray-900">Conversion Lab</h1>
        </div>

        {/* Site selector (global) */}
        <div className="relative">
          <select
            value={siteFilter}
            onChange={(e) => { setSiteFilter(e.target.value); setCurrentPage(1) }}
            className="appearance-none border border-gray-200 rounded-lg text-sm px-3 py-1.5 pr-8 bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="">All Sites</option>
            {landingSites.map((site: any) => (
              <option key={site.id} value={site.id}>{site.name || site.domain}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Tab bar */}
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
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* ======== PIPELINE TAB ======== */}
        {activeTab === 'pipeline' && (
          <>
            {stagesLoading || pipelineLeadsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-gray-300" />
              </div>
            ) : (
              <KanbanPipeline
                stages={stages}
                leads={pipelineLeads}
                onLeadClick={(id) => setSelectedLeadId(id)}
                onStageDrop={handleStageDrop}
              />
            )}
          </>
        )}

        {/* ======== LEADS TAB ======== */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                  placeholder="Search by email or name..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="relative">
                <select
                  value={stageFilter}
                  onChange={(e) => { setStageFilter(e.target.value); setCurrentPage(1) }}
                  className="appearance-none border border-gray-200 rounded-lg text-sm px-3 py-2 pr-8 bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="">All Stages</option>
                  {stages.map((s: any) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {leadsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-gray-300" />
                </div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Users size={40} className="text-gray-200" />
                  <h3 className="text-gray-500 font-medium">No leads found</h3>
                  <p className="text-sm text-gray-400">Leads will appear here as visitors interact with your landing pages.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Email</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Name</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Score</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Stage</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Source</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Last Seen</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {leads.map((lead: any) => {
                        const sc = scoreColor(lead.lead_score)
                        return (
                          <tr
                            key={lead.id}
                            onClick={() => setSelectedLeadId(lead.id)}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 truncate max-w-[200px]">
                              {lead.email}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[140px]">
                              {lead.name || '-'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                                {lead.lead_score ?? '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {lead.pipeline_stage || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[160px]">
                              {lead.utm_source || lead.source_url || '-'}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400">
                              {relativeTime(lead.last_seen_at)}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400">
                              {relativeTime(lead.created_at)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, leadsTotal)} of {leadsTotal} leads
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page: number
                    if (totalPages <= 5) {
                      page = i + 1
                    } else if (currentPage <= 3) {
                      page = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i
                    } else {
                      page = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======== GHOST POPUPS TAB ======== */}
        {activeTab === 'popups' && (
          <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {popups.length} popup{popups.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => { setEditingPopup(null); setShowPopupEditor(true) }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 transition-colors"
              >
                <Plus size={14} />
                Create Popup
              </button>
            </div>

            {popupsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-gray-300" />
              </div>
            ) : popups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Ghost size={40} className="text-gray-200" />
                <h3 className="text-gray-500 font-medium">No ghost popups yet</h3>
                <p className="text-sm text-gray-400">Create behavior-triggered popups to capture leads on your landing pages.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {popups.map((popup: any) => (
                  <div
                    key={popup.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{popup.name}</h3>
                        <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700">
                          {popup.trigger_rules?.type?.replace('_', ' ') || 'unknown'}
                        </span>
                      </div>
                      <button
                        onClick={() => handlePopupToggle(popup)}
                        title={popup.is_active ? 'Active' : 'Inactive'}
                        className="flex-shrink-0"
                      >
                        {popup.is_active ? (
                          <ToggleRight size={24} className="text-indigo-600" />
                        ) : (
                          <ToggleLeft size={24} className="text-gray-300" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Eye size={12} />
                        <span>{popup.impressions ?? 0} impressions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={12} />
                        <span>{popup.conversions ?? 0} conversions</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                      <button
                        onClick={() => { setEditingPopup(popup); setShowPopupEditor(true) }}
                        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingPopupId(popup.id)}
                        className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lead Card Modal */}
      {selectedLeadId && (
        <LeadCard
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}

      {/* Ghost Popup Editor Modal */}
      {showPopupEditor && (
        <GhostPopupEditor
          popup={editingPopup}
          landingSiteId={siteFilter || undefined}
          onSave={handlePopupSave}
          onClose={() => { setShowPopupEditor(false); setEditingPopup(null) }}
        />
      )}

      {/* Delete confirmation overlay */}
      {deletingPopupId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Delete Popup</h3>
            <p className="text-sm text-gray-600">Are you sure you want to delete this popup? This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingPopupId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePopupDelete(deletingPopupId)}
                disabled={deletePopup.isPending}
                className="px-4 py-2 text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2"
              >
                {deletePopup.isPending && <Loader2 size={14} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
