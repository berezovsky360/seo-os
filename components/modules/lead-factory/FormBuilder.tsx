'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
} from 'lucide-react'
import QuizBuilder, { DEFAULT_QUIZ_CONFIG, type QuizConfig } from './QuizBuilder'
import CalculatorBuilder, { DEFAULT_CALC_CONFIG, type CalculatorConfig } from './CalculatorBuilder'
import VisualCustomizer, { DEFAULT_VISUAL, type VisualConfig } from './VisualCustomizer'

type FormType = 'inline' | 'popup' | 'slide_in' | 'quiz' | 'calculator'

interface FormField {
  name: string
  type: 'email' | 'text' | 'tel' | 'select'
  required: boolean
}

interface TriggerConfig {
  type: 'time_delay' | 'scroll_percent' | 'exit_intent'
  value: number
  show_once: boolean
}

interface FormBuilderProps {
  form?: any
  magnets: any[]
  landingSiteId?: string
  onSave: (data: Record<string, any>) => void
  onClose: () => void
}

export default function FormBuilder({ form, magnets, landingSiteId, onSave, onClose }: FormBuilderProps) {
  const isEdit = !!form?.id

  const [name, setName] = useState(form?.name || '')
  const [formType, setFormType] = useState<FormType>(form?.form_type || 'inline')
  const [fields, setFields] = useState<FormField[]>(
    form?.fields || [{ name: 'email', type: 'email' as const, required: true }]
  )
  const [magnetId, setMagnetId] = useState(form?.magnet_id || '')
  const [buttonText, setButtonText] = useState(form?.button_text || 'Download')
  const [successMessage, setSuccessMessage] = useState(form?.success_message || '')
  const [active, setActive] = useState(form?.active !== false)
  const [trigger, setTrigger] = useState<TriggerConfig>(
    form?.trigger || { type: 'time_delay', value: 3, show_once: true }
  )
  const [saving, setSaving] = useState(false)

  // Quiz/Calculator/Visual state
  const [quizConfig, setQuizConfig] = useState<QuizConfig>(
    form?.popup_config?.steps ? {
      steps: form.popup_config.steps,
      scoring: form.popup_config.scoring || DEFAULT_QUIZ_CONFIG.scoring,
      collect_email: form.popup_config.collect_email || 'last',
    } : DEFAULT_QUIZ_CONFIG
  )
  const [calcConfig, setCalcConfig] = useState<CalculatorConfig>(
    form?.popup_config?.inputs ? {
      inputs: form.popup_config.inputs,
      formula: form.popup_config.formula || '',
      result_template: form.popup_config.result_template || 'Result: ${result}',
      collect_email: form.popup_config.collect_email || 'after_result',
    } : DEFAULT_CALC_CONFIG
  )
  const [visual, setVisual] = useState<VisualConfig>(
    form?.popup_config?.visual || DEFAULT_VISUAL
  )

  // Sync state when form prop changes
  useEffect(() => {
    if (form) {
      setName(form.name || '')
      setFormType(form.form_type || 'inline')
      setFields(form.fields || [{ name: 'email', type: 'email' as const, required: true }])
      setMagnetId(form.magnet_id || '')
      setButtonText(form.button_text || 'Download')
      setSuccessMessage(form.success_message || '')
      setActive(form.active !== false)
      setTrigger(form.trigger || { type: 'time_delay', value: 3, show_once: true })

      if (form.popup_config?.steps) {
        setQuizConfig({
          steps: form.popup_config.steps,
          scoring: form.popup_config.scoring || DEFAULT_QUIZ_CONFIG.scoring,
          collect_email: form.popup_config.collect_email || 'last',
        })
      }
      if (form.popup_config?.inputs) {
        setCalcConfig({
          inputs: form.popup_config.inputs,
          formula: form.popup_config.formula || '',
          result_template: form.popup_config.result_template || 'Result: ${result}',
          collect_email: form.popup_config.collect_email || 'after_result',
        })
      }
      if (form.popup_config?.visual) {
        setVisual(form.popup_config.visual)
      }
    }
  }, [form])

  const addField = () => {
    setFields([...fields, { name: '', type: 'text', required: false }])
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)))
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const data: Record<string, any> = {
        name: name.trim(),
        form_type: formType,
        fields,
        button_text: buttonText || 'Download',
        success_message: successMessage || undefined,
        is_active: active,
      }
      if (magnetId) data.magnet_id = magnetId
      if (formType === 'popup') data.popup_config = { trigger: trigger.type, value: trigger.value, show_once: trigger.show_once }
      if (landingSiteId && !isEdit) data.landing_site_id = landingSiteId

      // Build popup_config for quiz/calculator with visual
      if (formType === 'quiz') {
        data.popup_config = {
          visual,
          steps: quizConfig.steps,
          scoring: quizConfig.scoring,
          collect_email: quizConfig.collect_email,
        }
      } else if (formType === 'calculator') {
        data.popup_config = {
          visual,
          inputs: calcConfig.inputs,
          formula: calcConfig.formula,
          result_template: calcConfig.result_template,
          collect_email: calcConfig.collect_email,
        }
      } else {
        // For inline/popup/slide_in — store visual if any non-default values set
        const hasVisual = visual.cover_image || visual.headline || visual.subtitle ||
          visual.button_color !== '#e94560' || visual.button_text_color !== '#ffffff'
        if (hasVisual) {
          data.popup_config = { ...data.popup_config, visual }
        }
      }

      await onSave(data)
    } catch {
      // error handling delegated to parent
    } finally {
      setSaving(false)
    }
  }

  const formTypeOptions: { value: FormType; label: string }[] = [
    { value: 'inline', label: 'Inline' },
    { value: 'popup', label: 'Popup' },
    { value: 'slide_in', label: 'Slide-in' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'calculator', label: 'Calculator' },
  ]

  const fieldTypeOptions: { value: FormField['type']; label: string }[] = [
    { value: 'email', label: 'Email' },
    { value: 'text', label: 'Text' },
    { value: 'tel', label: 'Phone' },
    { value: 'select', label: 'Select' },
  ]

  const isStandardForm = formType === 'inline' || formType === 'popup' || formType === 'slide_in'

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Edit Form' : 'Create Form'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Form Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Newsletter Signup"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Form Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Form Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {formTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormType(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    formType === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Standard form fields builder (only for inline/popup/slide_in) */}
          {isStandardForm && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Form Fields
                </label>
                <button
                  onClick={addField}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  <Plus size={14} />
                  Add Field
                </button>
              </div>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateField(index, { name: e.target.value })}
                      placeholder="Field name"
                      className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, { type: e.target.value as FormField['type'] })}
                      className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    >
                      {fieldTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Required
                    </label>
                    <button
                      onClick={() => removeField(index)}
                      className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-colors flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {fields.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-3">No fields. Click &quot;Add Field&quot; above.</p>
                )}
              </div>
            </div>
          )}

          {/* Quiz Builder */}
          {formType === 'quiz' && (
            <QuizBuilder value={quizConfig} onChange={setQuizConfig} />
          )}

          {/* Calculator Builder */}
          {formType === 'calculator' && (
            <CalculatorBuilder value={calcConfig} onChange={setCalcConfig} />
          )}

          {/* Visual Customizer — for all types */}
          <VisualCustomizer value={visual} onChange={setVisual} />

          {/* Linked Magnet */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Linked Magnet (optional)
            </label>
            <select
              value={magnetId}
              onChange={(e) => setMagnetId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">None</option>
              {magnets.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Button Text */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Button Text
            </label>
            <input
              type="text"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="Download"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Success Message */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Success Message
            </label>
            <textarea
              value={successMessage}
              onChange={(e) => setSuccessMessage(e.target.value)}
              placeholder="Thanks for subscribing! Check your email for the download link."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active</label>
            <button
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                active ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                  active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Popup trigger config */}
          {formType === 'popup' && (
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Popup Trigger
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Trigger Type</label>
                  <select
                    value={trigger.type}
                    onChange={(e) => setTrigger({ ...trigger, type: e.target.value as TriggerConfig['type'] })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="time_delay">Time Delay (seconds)</option>
                    <option value="scroll_percent">Scroll Percentage</option>
                    <option value="exit_intent">Exit Intent</option>
                  </select>
                </div>
                {trigger.type !== 'exit_intent' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {trigger.type === 'time_delay' ? 'Delay (seconds)' : 'Scroll %'}
                    </label>
                    <input
                      type="number"
                      value={trigger.value}
                      onChange={(e) => setTrigger({ ...trigger, value: Number(e.target.value) })}
                      min={0}
                      max={trigger.type === 'scroll_percent' ? 100 : 300}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={trigger.show_once}
                  onChange={(e) => setTrigger({ ...trigger, show_once: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Show only once per visitor
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Form'}
          </button>
        </div>
      </div>
    </div>
  )
}
