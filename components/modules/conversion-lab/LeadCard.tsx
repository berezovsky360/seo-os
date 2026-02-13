'use client'

import React, { useState } from 'react'
import {
  X,
  Loader2,
  Clock,
  StickyNote,
  FileText,
  Send,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  MapPin,
  Link2,
  Tag,
  Download,
  Eye,
  Hash,
  ChevronDown,
} from 'lucide-react'
import {
  useLead,
  useLeadTimeline,
  useLeadNotes,
  useAddNote,
  useUpdateLead,
} from '@/hooks/useConversionLab'
import LeadTimeline from './LeadTimeline'

// ====== Types ======

interface LeadCardProps {
  leadId: string
  onClose: () => void
}

type LeadCardTab = 'timeline' | 'notes' | 'details'

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

function deviceIcon(device: string | null | undefined) {
  if (!device) return Monitor
  const d = device.toLowerCase()
  if (d === 'mobile') return Smartphone
  if (d === 'tablet') return Tablet
  return Monitor
}

// ====== Component ======

export default function LeadCard({ leadId, onClose }: LeadCardProps) {
  const [activeTab, setActiveTab] = useState<LeadCardTab>('timeline')
  const [noteContent, setNoteContent] = useState('')
  const [editName, setEditName] = useState<string | null>(null)
  const [editPhone, setEditPhone] = useState<string | null>(null)
  const [editCustomFields, setEditCustomFields] = useState<string | null>(null)
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false)

  const { data: lead, isLoading: leadLoading } = useLead(leadId)
  const { data: timeline = [], isLoading: timelineLoading } = useLeadTimeline(leadId)
  const { data: notes = [], isLoading: notesLoading } = useLeadNotes(leadId)
  const addNote = useAddNote()
  const updateLead = useUpdateLead()

  // Pipeline stages for dropdown - fetch inline
  const [stages] = useState<string[]>(['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'])

  const handleAddNote = async () => {
    if (!noteContent.trim()) return
    await addNote.mutateAsync({ leadId, content: noteContent.trim() })
    setNoteContent('')
  }

  const handleStageChange = (newStage: string) => {
    updateLead.mutate({ leadId, updates: { pipeline_stage: newStage } })
    setStageDropdownOpen(false)
  }

  const handleSaveDetails = () => {
    const updates: Record<string, any> = {}
    if (editName !== null) updates.name = editName
    if (editPhone !== null) updates.phone = editPhone
    if (editCustomFields !== null) {
      try {
        updates.custom_fields = JSON.parse(editCustomFields)
      } catch {
        // Invalid JSON - skip
      }
    }
    if (Object.keys(updates).length > 0) {
      updateLead.mutate({ leadId, updates })
    }
    setEditName(null)
    setEditPhone(null)
    setEditCustomFields(null)
  }

  const tabs: { id: LeadCardTab; label: string; icon: React.ElementType }[] = [
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'details', label: 'Details', icon: FileText },
  ]

  if (leadLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl p-8 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-gray-300" />
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl p-8 text-center">
          <p className="text-gray-500">Lead not found</p>
          <button onClick={onClose} className="mt-4 text-sm text-indigo-600 hover:text-indigo-700">Close</button>
        </div>
      </div>
    )
  }

  const sc = scoreColor(lead.lead_score)
  const DeviceIcon = deviceIcon(lead.device_type)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-900 truncate">{lead.email}</h2>
              {lead.name && <p className="text-sm text-gray-500 mt-0.5">{lead.name}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                Score: {lead.lead_score ?? '?'}
              </span>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Stage selector */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage:</span>
            <div className="relative">
              <button
                onClick={() => setStageDropdownOpen(!stageDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {lead.pipeline_stage || 'Unassigned'}
                <ChevronDown size={14} className={`transition-transform ${stageDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {stageDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-lg border border-gray-200 shadow-lg z-10 py-1">
                  {stages.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStageChange(s)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${
                        lead.pipeline_stage === s ? 'text-indigo-600 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-6 pt-3 flex-shrink-0">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <LeadTimeline events={timeline} isLoading={timelineLoading} />
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Add note form */}
              <div className="flex gap-2">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  className="flex-1 border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteContent.trim() || addNote.isPending}
                  className="self-end px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  {addNote.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Add
                </button>
              </div>

              {/* Notes list */}
              {notesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-gray-300" />
                </div>
              ) : notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <StickyNote size={40} className="text-gray-200" />
                  <h3 className="text-gray-500 font-medium">No notes yet</h3>
                  <p className="text-sm text-gray-400">Add a note above to start tracking interactions.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note: any) => (
                    <div key={note.id} className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-gray-400 mt-2">{relativeTime(note.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Read-only info */}
              <div className="grid grid-cols-2 gap-3">
                <DetailItem icon={Link2} label="Source URL" value={lead.source_url} />
                <DetailItem icon={Tag} label="UTM Source" value={lead.utm_source} />
                <DetailItem icon={Tag} label="UTM Medium" value={lead.utm_medium} />
                <DetailItem icon={Tag} label="UTM Campaign" value={lead.utm_campaign} />
                <DetailItem icon={MapPin} label="Country" value={lead.ip_country} />
                <DetailItem icon={DeviceIcon} label="Device" value={lead.device_type} />
                <DetailItem icon={Eye} label="Page Views" value={lead.total_page_views?.toString()} />
                <DetailItem icon={Download} label="Downloads" value={lead.total_downloads?.toString()} />
                <DetailItem icon={Hash} label="Session ID" value={lead.session_id} />
                <DetailItem
                  icon={Globe}
                  label="Magnet Delivered"
                  value={lead.magnet_delivered ? 'Yes' : 'No'}
                />
              </div>

              {/* Editable fields */}
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Editable Info</h4>

                <div>
                  <label className="text-xs text-gray-500">Name</label>
                  <input
                    type="text"
                    defaultValue={lead.name || ''}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Lead name"
                    className="mt-1 w-full border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500">Phone</label>
                  <input
                    type="text"
                    defaultValue={lead.phone || ''}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Phone number"
                    className="mt-1 w-full border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500">Custom Fields (JSON)</label>
                  <textarea
                    defaultValue={lead.custom_fields ? JSON.stringify(lead.custom_fields, null, 2) : '{}'}
                    onChange={(e) => setEditCustomFields(e.target.value)}
                    rows={4}
                    className="mt-1 w-full border border-gray-200 rounded-lg text-sm px-3 py-2 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                  />
                </div>

                <button
                  onClick={handleSaveDetails}
                  disabled={updateLead.isPending}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {updateLead.isPending && <Loader2 size={14} className="animate-spin" />}
                  Save Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ====== Detail Item Sub-component ======

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg">
      <Icon size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-700 truncate">{value || '-'}</p>
      </div>
    </div>
  )
}
