'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  Magnet,
  FileText,
  BarChart3,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  ClipboardList,
  Download,
  MousePointerClick,
  ToggleLeft,
  ToggleRight,
  Link2,
  Calendar,
  Gift,
} from 'lucide-react'
import {
  useLeadForms,
  useCreateForm,
  useUpdateForm,
  useDeleteForm,
  useLeadMagnets,
  useCreateMagnet,
  useUpdateMagnet,
  useDeleteMagnet,
  useLeadStats,
} from '@/hooks/useLeadFactory'
import FormBuilder from './FormBuilder'
import MagnetManager from './MagnetManager'

type Tab = 'forms' | 'magnets' | 'stats'

interface Props {
  onBack?: () => void
}

export default function LeadFactoryDashboard({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('forms')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')

  // Landing sites for the site selector
  const { data: landingSites = [] } = useQuery({
    queryKey: ['landing-sites'],
    queryFn: async () => {
      const res = await fetch('/api/landing/sites')
      if (!res.ok) return []
      return res.json()
    },
  })

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'forms', label: 'Forms', icon: ClipboardList },
    { id: 'magnets', label: 'Magnets', icon: Gift },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
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
          <Magnet size={20} className="text-rose-600" />
          <h1 className="text-lg font-bold text-gray-900">Lead Factory</h1>
        </div>

        {/* Site selector */}
        <select
          value={selectedSiteId}
          onChange={(e) => setSelectedSiteId(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Sites</option>
          {landingSites.map((site: any) => (
            <option key={site.id} value={site.id}>
              {site.name || site.slug}
            </option>
          ))}
        </select>
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
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'forms' && <FormsTab siteId={selectedSiteId || undefined} />}
        {activeTab === 'magnets' && <MagnetsTab siteId={selectedSiteId || undefined} />}
        {activeTab === 'stats' && <StatsTab siteId={selectedSiteId || undefined} />}
      </div>
    </div>
  )
}

// ====== Forms Tab ======

function FormsTab({ siteId }: { siteId?: string }) {
  const { data: forms = [], isLoading } = useLeadForms(siteId)
  const { data: magnets = [] } = useLeadMagnets(siteId)
  const createForm = useCreateForm()
  const updateForm = useUpdateForm()
  const deleteForm = useDeleteForm()

  const [editingForm, setEditingForm] = useState<any | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const activeForms = forms.filter((f: any) => f.active !== false)
  const totalSubmissions = forms.reduce((sum: number, f: any) => sum + (f.submissions || 0), 0)
  const conversionRate = totalSubmissions > 0 && forms.length > 0
    ? ((totalSubmissions / (forms.length * 100)) * 100).toFixed(1)
    : '0'

  const handleSave = async (data: Record<string, any>) => {
    if (editingForm?.id) {
      await updateForm.mutateAsync({ formId: editingForm.id, updates: data })
    } else {
      await createForm.mutateAsync({
        landing_site_id: siteId || data.landing_site_id,
        ...data,
      })
    }
    setEditingForm(null)
    setShowCreate(false)
  }

  const handleDelete = async (formId: string) => {
    if (!confirm('Delete this form? This cannot be undone.')) return
    await deleteForm.mutateAsync(formId)
  }

  const handleToggleActive = async (form: any) => {
    await updateForm.mutateAsync({
      formId: form.id,
      updates: { active: !form.active },
    })
  }

  const typeBadge = (type: string) => {
    const styles: Record<string, string> = {
      inline: 'bg-blue-50 text-blue-600',
      popup: 'bg-amber-50 text-amber-600',
      slide_in: 'bg-purple-50 text-purple-600',
      quiz: 'bg-emerald-50 text-emerald-600',
      calculator: 'bg-cyan-50 text-cyan-600',
    }
    const labels: Record<string, string> = {
      slide_in: 'Slide-in',
      quiz: 'Quiz',
      calculator: 'Calculator',
    }
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-500'}`}>
        {labels[type] || type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Forms</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{forms.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Forms</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{activeForms.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Submissions</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{totalSubmissions}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Conversion Rate</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{conversionRate}%</p>
        </div>
      </div>

      {/* Create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Forms ({forms.length})</h2>
        <button
          onClick={() => { setEditingForm(null); setShowCreate(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
        >
          <Plus size={16} />
          Create Form
        </button>
      </div>

      {/* Forms table */}
      {forms.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList size={40} className="mx-auto mb-3 text-gray-200" />
          <h3 className="text-gray-500 font-medium">No forms yet</h3>
          <p className="text-sm text-gray-400 mt-1">Create your first lead capture form</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Submissions</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Active</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Linked Magnet</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form: any) => {
                const linkedMagnet = magnets.find((m: any) => m.id === form.magnet_id)
                return (
                  <tr key={form.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{form.name}</td>
                    <td className="px-4 py-3">{typeBadge(form.form_type)}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{form.submissions || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(form)}
                        className="inline-flex items-center"
                        title={form.active !== false ? 'Deactivate' : 'Activate'}
                      >
                        {form.active !== false ? (
                          <ToggleRight size={22} className="text-green-500" />
                        ) : (
                          <ToggleLeft size={22} className="text-gray-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {linkedMagnet ? (
                        <span className="inline-flex items-center gap-1 text-xs text-indigo-600">
                          <Link2 size={12} />
                          {linkedMagnet.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingForm(form)}
                          className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(form.id)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FormBuilder modal */}
      {(showCreate || editingForm) && (
        <FormBuilder
          form={editingForm}
          magnets={magnets}
          landingSiteId={siteId}
          onSave={handleSave}
          onClose={() => { setEditingForm(null); setShowCreate(false) }}
        />
      )}
    </div>
  )
}

// ====== Magnets Tab ======

function MagnetsTab({ siteId }: { siteId?: string }) {
  const { data: magnets = [], isLoading } = useLeadMagnets(siteId)
  const createMagnet = useCreateMagnet()
  const updateMagnet = useUpdateMagnet()
  const deleteMagnet = useDeleteMagnet()

  const [editingMagnet, setEditingMagnet] = useState<any | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const totalDownloads = magnets.reduce((sum: number, m: any) => sum + (m.downloads || 0), 0)

  const handleSave = async (data: Record<string, any>) => {
    if (editingMagnet?.id) {
      await updateMagnet.mutateAsync({ magnetId: editingMagnet.id, updates: data })
    } else {
      await createMagnet.mutateAsync({
        landing_site_id: siteId || data.landing_site_id,
        ...data,
      })
    }
    setEditingMagnet(null)
    setShowCreate(false)
  }

  const handleDelete = async (magnetId: string) => {
    if (!confirm('Delete this magnet? This cannot be undone.')) return
    await deleteMagnet.mutateAsync(magnetId)
  }

  const fileTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      pdf: 'bg-red-50 text-red-600',
      ebook: 'bg-purple-50 text-purple-600',
      video: 'bg-blue-50 text-blue-600',
      checklist: 'bg-green-50 text-green-600',
      template: 'bg-amber-50 text-amber-600',
    }
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-500'}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Magnets</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{magnets.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Downloads</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{totalDownloads}</p>
        </div>
      </div>

      {/* Create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Magnets ({magnets.length})</h2>
        <button
          onClick={() => { setEditingMagnet(null); setShowCreate(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
        >
          <Plus size={16} />
          Create Magnet
        </button>
      </div>

      {/* Magnet cards grid */}
      {magnets.length === 0 ? (
        <div className="text-center py-16">
          <Gift size={40} className="mx-auto mb-3 text-gray-200" />
          <h3 className="text-gray-500 font-medium">No magnets yet</h3>
          <p className="text-sm text-gray-400 mt-1">Create a lead magnet to offer your audience</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {magnets.map((magnet: any) => (
            <div
              key={magnet.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{magnet.name}</h3>
                  {magnet.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{magnet.description}</p>
                  )}
                </div>
                <div className="ml-3">
                  {fileTypeBadge(magnet.file_type || 'pdf')}
                </div>
              </div>

              <div className="flex-1" />

              <div className="space-y-2 mt-3">
                {magnet.file_url && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate">
                    <Link2 size={12} />
                    <span className="truncate">{magnet.file_url}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Download size={12} />
                      {magnet.downloads || 0} downloads
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={12} />
                      {magnet.created_at ? new Date(magnet.created_at).toLocaleDateString() : '--'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingMagnet(magnet)}
                      className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(magnet.id)}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MagnetManager modal */}
      {(showCreate || editingMagnet) && (
        <MagnetManager
          magnet={editingMagnet}
          landingSiteId={siteId}
          onSave={handleSave}
          onClose={() => { setEditingMagnet(null); setShowCreate(false) }}
        />
      )}
    </div>
  )
}

// ====== Stats Tab ======

function StatsTab({ siteId }: { siteId?: string }) {
  const { data: stats, isLoading } = useLeadStats(siteId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-16">
        <BarChart3 size={40} className="mx-auto mb-3 text-gray-200" />
        <h3 className="text-gray-500 font-medium">No stats available</h3>
        <p className="text-sm text-gray-400 mt-1">Stats will appear once you start capturing leads</p>
      </div>
    )
  }

  const cards = [
    { label: 'Total Leads', value: stats.total_leads ?? 0, color: 'text-gray-900' },
    { label: 'Total Submissions', value: stats.total_submissions ?? 0, color: 'text-indigo-600' },
    { label: 'Total Downloads', value: stats.total_downloads ?? 0, color: 'text-green-600' },
    { label: 'Total Forms', value: stats.total_forms ?? 0, color: 'text-blue-600' },
    { label: 'Total Magnets', value: stats.total_magnets ?? 0, color: 'text-purple-600' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Lead Factory Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</p>
            <p className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
