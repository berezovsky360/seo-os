'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Clock,
  ArrowDown,
  LogOut,
  Eye,
  Loader2,
  Code,
  Paintbrush,
} from 'lucide-react'

// ====== Types ======

interface GhostPopupEditorProps {
  popup?: any
  landingSiteId?: string
  onSave: (data: Record<string, any>) => void
  onClose: () => void
}

type TriggerType = 'time_delay' | 'scroll_percent' | 'exit_intent'

// ====== Component ======

export default function GhostPopupEditor({ popup, landingSiteId, onSave, onClose }: GhostPopupEditorProps) {
  const [name, setName] = useState(popup?.name || '')
  const [triggerType, setTriggerType] = useState<TriggerType>(popup?.trigger_rules?.type || 'time_delay')
  const [triggerValue, setTriggerValue] = useState<number>(popup?.trigger_rules?.value ?? 5)
  const [pagePattern, setPagePattern] = useState(popup?.trigger_rules?.page_pattern || '')
  const [minLeadScore, setMinLeadScore] = useState<number>(popup?.trigger_rules?.min_lead_score ?? 0)
  const [showOnce, setShowOnce] = useState<boolean>(popup?.trigger_rules?.show_once ?? true)
  const [isActive, setIsActive] = useState<boolean>(popup?.is_active ?? true)
  const [popupHtml, setPopupHtml] = useState(popup?.popup_html || '')
  const [popupCss, setPopupCss] = useState(popup?.popup_css || '')
  const [saving, setSaving] = useState(false)
  const previewRef = useRef<HTMLIFrameElement>(null)

  // Update preview when HTML/CSS changes
  useEffect(() => {
    if (previewRef.current) {
      const doc = previewRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head><style>
            body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; background: #f5f5f7; display: flex; align-items: center; justify-content: center; min-height: 100%; }
            ${popupCss}
          </style></head>
          <body>${popupHtml}</body>
          </html>
        `)
        doc.close()
      }
    }
  }, [popupHtml, popupCss])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const data: Record<string, any> = {
        name: name.trim(),
        trigger_rules: {
          type: triggerType,
          value: triggerValue,
          page_pattern: pagePattern || null,
          min_lead_score: minLeadScore,
          show_once: showOnce,
        },
        popup_html: popupHtml,
        popup_css: popupCss,
        is_active: isActive,
      }
      if (landingSiteId) {
        data.landing_site_id = landingSiteId
      }
      await onSave(data)
    } finally {
      setSaving(false)
    }
  }

  const triggerOptions: { type: TriggerType; label: string; icon: React.ElementType; description: string }[] = [
    { type: 'time_delay', label: 'Time Delay', icon: Clock, description: 'Show after seconds on page' },
    { type: 'scroll_percent', label: 'Scroll %', icon: ArrowDown, description: 'Show after scrolling down' },
    { type: 'exit_intent', label: 'Exit Intent', icon: LogOut, description: 'Show when mouse leaves viewport' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {popup ? 'Edit Ghost Popup' : 'Create Ghost Popup'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Exit Intent Offer"
              className="mt-1.5 w-full border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Trigger Type */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Trigger Type</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {triggerOptions.map((opt) => {
                const Icon = opt.icon
                const selected = triggerType === opt.type
                return (
                  <button
                    key={opt.type}
                    onClick={() => setTriggerType(opt.type)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm transition-all ${
                      selected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} className={selected ? 'text-indigo-600' : 'text-gray-400'} />
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-[10px] text-gray-400 leading-tight text-center">{opt.description}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Trigger Value (only for time_delay and scroll_percent) */}
          {triggerType !== 'exit_intent' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {triggerType === 'time_delay' ? 'Delay (seconds)' : 'Scroll Percentage'}
              </label>
              <input
                type="number"
                min={0}
                max={triggerType === 'scroll_percent' ? 100 : 300}
                value={triggerValue}
                onChange={(e) => setTriggerValue(Number(e.target.value))}
                className="mt-1.5 w-32 border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          )}

          {/* Page Pattern + Min Score row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Page Pattern</label>
              <input
                type="text"
                value={pagePattern}
                onChange={(e) => setPagePattern(e.target.value)}
                placeholder="/pricing*"
                className="mt-1.5 w-full border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Min Lead Score</label>
              <input
                type="number"
                min={0}
                max={100}
                value={minLeadScore}
                onChange={(e) => setMinLeadScore(Number(e.target.value))}
                className="mt-1.5 w-full border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Toggles row */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnce}
                onChange={(e) => setShowOnce(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Show Once Per Visitor</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                onClick={() => setIsActive(!isActive)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  isActive ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>

          {/* Popup HTML */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Code size={14} className="text-gray-400" />
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Popup HTML</label>
            </div>
            <textarea
              value={popupHtml}
              onChange={(e) => setPopupHtml(e.target.value)}
              placeholder="<div class='popup'>...</div>"
              rows={6}
              className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
            />
          </div>

          {/* Popup CSS */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Paintbrush size={14} className="text-gray-400" />
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Popup CSS</label>
            </div>
            <textarea
              value={popupCss}
              onChange={(e) => setPopupCss(e.target.value)}
              placeholder=".popup { background: white; padding: 24px; border-radius: 12px; }"
              rows={4}
              className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
            />
          </div>

          {/* Live Preview */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Eye size={14} className="text-gray-400" />
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Preview</label>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-[#F5F5F7]">
              <iframe
                ref={previewRef}
                title="Popup Preview"
                sandbox="allow-same-origin"
                className="w-full h-40 border-0"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {popup ? 'Save Changes' : 'Create Popup'}
          </button>
        </div>
      </div>
    </div>
  )
}
