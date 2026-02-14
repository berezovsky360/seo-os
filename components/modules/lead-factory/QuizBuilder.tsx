'use client'

import {
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuizStep {
  id: string
  question: string
  type: 'single_choice' | 'multi_choice' | 'text_input'
  options: { label: string; value: string; points: number }[]
  image: string
}

export interface QuizScoring {
  enabled: boolean
  show_score: boolean
  redirects: { min_score: number; max_score: number; url: string; label: string }[]
}

export interface QuizConfig {
  steps: QuizStep[]
  scoring: QuizScoring
  collect_email: 'first' | 'last' | 'none'
}

export const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  steps: [
    {
      id: 'q1',
      question: '',
      type: 'single_choice',
      options: [{ label: '', value: '', points: 0 }],
      image: '',
    },
  ],
  scoring: { enabled: false, show_score: false, redirects: [] },
  collect_email: 'last',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  value: QuizConfig
  onChange: (v: QuizConfig) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuizBuilder({ value, onChange }: Props) {
  const { steps, scoring, collect_email } = value

  // -----------------------------------------------------------------------
  // Step helpers
  // -----------------------------------------------------------------------

  const addStep = () => {
    const newStep: QuizStep = {
      id: crypto.randomUUID(),
      question: '',
      type: 'single_choice',
      options: [{ label: '', value: '', points: 0 }],
      image: '',
    }
    onChange({ ...value, steps: [...steps, newStep] })
  }

  const removeStep = (index: number) => {
    onChange({ ...value, steps: steps.filter((_, i) => i !== index) })
  }

  const updateStep = (index: number, partial: Partial<QuizStep>) => {
    onChange({
      ...value,
      steps: steps.map((s, i) => (i === index ? { ...s, ...partial } : s)),
    })
  }

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= steps.length) return
    const next = [...steps]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange({ ...value, steps: next })
  }

  // -----------------------------------------------------------------------
  // Option helpers (within a step)
  // -----------------------------------------------------------------------

  const addOption = (stepIndex: number) => {
    const step = steps[stepIndex]
    updateStep(stepIndex, {
      options: [...step.options, { label: '', value: '', points: 0 }],
    })
  }

  const removeOption = (stepIndex: number, optIndex: number) => {
    const step = steps[stepIndex]
    updateStep(stepIndex, {
      options: step.options.filter((_, i) => i !== optIndex),
    })
  }

  const updateOption = (
    stepIndex: number,
    optIndex: number,
    partial: Partial<{ label: string; value: string; points: number }>,
  ) => {
    const step = steps[stepIndex]
    updateStep(stepIndex, {
      options: step.options.map((o, i) =>
        i === optIndex ? { ...o, ...partial } : o,
      ),
    })
  }

  // -----------------------------------------------------------------------
  // Scoring helpers
  // -----------------------------------------------------------------------

  const updateScoring = (partial: Partial<QuizScoring>) => {
    onChange({ ...value, scoring: { ...scoring, ...partial } })
  }

  const addRedirect = () => {
    updateScoring({
      redirects: [
        ...scoring.redirects,
        { min_score: 0, max_score: 10, url: '', label: '' },
      ],
    })
  }

  const removeRedirect = (index: number) => {
    updateScoring({
      redirects: scoring.redirects.filter((_, i) => i !== index),
    })
  }

  const updateRedirect = (
    index: number,
    partial: Partial<{ min_score: number; max_score: number; url: string; label: string }>,
  ) => {
    updateScoring({
      redirects: scoring.redirects.map((r, i) =>
        i === index ? { ...r, ...partial } : r,
      ),
    })
  }

  // -----------------------------------------------------------------------
  // Shared classes (matches FormBuilder exactly)
  // -----------------------------------------------------------------------

  const labelCls =
    'block text-xs font-semibold text-gray-500 uppercase tracking-wide'
  const inputCls =
    'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
  const smallInputCls =
    'flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white'

  // -----------------------------------------------------------------------
  // Step type options
  // -----------------------------------------------------------------------

  const stepTypeOptions: { value: QuizStep['type']; label: string }[] = [
    { value: 'single_choice', label: 'Single Choice' },
    { value: 'multi_choice', label: 'Multi Choice' },
    { value: 'text_input', label: 'Text Input' },
  ]

  const emailOptions: { value: QuizConfig['collect_email']; label: string }[] = [
    { value: 'first', label: 'First Step' },
    { value: 'last', label: 'Last Step' },
    { value: 'none', label: 'None' },
  ]

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* Quiz Steps Header */}
      {/* ----------------------------------------------------------------- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className={labelCls}>Quiz Steps</label>
          <button
            onClick={addStep}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Plus size={14} />
            Add Step
          </button>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* Steps list */}
        {/* -------------------------------------------------------------- */}
        <div className="space-y-3">
          {steps.map((step, sIdx) => (
            <div
              key={step.id}
              className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
            >
              {/* Step header */}
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex-shrink-0">
                  {sIdx + 1}
                </span>
                <span className="text-sm font-medium text-gray-700 flex-1">
                  Step {sIdx + 1}
                </span>
                <button
                  onClick={() => moveStep(sIdx, -1)}
                  disabled={sIdx === 0}
                  className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveStep(sIdx, 1)}
                  disabled={sIdx === steps.length - 1}
                  className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  onClick={() => removeStep(sIdx)}
                  className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Question */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Question</label>
                <input
                  type="text"
                  value={step.question}
                  onChange={(e) => updateStep(sIdx, { question: e.target.value })}
                  placeholder="e.g. What is your biggest challenge?"
                  className={inputCls}
                />
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Answer Type</label>
                <div className="flex gap-2">
                  {stepTypeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateStep(sIdx, { type: opt.value })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        step.type === opt.value
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options (only for choice types) */}
              {(step.type === 'single_choice' || step.type === 'multi_choice') && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs text-gray-500">Options</label>
                    <button
                      onClick={() => addOption(sIdx)}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      <Plus size={12} />
                      Add Option
                    </button>
                  </div>
                  <div className="space-y-2">
                    {step.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5 border border-gray-100"
                      >
                        <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) =>
                            updateOption(sIdx, oIdx, { label: e.target.value })
                          }
                          placeholder="Label"
                          className={smallInputCls}
                        />
                        <input
                          type="text"
                          value={opt.value}
                          onChange={(e) =>
                            updateOption(sIdx, oIdx, { value: e.target.value })
                          }
                          placeholder="Value"
                          className={smallInputCls}
                        />
                        <input
                          type="number"
                          value={opt.points}
                          onChange={(e) =>
                            updateOption(sIdx, oIdx, {
                              points: Number(e.target.value),
                            })
                          }
                          placeholder="Pts"
                          className="w-16 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-center"
                        />
                        <button
                          onClick={() => removeOption(sIdx, oIdx)}
                          className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-colors flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {step.options.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-3">
                        No options. Click &quot;Add Option&quot; above.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Image URL */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Image URL (optional)
                </label>
                <input
                  type="text"
                  value={step.image}
                  onChange={(e) => updateStep(sIdx, { image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className={inputCls}
                />
              </div>
            </div>
          ))}

          {steps.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              No steps yet. Click &quot;Add Step&quot; to begin building your quiz.
            </p>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Email Collection */}
      {/* ----------------------------------------------------------------- */}
      <div>
        <label className={`${labelCls} mb-1.5`}>Email Collection</label>
        <div className="flex gap-2">
          {emailOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...value, collect_email: opt.value })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                collect_email === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Scoring Section */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-4">
        <label className={labelCls}>Scoring</label>

        {/* Enable Scoring toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Enable Scoring</span>
          <button
            onClick={() => updateScoring({ enabled: !scoring.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              scoring.enabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                scoring.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {scoring.enabled && (
          <>
            {/* Show Score toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Show Score to User</span>
              <button
                onClick={() => updateScoring({ show_score: !scoring.show_score })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  scoring.show_score ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                    scoring.show_score ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Redirect rules */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs text-gray-500">Redirect Rules</label>
                <button
                  onClick={addRedirect}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  <Plus size={12} />
                  Add Redirect Rule
                </button>
              </div>
              <div className="space-y-2">
                {scoring.redirects.map((r, rIdx) => (
                  <div
                    key={rIdx}
                    className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-gray-200"
                  >
                    <input
                      type="number"
                      value={r.min_score}
                      onChange={(e) =>
                        updateRedirect(rIdx, { min_score: Number(e.target.value) })
                      }
                      placeholder="Min"
                      className="w-16 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-center"
                    />
                    <span className="text-xs text-gray-400">to</span>
                    <input
                      type="number"
                      value={r.max_score}
                      onChange={(e) =>
                        updateRedirect(rIdx, { max_score: Number(e.target.value) })
                      }
                      placeholder="Max"
                      className="w-16 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-center"
                    />
                    <input
                      type="text"
                      value={r.label}
                      onChange={(e) =>
                        updateRedirect(rIdx, { label: e.target.value })
                      }
                      placeholder="Label"
                      className={smallInputCls}
                    />
                    <input
                      type="text"
                      value={r.url}
                      onChange={(e) =>
                        updateRedirect(rIdx, { url: e.target.value })
                      }
                      placeholder="Redirect URL"
                      className={smallInputCls}
                    />
                    <button
                      onClick={() => removeRedirect(rIdx)}
                      className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-colors flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {scoring.redirects.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-3">
                    No redirect rules. Click &quot;Add Redirect Rule&quot; above.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
