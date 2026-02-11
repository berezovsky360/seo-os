'use client'

import React, { useState, useMemo } from 'react'
import {
  ArrowRightLeft, Plus, Search, Upload, RefreshCw, Trash2, Edit3,
  ExternalLink, AlertTriangle, Check, X, Loader2, FileText, Regex,
  ArrowRight, Eye, ChevronDown, RotateCcw, Shield
} from 'lucide-react'
import {
  useRedirects, useCreateRedirect, useUpdateRedirect, useDeleteRedirect,
  use404Log, useDismiss404, useCreate404Redirect, useImportRedirects,
  type Redirect, type FourOhFourEntry
} from '@/hooks/useRedirects'
import { useToast } from '@/lib/contexts/ToastContext'

interface RedirectManagerProps {
  siteId: string
}

type Tab = 'redirects' | '404-log'

export default function RedirectManager({ siteId }: RedirectManagerProps) {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<Tab>('redirects')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showDisabled, setShowDisabled] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingRedirect, setEditingRedirect] = useState<Redirect | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Data
  const { data: redirects = [], isLoading } = useRedirects(siteId, {
    search: search || undefined,
    type: typeFilter || undefined,
    enabled: showDisabled ? undefined : 'true',
  })
  const { data: fourOhFourEntries = [], isLoading: is404Loading } = use404Log(siteId)

  const createRedirect = useCreateRedirect()
  const updateRedirect = useUpdateRedirect()
  const deleteRedirect = useDeleteRedirect()
  const dismiss404 = useDismiss404()
  const create404Redirect = useCreate404Redirect()
  const importRedirects = useImportRedirects()

  const unresolved404Count = fourOhFourEntries.filter(e => !e.resolved).length

  // Handlers
  const handleDelete = async (id: string) => {
    try {
      await deleteRedirect.mutateAsync({ siteId, id })
      toast.success('Redirect deleted')
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    }
  }

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      try {
        await deleteRedirect.mutateAsync({ siteId, id })
      } catch { /* continue */ }
    }
    setSelectedIds(new Set())
    toast.success(`Deleted ${selectedIds.size} redirects`)
  }

  const handleToggleEnabled = async (redirect: Redirect) => {
    try {
      await updateRedirect.mutateAsync({
        siteId,
        id: redirect.id,
        enabled: !redirect.enabled,
      })
    } catch (err: any) {
      toast.error(err.message || 'Failed to update')
    }
  }

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <ArrowRightLeft size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Redirects</h2>
              <p className="text-xs text-gray-400">{redirects.length} rules active</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Upload size={13} />
              Import
            </button>
            <button
              onClick={() => { setEditingRedirect(null); setShowModal(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
            >
              <Plus size={13} />
              Add Redirect
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-gray-100 -mb-4">
          <button
            onClick={() => setActiveTab('redirects')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'redirects'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Redirect Rules
          </button>
          <button
            onClick={() => setActiveTab('404-log')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === '404-log'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            404 Errors
            {unresolved404Count > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full">
                {unresolved404Count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Safety notice */}
      <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <div className="flex items-start gap-2">
          <Shield size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-800">Safe redirect layer</p>
            <p className="text-[11px] text-blue-600 mt-0.5">
              SEO OS works as an isolated layer. It does not modify .htaccess or override redirects from other plugins (Redirection, RankMath, etc.).
              Disabling the SEO OS Connector plugin removes all SEO OS redirects without affecting the site.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'redirects' ? (
          <RedirectsTab
            redirects={redirects}
            isLoading={isLoading}
            search={search}
            setSearch={setSearch}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            showDisabled={showDisabled}
            setShowDisabled={setShowDisabled}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            onEdit={(r) => { setEditingRedirect(r); setShowModal(true) }}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onToggleEnabled={handleToggleEnabled}
            formatTimeAgo={formatTimeAgo}
          />
        ) : (
          <FourOhFourTab
            entries={fourOhFourEntries}
            isLoading={is404Loading}
            siteId={siteId}
            onDismiss={async (id) => {
              try {
                await dismiss404.mutateAsync({ siteId, id })
                toast.success('Dismissed')
              } catch (err: any) { toast.error(err.message) }
            }}
            onCreateRedirect={async (entry) => {
              try {
                await create404Redirect.mutateAsync({
                  siteId,
                  source_path: entry.path,
                  target_url: '/',
                  entryId: entry.id,
                })
                toast.success('Redirect created from 404')
              } catch (err: any) { toast.error(err.message) }
            }}
            formatTimeAgo={formatTimeAgo}
          />
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <RedirectModal
          siteId={siteId}
          redirect={editingRedirect}
          onClose={() => { setShowModal(false); setEditingRedirect(null) }}
          onCreate={createRedirect}
          onUpdate={updateRedirect}
          toast={toast}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          siteId={siteId}
          onClose={() => setShowImportModal(false)}
          onImport={importRedirects}
          toast={toast}
        />
      )}
    </div>
  )
}

// ====== Redirects Tab ======

function RedirectsTab({
  redirects, isLoading, search, setSearch, typeFilter, setTypeFilter,
  showDisabled, setShowDisabled, selectedIds, setSelectedIds,
  onEdit, onDelete, onBulkDelete, onToggleEnabled, formatTimeAgo,
}: {
  redirects: Redirect[]
  isLoading: boolean
  search: string
  setSearch: (s: string) => void
  typeFilter: string
  setTypeFilter: (s: string) => void
  showDisabled: boolean
  setShowDisabled: (b: boolean) => void
  selectedIds: Set<string>
  setSelectedIds: (s: Set<string>) => void
  onEdit: (r: Redirect) => void
  onDelete: (id: string) => void
  onBulkDelete: () => void
  onToggleEnabled: (r: Redirect) => void
  formatTimeAgo: (s: string | null) => string
}) {
  return (
    <div className="p-4">
      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 gap-2 flex-1 max-w-xs">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search redirects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 outline-none"
        >
          <option value="">All types</option>
          <option value="301">301</option>
          <option value="302">302</option>
          <option value="307">307</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showDisabled}
            onChange={(e) => setShowDisabled(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show disabled
        </label>
        {selectedIds.size > 0 && (
          <button
            onClick={onBulkDelete}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <Trash2 size={12} />
            Delete {selectedIds.size}
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : redirects.length === 0 ? (
        <div className="text-center py-16">
          <ArrowRightLeft size={40} className="text-gray-200 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium mb-1">No redirects yet</h3>
          <p className="text-sm text-gray-400">Create your first redirect rule</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === redirects.length && redirects.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(redirects.map(r => r.id)))
                      else setSelectedIds(new Set())
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Source</th>
                <th className="w-6"></th>
                <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Target</th>
                <th className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 w-16">Type</th>
                <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 w-16">Hits</th>
                <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 w-20">Last Hit</th>
                <th className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {redirects.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${!r.enabled ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={(e) => {
                        const next = new Set(selectedIds)
                        if (e.target.checked) next.add(r.id)
                        else next.delete(r.id)
                        setSelectedIds(next)
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {r.is_regex && (
                        <span className="px-1 py-0.5 text-[9px] font-bold bg-purple-100 text-purple-600 rounded">
                          REGEX
                        </span>
                      )}
                      {r.auto_generated && (
                        <span className="px-1 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-600 rounded">
                          AUTO
                        </span>
                      )}
                      <code className="text-sm text-gray-800 font-mono">{r.source_path}</code>
                    </div>
                    {r.note && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{r.note}</p>
                    )}
                  </td>
                  <td className="text-gray-300">
                    <ArrowRight size={14} />
                  </td>
                  <td className="px-3 py-2.5">
                    <code className="text-sm text-indigo-600 font-mono">{r.target_url}</code>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      r.type === '301' ? 'bg-green-100 text-green-700' :
                      r.type === '302' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm text-gray-600 font-mono">
                    {r.hits}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[11px] text-gray-400">
                    {formatTimeAgo(r.last_hit_at)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onToggleEnabled(r)}
                        className={`p-1 rounded transition-colors ${r.enabled ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-100'}`}
                        title={r.enabled ? 'Disable' : 'Enable'}
                      >
                        {r.enabled ? <Check size={14} /> : <X size={14} />}
                      </button>
                      <button
                        onClick={() => onEdit(r)}
                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(r.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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

// ====== 404 Log Tab ======

function FourOhFourTab({
  entries, isLoading, siteId, onDismiss, onCreateRedirect, formatTimeAgo,
}: {
  entries: FourOhFourEntry[]
  isLoading: boolean
  siteId: string
  onDismiss: (id: string) => void
  onCreateRedirect: (entry: FourOhFourEntry) => void
  formatTimeAgo: (s: string | null) => string
}) {
  const unresolved = entries.filter(e => !e.resolved)

  return (
    <div className="p-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : unresolved.length === 0 ? (
        <div className="text-center py-16">
          <Check size={40} className="text-green-300 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium mb-1">No 404 errors</h3>
          <p className="text-sm text-gray-400">All clear! No unresolved 404 pages detected.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-2">Path</th>
                <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 w-16">Hits</th>
                <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 w-32">Referer</th>
                <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 w-24">First Seen</th>
                <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 w-24">Last Seen</th>
                <th className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {unresolved.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <code className="text-sm text-red-600 font-mono">{entry.path}</code>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`text-sm font-bold ${
                      entry.hits >= 50 ? 'text-red-600' :
                      entry.hits >= 10 ? 'text-amber-600' :
                      'text-gray-500'
                    }`}>
                      {entry.hits}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {entry.referer ? (
                      <span className="text-[11px] text-gray-400 truncate block max-w-[120px]" title={entry.referer}>
                        {entry.referer.replace(/^https?:\/\//, '').split('/')[0]}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-300">Direct</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[11px] text-gray-400">
                    {formatTimeAgo(entry.first_seen)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[11px] text-gray-400">
                    {formatTimeAgo(entry.last_seen)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onCreateRedirect(entry)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      >
                        <ArrowRight size={10} />
                        Redirect
                      </button>
                      <button
                        onClick={() => onDismiss(entry.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Dismiss"
                      >
                        <X size={14} />
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

// ====== Add/Edit Modal ======

function RedirectModal({
  siteId, redirect, onClose, onCreate, onUpdate, toast,
}: {
  siteId: string
  redirect: Redirect | null
  onClose: () => void
  onCreate: any
  onUpdate: any
  toast: any
}) {
  const isEdit = !!redirect
  const [sourcePath, setSourcePath] = useState(redirect?.source_path || '/')
  const [targetUrl, setTargetUrl] = useState(redirect?.target_url || '/')
  const [type, setType] = useState(redirect?.type || '301')
  const [isRegex, setIsRegex] = useState(redirect?.is_regex || false)
  const [note, setNote] = useState(redirect?.note || '')
  const [saving, setSaving] = useState(false)
  const [regexConfirmed, setRegexConfirmed] = useState(redirect?.is_regex || false)

  // Client-side safety checks
  const selfRedirect = useMemo(() => {
    const src = sourcePath.replace(/\/+$/, '') || '/'
    let tgt: string
    if (targetUrl.startsWith('/')) {
      tgt = targetUrl.replace(/\/+$/, '') || '/'
    } else {
      try { tgt = new URL(targetUrl).pathname.replace(/\/+$/, '') || '/' } catch { tgt = '' }
    }
    return src === tgt
  }, [sourcePath, targetUrl])

  const handleSave = async () => {
    if (!sourcePath.startsWith('/')) {
      toast.error('Source path must start with /')
      return
    }
    if (selfRedirect) {
      toast.error('Source and target are the same — this would cause an infinite loop')
      return
    }
    if (isRegex && !regexConfirmed) {
      toast.error('Please confirm you understand the regex warning')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await onUpdate.mutateAsync({
          siteId,
          id: redirect!.id,
          source_path: sourcePath,
          target_url: targetUrl,
          type,
          is_regex: isRegex,
          note: note || null,
        })
        toast.success('Redirect updated')
      } else {
        await onCreate.mutateAsync({
          siteId,
          source_path: sourcePath,
          target_url: targetUrl,
          type,
          is_regex: isRegex,
          note: note || null,
        })
        toast.success('Redirect created')
      }
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Edit Redirect' : 'Add Redirect'}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              Source Path
            </label>
            <input
              value={sourcePath}
              onChange={(e) => setSourcePath(e.target.value)}
              placeholder="/old-page/"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="text-[10px] text-gray-400 mt-1">Relative path, must start with /</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              Target URL
            </label>
            <input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="/new-page/ or https://..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as '301' | '302' | '307')}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none cursor-pointer"
              >
                <option value="301">301 — Permanent</option>
                <option value="302">302 — Temporary</option>
                <option value="307">307 — Temporary (strict)</option>
              </select>
            </div>
            <div className="flex-1 flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRegex}
                  onChange={(e) => {
                    setIsRegex(e.target.checked)
                    if (!e.target.checked) setRegexConfirmed(false)
                  }}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <div>
                  <span className="text-sm text-gray-700 font-medium">Regex</span>
                  <p className="text-[10px] text-gray-400">Use * for wildcards</p>
                </div>
              </label>
            </div>
          </div>

          {/* Regex warning — requires explicit confirmation */}
          {isRegex && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">Regex redirects are advanced</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    An incorrect pattern can redirect many pages unexpectedly. Only use if you know what you are doing.
                  </p>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regexConfirmed}
                      onChange={(e) => setRegexConfirmed(e.target.checked)}
                      className="rounded border-amber-400 text-amber-600"
                    />
                    <span className="text-[11px] font-medium text-amber-800">I understand the risks</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Self-redirect warning */}
          {selfRedirect && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-600" />
                <p className="text-xs font-semibold text-red-700">
                  Source and target are the same — this would cause an infinite redirect loop
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              Note <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for this redirect..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !sourcePath || !targetUrl || selfRedirect || (isRegex && !regexConfirmed)}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ====== Import Modal ======

function ImportModal({
  siteId, onClose, onImport, toast,
}: {
  siteId: string
  onClose: () => void
  onImport: any
  toast: any
}) {
  const [format, setFormat] = useState<'csv' | 'htaccess' | 'json'>('csv')
  const [data, setData] = useState('')
  const [importing, setImporting] = useState(false)

  const handleImport = async () => {
    if (!data.trim()) return
    setImporting(true)
    try {
      const result = await onImport.mutateAsync({ siteId, format, data })
      toast.success(`Imported ${result.imported} redirects`)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const placeholder = format === 'csv'
    ? '/old-page/,/new-page/,301\n/another/,/destination/,302'
    : format === 'htaccess'
    ? 'Redirect 301 /old-page /new-page\nRewriteRule ^news/(.*)$ /blog/$1 [R=301,L]'
    : '[{"source_path": "/old/", "target_url": "/new/", "type": "301"}]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Import Redirects</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Format</label>
            <div className="flex gap-2">
              {(['csv', 'htaccess', 'json'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    format === f
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'htaccess' ? '.htaccess' : f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Data</label>
            <textarea
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder={placeholder}
              rows={8}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !data.trim()}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
