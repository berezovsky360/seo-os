'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Sparkles, Loader2, ChevronDown, Check } from 'lucide-react'
import { usePersonas } from '@/hooks/usePersonas'
import { useGenerateTitle, useGenerateDescription } from '@/hooks/useAIWriter'
import type { PersonaDB } from '@/types'

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'straightforward', label: 'Direct' },
  { value: 'confident', label: 'Confident' },
  { value: 'friendly', label: 'Friendly' },
] as const

interface AIGeneratePopoverProps {
  type: 'title' | 'description'
  postId: string
  siteId: string
  keyword?: string
  onApply: (value: string) => void
}

const AIGeneratePopover: React.FC<AIGeneratePopoverProps> = ({
  type,
  postId,
  siteId,
  keyword,
  onApply,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('')
  const [selectedTone, setSelectedTone] = useState<string>('professional')
  const [results, setResults] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const { data: personas = [] } = usePersonas()
  const generateTitle = useGenerateTitle()
  const generateDescription = useGenerateDescription()

  const isGenerating = generateTitle.isPending || generateDescription.isPending

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleGenerate = async () => {
    setError(null)
    setResults([])
    try {
      if (type === 'title') {
        const result = await generateTitle.mutateAsync({
          post_id: postId,
          site_id: siteId,
          persona_id: selectedPersonaId || undefined,
          keyword,
          tone: selectedTone,
        })
        setResults(result.titles)
      } else {
        const result = await generateDescription.mutateAsync({
          post_id: postId,
          site_id: siteId,
          persona_id: selectedPersonaId || undefined,
          keyword,
          tone: selectedTone,
        })
        setResults(result.descriptions)
      }
      setSelectedIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    }
  }

  const handleApply = () => {
    if (results[selectedIndex]) {
      onApply(results[selectedIndex])
      setIsOpen(false)
      setResults([])
    }
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        title={`AI Generate ${type === 'title' ? 'Title' : 'Description'}`}
        onClick={() => setIsOpen(!isOpen)}
        className="mt-2 flex-shrink-0 p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
      >
        <Sparkles size={14} className="text-indigo-400 hover:text-indigo-600" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-600" />
              <span className="text-sm font-bold text-gray-800">
                {type === 'title' ? 'Generate SEO Title' : 'Generate Meta Description'}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* Persona selector */}
            {personas.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Persona</label>
                <select
                  value={selectedPersonaId}
                  onChange={e => setSelectedPersonaId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 outline-none"
                >
                  <option value="">No persona (default)</option>
                  {personas.map((p: PersonaDB) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.writing_style})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tone of Voice selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tone of Voice</label>
              <div className="flex flex-wrap gap-1.5">
                {TONE_OPTIONS.map(tone => (
                  <button
                    key={tone.value}
                    onClick={() => setSelectedTone(tone.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      selectedTone === tone.value
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <p className="text-xs text-rose-500 font-medium">{error}</p>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500">Options</label>
                {results.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedIndex(idx)}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${
                      selectedIndex === idx
                        ? 'border-indigo-300 bg-indigo-50 text-gray-800'
                        : 'border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedIndex === idx ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                      }`}>
                        {selectedIndex === idx && <Check size={10} className="text-white" />}
                      </div>
                      <span className="leading-relaxed">{result}</span>
                    </div>
                    <div className="mt-1 text-right">
                      <span className={`text-[10px] font-medium ${
                        type === 'title'
                          ? (result.length >= 50 && result.length <= 60 ? 'text-emerald-500' : 'text-amber-500')
                          : (result.length >= 140 && result.length <= 160 ? 'text-emerald-500' : 'text-amber-500')
                      }`}>
                        {result.length} chars
                      </span>
                    </div>
                  </button>
                ))}
                <button
                  onClick={handleApply}
                  className="w-full py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all"
                >
                  Apply Selected
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AIGeneratePopover
