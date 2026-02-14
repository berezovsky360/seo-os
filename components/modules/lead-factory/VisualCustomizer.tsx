'use client'

import { ImageIcon } from 'lucide-react'

export interface VisualConfig {
  cover_image: string
  headline: string
  subtitle: string
  button_color: string
  button_text_color: string
}

export const DEFAULT_VISUAL: VisualConfig = {
  cover_image: '',
  headline: '',
  subtitle: '',
  button_color: '#e94560',
  button_text_color: '#ffffff',
}

interface Props {
  value: VisualConfig
  onChange: (v: VisualConfig) => void
}

export default function VisualCustomizer({ value, onChange }: Props) {
  const update = (patch: Partial<VisualConfig>) => onChange({ ...value, ...patch })

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-4">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Visual Customization
      </label>

      {/* Cover Image */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Cover Image URL</label>
        <input
          type="url"
          value={value.cover_image}
          onChange={(e) => update({ cover_image: e.target.value })}
          placeholder="https://example.com/cover.jpg"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
        {value.cover_image && (
          <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 bg-white">
            <img
              src={value.cover_image}
              alt="Cover preview"
              className="w-full h-32 object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        )}
        {!value.cover_image && (
          <div className="mt-2 flex items-center justify-center h-20 rounded-lg border border-dashed border-gray-300 bg-white">
            <ImageIcon size={20} className="text-gray-300" />
          </div>
        )}
      </div>

      {/* Headline */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Headline</label>
        <input
          type="text"
          value={value.headline}
          onChange={(e) => update({ headline: e.target.value })}
          placeholder="e.g. Find your perfect plan"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Subtitle</label>
        <input
          type="text"
          value={value.subtitle}
          onChange={(e) => update({ subtitle: e.target.value })}
          placeholder="e.g. Answer 3 quick questions to get started"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Button Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value.button_color}
              onChange={(e) => update({ button_color: e.target.value })}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0"
            />
            <input
              type="text"
              value={value.button_color}
              onChange={(e) => update({ button_color: e.target.value })}
              className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Button Text Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value.button_text_color}
              onChange={(e) => update({ button_text_color: e.target.value })}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0"
            />
            <input
              type="text"
              value={value.button_text_color}
              onChange={(e) => update({ button_text_color: e.target.value })}
              className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Live preview button */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Button Preview</label>
        <button
          type="button"
          style={{ backgroundColor: value.button_color, color: value.button_text_color }}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md transition-opacity hover:opacity-90"
        >
          Sample Button
        </button>
      </div>
    </div>
  )
}
