'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  Plus,
  GitBranch,
  MoreHorizontal,
  Trash2,
  Copy,
  Loader2,
  BarChart3,
  Pencil,
} from 'lucide-react'
import { useFunnels, useFunnel, useCreateFunnel, useUpdateFunnel, useDeleteFunnel } from '@/hooks/useFunnelBuilder'
import FunnelFlowEditor from './FunnelFlowEditor'
import FunnelAnalytics from './FunnelAnalytics'

interface FunnelBuilderDashboardProps {
  onBack: () => void
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  archived: 'bg-slate-100 text-slate-500',
}

export default function FunnelBuilderDashboard({ onBack }: FunnelBuilderDashboardProps) {
  const [editingFunnelId, setEditingFunnelId] = useState<string | null>(null)
  const [analyticsFunnelId, setAnalyticsFunnelId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFunnelName, setNewFunnelName] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const { data: funnels = [], isLoading } = useFunnels()
  const { data: editingFunnel } = useFunnel(editingFunnelId)
  const { data: analyticsFunnel } = useFunnel(analyticsFunnelId)
  const createFunnel = useCreateFunnel()
  const updateFunnel = useUpdateFunnel()
  const deleteFunnel = useDeleteFunnel()

  const handleCreate = async () => {
    if (!newFunnelName.trim()) return
    const result = await createFunnel.mutateAsync({ name: newFunnelName.trim() })
    setNewFunnelName('')
    setShowCreateModal(false)
    setEditingFunnelId(result.id)
  }

  const handleSave = async (data: any) => {
    if (!editingFunnelId) return
    await updateFunnel.mutateAsync({ funnelId: editingFunnelId, updates: data })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this funnel?')) return
    await deleteFunnel.mutateAsync(id)
    setMenuOpen(null)
  }

  const handleDuplicate = async (funnel: any) => {
    await createFunnel.mutateAsync({
      name: `${funnel.name} (copy)`,
      site_id: funnel.site_id,
      description: funnel.description,
    })
    setMenuOpen(null)
  }

  // ========= Flow Editor mode =========
  if (editingFunnelId && editingFunnel) {
    return (
      <FunnelFlowEditor
        funnel={editingFunnel}
        onSave={handleSave}
        onClose={() => setEditingFunnelId(null)}
        isSaving={updateFunnel.isPending}
      />
    )
  }

  // ========= Analytics mode =========
  if (analyticsFunnelId && analyticsFunnel) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setAnalyticsFunnelId(null)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to funnels
          </button>
          <h1 className="text-xl font-bold text-gray-900 mb-1">{analyticsFunnel.name}</h1>
          <p className="text-sm text-gray-400 mb-6">{analyticsFunnel.description || 'No description'}</p>
          <FunnelAnalytics funnelId={analyticsFunnelId} graph={analyticsFunnel.graph} />
        </div>
      </div>
    )
  }

  // ========= Funnel List =========
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={18} className="text-gray-500" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <GitBranch size={20} className="text-indigo-600" />
                Funnel Builder
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Visual conversion funnels — landing pages, forms, email, conversions
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            <Plus size={16} />
            New Funnel
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : funnels.length === 0 ? (
          <div className="text-center py-20">
            <GitBranch size={48} className="mx-auto mb-4 text-gray-200" />
            <h2 className="text-lg font-bold text-gray-700 mb-1">No funnels yet</h2>
            <p className="text-sm text-gray-400 mb-6">
              Create your first conversion funnel to track visitor journey
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
            >
              Create First Funnel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {funnels.map((funnel: any) => {
              const nodeCount = funnel.graph?.nodes?.length || (funnel.config?.nodeCount ?? 0)
              return (
                <div
                  key={funnel.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group relative"
                >
                  {/* Card header */}
                  <div className="px-5 py-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{funnel.name}</h3>
                        {funnel.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{funnel.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 ml-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGE[funnel.status] || STATUS_BADGE.draft}`}>
                          {funnel.status}
                        </span>
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === funnel.id ? null : funnel.id)}
                            className="p-1 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal size={14} className="text-gray-400" />
                          </button>
                          {menuOpen === funnel.id && (
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 min-w-[140px]">
                              <button
                                onClick={() => handleDuplicate(funnel)}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Copy size={12} />
                                Duplicate
                              </button>
                              <button
                                onClick={() => handleDelete(funnel.id)}
                                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="px-5 py-3">
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{nodeCount} steps</span>
                      <span>Updated {new Date(funnel.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Card actions */}
                  <div className="px-5 py-3 border-t border-gray-50 flex items-center gap-2">
                    <button
                      onClick={() => setEditingFunnelId(funnel.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                    <button
                      onClick={() => setAnalyticsFunnelId(funnel.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors"
                    >
                      <BarChart3 size={12} />
                      Analytics
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full mx-4 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Create New Funnel</h2>
            <input
              type="text"
              value={newFunnelName}
              onChange={(e) => setNewFunnelName(e.target.value)}
              placeholder="Funnel name..."
              autoFocus
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowCreateModal(false); setNewFunnelName('') }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newFunnelName.trim() || createFunnel.isPending}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                {createFunnel.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
