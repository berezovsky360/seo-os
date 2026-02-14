'use client'

import { useState, useEffect } from 'react'
import {
  Globe,
  Link,
  Tag,
  Plus,
  Trash2,
  Save,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'

interface SwapRule {
  match: string
  field: string
  value: string
}

interface EdgeRule {
  type: 'utm_persist' | 'geo_swap' | 'referrer_swap' | 'utm_swap'
  enabled: boolean
  rules?: SwapRule[]
}

interface EdgeRulesEditorProps {
  siteId: string
  edgeRules: EdgeRule[]
  onSave: (rules: EdgeRule[]) => void
  isSaving: boolean
}

const DEFAULT_RULES: EdgeRule[] = [
  { type: 'utm_persist', enabled: false },
  { type: 'geo_swap', enabled: false, rules: [] },
  { type: 'referrer_swap', enabled: false, rules: [] },
  { type: 'utm_swap', enabled: false, rules: [] },
]

function ensureAllTypes(rules: EdgeRule[]): EdgeRule[] {
  const map = new Map<string, EdgeRule>()
  for (const r of rules) {
    map.set(r.type, r)
  }
  return DEFAULT_RULES.map((def) => {
    const existing = map.get(def.type)
    if (existing) return { ...existing, rules: existing.rules ?? def.rules }
    return { ...def }
  })
}

export default function EdgeRulesEditor({
  siteId,
  edgeRules,
  onSave,
  isSaving,
}: EdgeRulesEditorProps) {
  const [rules, setRules] = useState<EdgeRule[]>(() =>
    ensureAllTypes(edgeRules)
  )

  useEffect(() => {
    setRules(ensureAllTypes(edgeRules))
  }, [edgeRules])

  const getRule = (type: EdgeRule['type']): EdgeRule =>
    rules.find((r) => r.type === type)!

  const updateRule = (type: EdgeRule['type'], patch: Partial<EdgeRule>) => {
    setRules((prev) =>
      prev.map((r) => (r.type === type ? { ...r, ...patch } : r))
    )
  }

  const toggleEnabled = (type: EdgeRule['type']) => {
    const rule = getRule(type)
    updateRule(type, { enabled: !rule.enabled })
  }

  const addSwapRule = (type: EdgeRule['type']) => {
    const rule = getRule(type)
    updateRule(type, {
      rules: [...(rule.rules ?? []), { match: '', field: '', value: '' }],
    })
  }

  const updateSwapRule = (
    type: EdgeRule['type'],
    index: number,
    patch: Partial<SwapRule>
  ) => {
    const rule = getRule(type)
    const updated = (rule.rules ?? []).map((r, i) =>
      i === index ? { ...r, ...patch } : r
    )
    updateRule(type, { rules: updated })
  }

  const removeSwapRule = (type: EdgeRule['type'], index: number) => {
    const rule = getRule(type)
    updateRule(type, {
      rules: (rule.rules ?? []).filter((_, i) => i !== index),
    })
  }

  const handleSave = () => {
    onSave(rules)
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow'

  return (
    <div className="space-y-6">
      {/* UTM Persistence */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Tag className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                UTM Persistence
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Automatically inject UTM parameters into form hidden fields
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleEnabled('utm_persist')}
            className="focus:outline-none"
          >
            {getRule('utm_persist').enabled ? (
              <ToggleRight className="w-9 h-9 text-indigo-600" />
            ) : (
              <ToggleLeft className="w-9 h-9 text-gray-300" />
            )}
          </button>
        </div>
      </div>

      {/* Geo Swap */}
      <SwapSection
        type="geo_swap"
        title="Geo Swap"
        description="Serve different content based on visitor country"
        icon={<Globe className="w-4 h-4 text-emerald-600" />}
        iconBg="bg-emerald-50"
        matchLabel="Country Code"
        matchPlaceholder="US"
        rule={getRule('geo_swap')}
        onToggle={() => toggleEnabled('geo_swap')}
        onAdd={() => addSwapRule('geo_swap')}
        onUpdate={(i, patch) => updateSwapRule('geo_swap', i, patch)}
        onRemove={(i) => removeSwapRule('geo_swap', i)}
        inputClass={inputClass}
      />

      {/* Referrer Swap */}
      <SwapSection
        type="referrer_swap"
        title="Referrer Swap"
        description="Customize content based on referring domain"
        icon={<Link className="w-4 h-4 text-blue-600" />}
        iconBg="bg-blue-50"
        matchLabel="Source Domain"
        matchPlaceholder="google.com"
        rule={getRule('referrer_swap')}
        onToggle={() => toggleEnabled('referrer_swap')}
        onAdd={() => addSwapRule('referrer_swap')}
        onUpdate={(i, patch) => updateSwapRule('referrer_swap', i, patch)}
        onRemove={(i) => removeSwapRule('referrer_swap', i)}
        inputClass={inputClass}
      />

      {/* UTM Swap */}
      <SwapSection
        type="utm_swap"
        title="UTM Swap"
        description="Swap content based on utm_source parameter"
        icon={<Tag className="w-4 h-4 text-amber-600" />}
        iconBg="bg-amber-50"
        matchLabel="UTM Source"
        matchPlaceholder="facebook"
        rule={getRule('utm_swap')}
        onToggle={() => toggleEnabled('utm_swap')}
        onAdd={() => addSwapRule('utm_swap')}
        onUpdate={(i, patch) => updateSwapRule('utm_swap', i, patch)}
        onRemove={(i) => removeSwapRule('utm_swap', i)}
        inputClass={inputClass}
      />

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? 'Saving...' : 'Save Edge Rules'}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Swap Section (reusable for geo / referrer / utm)                   */
/* ------------------------------------------------------------------ */

interface SwapSectionProps {
  type: string
  title: string
  description: string
  icon: React.ReactNode
  iconBg: string
  matchLabel: string
  matchPlaceholder: string
  rule: EdgeRule
  onToggle: () => void
  onAdd: () => void
  onUpdate: (index: number, patch: Partial<SwapRule>) => void
  onRemove: (index: number) => void
  inputClass: string
}

function SwapSection({
  type,
  title,
  description,
  icon,
  iconBg,
  matchLabel,
  matchPlaceholder,
  rule,
  onToggle,
  onAdd,
  onUpdate,
  onRemove,
  inputClass,
}: SwapSectionProps) {
  const swapRules = rule.rules ?? []

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
        <button type="button" onClick={onToggle} className="focus:outline-none">
          {rule.enabled ? (
            <ToggleRight className="w-9 h-9 text-indigo-600" />
          ) : (
            <ToggleLeft className="w-9 h-9 text-gray-300" />
          )}
        </button>
      </div>

      {rule.enabled && (
        <>
          {/* Column headers */}
          {swapRules.length > 0 && (
            <div className="grid grid-cols-[1fr_1fr_2fr_auto] gap-3 mb-2 px-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {matchLabel}
              </span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Field
              </span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Value
              </span>
              <span className="w-8" />
            </div>
          )}

          {/* Rules rows */}
          <div className="space-y-0">
            {swapRules.map((sr, i) => (
              <div
                key={`${type}-rule-${i}`}
                className="grid grid-cols-[1fr_1fr_2fr_auto] gap-3 items-center py-2.5 border-b border-gray-100 last:border-b-0"
              >
                <input
                  type="text"
                  value={sr.match}
                  onChange={(e) => onUpdate(i, { match: e.target.value })}
                  placeholder={matchPlaceholder}
                  className={inputClass}
                />
                <input
                  type="text"
                  value={sr.field}
                  onChange={(e) => onUpdate(i, { field: e.target.value })}
                  placeholder="phone"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={sr.value}
                  onChange={(e) => onUpdate(i, { value: e.target.value })}
                  placeholder="Replacement value"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add rule button */}
          <button
            type="button"
            onClick={onAdd}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </>
      )}
    </div>
  )
}
