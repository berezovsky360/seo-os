'use client'

import React, { useState, useCallback } from 'react'
import { User, Clock, Globe, Loader2 } from 'lucide-react'

// ====== Types ======

interface Stage {
  id: string
  name: string
  color: string
  sort_order: number
}

interface Lead {
  id: string
  email: string
  name?: string | null
  lead_score: number | null
  pipeline_stage: string | null
  source_url?: string | null
  last_seen_at?: string | null
  created_at: string
  [key: string]: any
}

interface KanbanPipelineProps {
  stages: Stage[]
  leads: Lead[]
  onLeadClick: (leadId: string) => void
  onStageDrop: (leadId: string, newStage: string) => void
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

function extractDomain(url: string | null | undefined): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

function scoreColor(score: number | null): { bg: string; text: string } {
  if (score === null || score === undefined) return { bg: 'bg-gray-100', text: 'text-gray-500' }
  if (score >= 50) return { bg: 'bg-green-100', text: 'text-green-700' }
  if (score >= 25) return { bg: 'bg-yellow-100', text: 'text-yellow-700' }
  return { bg: 'bg-gray-100', text: 'text-gray-500' }
}

// ====== Lead Card ======

function KanbanLeadCard({
  lead,
  onClick,
}: {
  lead: Lead
  onClick: () => void
}) {
  const sc = scoreColor(lead.lead_score)
  const domain = extractDomain(lead.source_url)

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', lead.id)
      e.dataTransfer.effectAllowed = 'move'
    },
    [lead.id]
  )

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 m-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{lead.email}</p>
          {lead.name && (
            <div className="flex items-center gap-1 mt-0.5">
              <User size={11} className="text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500 truncate">{lead.name}</p>
            </div>
          )}
        </div>
        <span
          className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}
        >
          {lead.lead_score ?? '?'}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
        {domain && (
          <div className="flex items-center gap-1 min-w-0">
            <Globe size={11} className="flex-shrink-0" />
            <span className="truncate">{domain}</span>
          </div>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Clock size={11} />
          <span>{relativeTime(lead.last_seen_at)}</span>
        </div>
      </div>
    </div>
  )
}

// ====== Column ======

function KanbanColumn({
  stage,
  leads,
  onLeadClick,
  onDrop,
}: {
  stage: Stage
  leads: Lead[]
  onLeadClick: (leadId: string) => void
  onDrop: (leadId: string) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const leadId = e.dataTransfer.getData('text/plain')
      if (leadId) {
        onDrop(leadId)
      }
    },
    [onDrop]
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-72 flex-shrink-0 rounded-xl border transition-all ${
        isDragOver
          ? 'ring-2 ring-indigo-400 bg-indigo-50/50 border-indigo-200'
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      {/* Column header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="text-sm font-semibold text-gray-900">{stage.name}</h3>
        </div>
        <span className="text-xs font-medium text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
          {leads.length}
        </span>
      </div>

      {/* Card list */}
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto p-1">
        {leads.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-gray-400">No leads in this stage</p>
          </div>
        )}
        {leads.map((lead) => (
          <KanbanLeadCard
            key={lead.id}
            lead={lead}
            onClick={() => onLeadClick(lead.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ====== Main Component ======

export default function KanbanPipeline({
  stages,
  leads,
  onLeadClick,
  onStageDrop,
}: KanbanPipelineProps) {
  const sortedStages = [...stages].sort((a, b) => a.sort_order - b.sort_order)

  if (!stages || stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 size={40} className="text-gray-200" />
        <h3 className="text-gray-500 font-medium">No pipeline stages</h3>
        <p className="text-sm text-gray-400">Create stages to start managing your leads in a pipeline.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-1 pt-1">
      {sortedStages.map((stage) => {
        const stageLeads = leads.filter(
          (l) => l.pipeline_stage === stage.name
        )
        return (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={stageLeads}
            onLeadClick={onLeadClick}
            onDrop={(leadId) => onStageDrop(leadId, stage.name)}
          />
        )
      })}

      {/* Unassigned column for leads with no stage */}
      {(() => {
        const unassigned = leads.filter(
          (l) => !l.pipeline_stage || !stages.some((s) => s.name === l.pipeline_stage)
        )
        if (unassigned.length === 0) return null
        return (
          <KanbanColumn
            key="__unassigned__"
            stage={{ id: '__unassigned__', name: 'Unassigned', color: '#9CA3AF', sort_order: 9999 }}
            leads={unassigned}
            onLeadClick={onLeadClick}
            onDrop={(leadId) => onStageDrop(leadId, '')}
          />
        )
      })()}
    </div>
  )
}
