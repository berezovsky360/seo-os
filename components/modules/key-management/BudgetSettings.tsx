'use client'

import React, { useState } from 'react'
import { Settings, Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react'
import { useBudgets, useSaveBudget, useDeleteBudget, type BudgetRecord } from '@/hooks/useUsageDashboard'
import { useToast } from '@/lib/contexts/ToastContext'

const SERVICE_OPTIONS = [
  { value: 'all', label: 'All APIs' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'dataforseo', label: 'DataForSEO' },
  { value: 'openai', label: 'OpenAI' },
]

export default function BudgetSettings() {
  const { data: budgets = [], isLoading } = useBudgets()
  const saveBudget = useSaveBudget()
  const deleteBudget = useDeleteBudget()
  const toast = useToast()

  const [adding, setAdding] = useState(false)
  const [editService, setEditService] = useState('all')
  const [editLimit, setEditLimit] = useState('')
  const [editAlert80, setEditAlert80] = useState(true)
  const [editAlert100, setEditAlert100] = useState(true)
  const [editBlock, setEditBlock] = useState(false)

  const resetForm = () => {
    setAdding(false)
    setEditService('all')
    setEditLimit('')
    setEditAlert80(true)
    setEditAlert100(true)
    setEditBlock(false)
  }

  const handleSave = async () => {
    const limit = parseFloat(editLimit)
    if (isNaN(limit) || limit <= 0) {
      toast.warning('Please enter a valid monthly limit')
      return
    }

    try {
      await saveBudget.mutateAsync({
        service: editService,
        monthly_limit: limit,
        alert_at_80: editAlert80,
        alert_at_100: editAlert100,
        block_at_limit: editBlock,
      })
      toast.success(`Budget for ${editService} saved`)
      resetForm()
    } catch {
      toast.error('Failed to save budget')
    }
  }

  const handleDelete = async (service: string) => {
    if (!window.confirm(`Remove budget limit for ${service}?`)) return
    try {
      await deleteBudget.mutateAsync(service)
      toast.success('Budget removed')
    } catch {
      toast.error('Failed to remove budget')
    }
  }

  const startEdit = (b: BudgetRecord) => {
    setAdding(true)
    setEditService(b.service)
    setEditLimit(String(b.monthly_limit))
    setEditAlert80(b.alert_at_80)
    setEditAlert100(b.alert_at_100)
    setEditBlock(b.block_at_limit)
  }

  // Services that already have budgets
  const usedServices = new Set(budgets.map(b => b.service))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-gray-500" />
          <h3 className="text-sm font-bold text-gray-900">Budget Limits</h3>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Plus size={14} />
            Add Limit
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
          <Loader2 size={14} className="animate-spin" />
          Loading...
        </div>
      )}

      {/* Existing budgets */}
      {budgets.length > 0 && (
        <div className="space-y-2 mb-4">
          {budgets.map(b => (
            <div
              key={b.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
            >
              <div>
                <span className="text-sm font-semibold text-gray-800 capitalize">{b.service}</span>
                <span className="text-sm text-gray-500 ml-2">
                  ${Number(b.monthly_limit).toFixed(2)}/mo
                </span>
                <div className="flex gap-3 mt-0.5">
                  {b.alert_at_80 && <span className="text-[10px] text-amber-600 font-medium">Alert 80%</span>}
                  {b.alert_at_100 && <span className="text-[10px] text-red-600 font-medium">Alert 100%</span>}
                  {b.block_at_limit && <span className="text-[10px] text-red-700 font-bold">Block at limit</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(b)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Settings size={14} />
                </button>
                <button
                  onClick={() => handleDelete(b.service)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {budgets.length === 0 && !adding && !isLoading && (
        <p className="text-xs text-gray-400 py-2">
          No budget limits set. Add one to track spending thresholds.
        </p>
      )}

      {/* Add/Edit Form */}
      {adding && (
        <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Service</label>
              <select
                value={editService}
                onChange={e => setEditService(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {SERVICE_OPTIONS.filter(o => !usedServices.has(o.value) || o.value === editService).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Monthly Limit (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={editLimit}
                onChange={e => setEditLimit(e.target.value)}
                placeholder="10.00"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={editAlert80}
                onChange={e => setEditAlert80(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Alert at 80%
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={editAlert100}
                onChange={e => setEditAlert100(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Alert at 100%
            </label>
            <label className="flex items-center gap-2 text-xs text-red-600 cursor-pointer">
              <input
                type="checkbox"
                checked={editBlock}
                onChange={e => setEditBlock(e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              Block API calls at limit
            </label>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={!editLimit || saveBudget.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saveBudget.isPending
                ? <Loader2 size={14} className="animate-spin" />
                : <CheckCircle2 size={14} />
              }
              Save Budget
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
