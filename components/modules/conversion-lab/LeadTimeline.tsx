'use client'

import React from 'react'
import {
  Eye,
  MousePointerClick,
  Download,
  FileInput,
  Mail,
  StickyNote,
  MessageSquare,
  ArrowRight,
  Loader2,
  Clock,
} from 'lucide-react'

// ====== Types ======

interface TimelineEvent {
  id: string
  event_type: string
  event_data: any
  page_url?: string
  duration_seconds?: number
  created_at: string
}

interface LeadTimelineProps {
  events: TimelineEvent[]
  isLoading: boolean
}

// ====== Helpers ======

function relativeTime(iso: string): string {
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

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  page_view:    { icon: Eye,               color: 'text-blue-600',    bgColor: 'bg-blue-100',    label: 'Page View' },
  click:        { icon: MousePointerClick,  color: 'text-purple-600',  bgColor: 'bg-purple-100',  label: 'Click' },
  download:     { icon: Download,           color: 'text-green-600',   bgColor: 'bg-green-100',   label: 'Download' },
  form_submit:  { icon: FileInput,          color: 'text-rose-600',    bgColor: 'bg-rose-100',    label: 'Form Submit' },
  email_sent:   { icon: Mail,               color: 'text-amber-600',   bgColor: 'bg-amber-100',   label: 'Email Sent' },
  note:         { icon: StickyNote,         color: 'text-gray-600',    bgColor: 'bg-gray-100',    label: 'Note' },
  popup_shown:  { icon: MessageSquare,      color: 'text-fuchsia-600', bgColor: 'bg-fuchsia-100', label: 'Popup Shown' },
  stage_change: { icon: ArrowRight,         color: 'text-indigo-600',  bgColor: 'bg-indigo-100',  label: 'Stage Change' },
}

function getEventConfig(eventType: string) {
  return EVENT_CONFIG[eventType] || { icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-100', label: eventType }
}

function formatEventData(event: TimelineEvent): string {
  const { event_type, event_data, page_url, duration_seconds } = event
  const parts: string[] = []

  if (page_url) {
    try {
      const url = new URL(page_url)
      parts.push(url.pathname)
    } catch {
      parts.push(page_url)
    }
  }

  if (duration_seconds && duration_seconds > 0) {
    const mins = Math.floor(duration_seconds / 60)
    const secs = duration_seconds % 60
    parts.push(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`)
  }

  if (event_data) {
    if (typeof event_data === 'string') {
      parts.push(event_data)
    } else if (event_data.label) {
      parts.push(event_data.label)
    } else if (event_data.from && event_data.to) {
      parts.push(`${event_data.from} -> ${event_data.to}`)
    } else if (event_data.url) {
      parts.push(event_data.url)
    }
  }

  return parts.join(' - ')
}

// ====== Component ======

export default function LeadTimeline({ events, isLoading }: LeadTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Clock size={40} className="text-gray-200" />
        <h3 className="text-gray-500 font-medium">No activity yet</h3>
        <p className="text-sm text-gray-400">Timeline events will appear here as the lead interacts with your site.</p>
      </div>
    )
  }

  return (
    <div className="relative pl-8 py-2">
      {/* Vertical connecting line */}
      <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {events.map((event) => {
          const config = getEventConfig(event.event_type)
          const Icon = config.icon
          const detail = formatEventData(event)

          return (
            <div key={event.id} className="relative flex items-start gap-3">
              {/* Dot / icon */}
              <div
                className={`absolute -left-8 flex items-center justify-center w-8 h-8 rounded-full ${config.bgColor} ring-4 ring-white`}
              >
                <Icon size={14} className={config.color} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-xs text-gray-400">{relativeTime(event.created_at)}</span>
                </div>
                {detail && (
                  <p className="text-sm text-gray-600 mt-0.5 truncate">{detail}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
