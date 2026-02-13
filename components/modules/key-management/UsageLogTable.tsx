'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react'
import type { UsageLogEntry } from '@/hooks/useUsageDashboard'

const SERVICE_BADGE: Record<string, { bg: string; text: string }> = {
  gemini: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  openai: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  dataforseo: { bg: 'bg-amber-50', text: 'text-amber-700' },
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  items: UsageLogEntry[]
  total: number
  page: number
  perPage: number
  onPageChange: (page: number) => void
}

export default function UsageLogTable({ items, total, page, perPage, onPageChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">Request Log</h3>
        <p className="text-xs text-gray-400 mt-0.5">{total} total requests</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          No API requests in this period.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-8" />
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Time</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Service</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Action</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Model</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Tokens</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Cost</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const badge = SERVICE_BADGE[item.service] || { bg: 'bg-gray-50', text: 'text-gray-700' }
                const isExpanded = expandedId === item.id
                const hasMetadata = item.metadata && Object.keys(item.metadata).length > 0

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`border-b border-gray-50 transition-colors ${
                        hasMetadata ? 'cursor-pointer hover:bg-gray-50/50' : ''
                      }`}
                      onClick={() => hasMetadata && setExpandedId(isExpanded ? null : item.id)}
                    >
                      <td className="px-4 py-2.5 text-gray-400">
                        {hasMetadata && (
                          isExpanded
                            ? <ChevronDown size={14} />
                            : <ChevronRight size={14} />
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {formatTime(item.created_at)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
                          {item.service}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 font-medium">
                        {item.action.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">
                        {item.model}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                        {item.total_tokens != null ? item.total_tokens.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums">
                        ${item.estimated_cost.toFixed(4)}
                      </td>
                    </tr>
                    {/* Expanded metadata row */}
                    {isExpanded && hasMetadata && (
                      <tr className="bg-gray-50/70">
                        <td colSpan={7} className="px-8 py-3">
                          <div className="text-xs font-mono text-gray-600 bg-white rounded-lg border border-gray-200 p-3 max-h-40 overflow-auto">
                            {JSON.stringify(item.metadata, null, 2)}
                          </div>
                          {item.prompt_tokens != null && (
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              <span>Prompt: {item.prompt_tokens?.toLocaleString()}</span>
                              <span>Output: {item.output_tokens?.toLocaleString()}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
              className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded transition-colors"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}
              className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded transition-colors"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
