'use client'

import { Plus, Trash2, Calculator } from 'lucide-react'

export interface CalcInput {
  id: string
  label: string
  type: 'number' | 'slider'
  default: number
  min: number
  max: number
  step: number
}

export interface CalculatorConfig {
  inputs: CalcInput[]
  formula: string
  result_template: string
  collect_email: 'after_result' | 'before_result' | 'none'
}

export const DEFAULT_CALC_CONFIG: CalculatorConfig = {
  inputs: [{ id: 'value1', label: 'Value 1', type: 'number', default: 0, min: 0, max: 10000, step: 1 }],
  formula: 'value1',
  result_template: 'Result: ${result}',
  collect_email: 'after_result',
}

interface Props {
  value: CalculatorConfig
  onChange: (v: CalculatorConfig) => void
}

export default function CalculatorBuilder({ value, onChange }: Props) {
  const addInput = () => {
    const newId = crypto.randomUUID().slice(0, 8)
    const newInput: CalcInput = {
      id: `input_${newId}`,
      label: `Input ${value.inputs.length + 1}`,
      type: 'number',
      default: 0,
      min: 0,
      max: 10000,
      step: 1,
    }
    onChange({ ...value, inputs: [...value.inputs, newInput] })
  }

  const removeInput = (index: number) => {
    onChange({ ...value, inputs: value.inputs.filter((_, i) => i !== index) })
  }

  const updateInput = (index: number, partial: Partial<CalcInput>) => {
    onChange({
      ...value,
      inputs: value.inputs.map((inp, i) => (i === index ? { ...inp, ...partial } : inp)),
    })
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator size={16} className="text-indigo-600" />
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Calculator Inputs
          </label>
        </div>
        <button
          onClick={addInput}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          <Plus size={14} />
          Add Input
        </button>
      </div>

      {/* Input list */}
      <div className="space-y-2">
        {value.inputs.map((inp, index) => (
          <div key={inp.id} className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
            {/* Row 1: ID, Label, Type, Delete */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">ID (used in formula)</label>
                <input
                  type="text"
                  value={inp.id}
                  onChange={(e) => updateInput(index, { id: e.target.value })}
                  placeholder="e.g. price"
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Label</label>
                <input
                  type="text"
                  value={inp.label}
                  onChange={(e) => updateInput(index, { label: e.target.value })}
                  placeholder="e.g. Price"
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select
                  value={inp.type}
                  onChange={(e) => updateInput(index, { type: e.target.value as CalcInput['type'] })}
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="number">Number</option>
                  <option value="slider">Slider</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => removeInput(index)}
                  className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors flex-shrink-0 mt-5"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Row 2: Number settings - 4 col grid */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Default</label>
                <input
                  type="number"
                  value={inp.default}
                  onChange={(e) => updateInput(index, { default: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min</label>
                <input
                  type="number"
                  value={inp.min}
                  onChange={(e) => updateInput(index, { min: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max</label>
                <input
                  type="number"
                  value={inp.max}
                  onChange={(e) => updateInput(index, { max: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Step</label>
                <input
                  type="number"
                  value={inp.step}
                  onChange={(e) => updateInput(index, { step: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                />
              </div>
            </div>
          </div>
        ))}
        {value.inputs.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-3">No inputs. Click &quot;Add Input&quot; above.</p>
        )}
      </div>

      {/* Formula */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Formula
        </label>
        <p className="text-xs text-gray-400 mb-1.5">
          Use input IDs as variables (e.g. value1 * value2)
        </p>
        <input
          type="text"
          value={value.formula}
          onChange={(e) => onChange({ ...value, formula: e.target.value })}
          placeholder="e.g. price * quantity"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
        />
      </div>

      {/* Result Template */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Result Template
        </label>
        <p className="text-xs text-gray-400 mb-1.5">
          {'Use ${result} for the calculated value'}
        </p>
        <input
          type="text"
          value={value.result_template}
          onChange={(e) => onChange({ ...value, result_template: e.target.value })}
          placeholder="Result: ${result}"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
        />
      </div>

      {/* Email Collection */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Email Collection
        </label>
        <div className="flex gap-3">
          {([
            { value: 'after_result' as const, label: 'After result' },
            { value: 'before_result' as const, label: 'Before result' },
            { value: 'none' as const, label: 'None' },
          ]).map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer"
            >
              <input
                type="radio"
                name="collect_email"
                value={opt.value}
                checked={value.collect_email === opt.value}
                onChange={() => onChange({ ...value, collect_email: opt.value })}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
