'use client'

import React, { useState } from 'react'
import {
  Clock, Plus, ChevronLeft, Trash2, Loader2,
  ToggleLeft, ToggleRight, Play, AlertCircle, CheckCircle,
  Calendar, Hash, ChevronDown
} from 'lucide-react'
import { useCronJobs, useCreateCronJob, useUpdateCronJob, useDeleteCronJob, type CronJob } from '@/hooks/useCronJobs'
import { useRecipes } from '@/hooks/useRecipes'
import { useToast } from '@/lib/contexts/ToastContext'
import { describeCron, validateCron, CRON_PRESETS } from '@/lib/modules/cron/parser'
import type { Recipe } from '@/lib/core/events'

interface CronJobListProps {
  onBack?: () => void
}

export default function CronJobList({ onBack }: CronJobListProps) {
  const { data: jobs = [], isLoading } = useCronJobs()
  const { data: recipes = [] } = useRecipes()
  const createJob = useCreateCronJob()
  const updateJob = useUpdateCronJob()
  const deleteJob = useDeleteCronJob()
  const toast = useToast()

  const [showForm, setShowForm] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formCron, setFormCron] = useState('')
  const [formRecipeId, setFormRecipeId] = useState('')
  const [formTimezone, setFormTimezone] = useState('UTC')
  const [showPresets, setShowPresets] = useState(false)

  const resetForm = () => {
    setFormName('')
    setFormCron('')
    setFormRecipeId('')
    setFormTimezone('UTC')
    setShowForm(false)
  }

  const handleCreate = async () => {
    if (!formName || !formCron) {
      toast.error('Name and cron expression are required')
      return
    }

    const validationError = validateCron(formCron)
    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      await createJob.mutateAsync({
        name: formName,
        cron_expression: formCron,
        recipe_id: formRecipeId || undefined,
        timezone: formTimezone,
      })
      toast.success('Cron job created')
      resetForm()
    } catch {
      toast.error('Failed to create cron job')
    }
  }

  const handleToggle = async (job: CronJob) => {
    setTogglingId(job.id)
    try {
      await updateJob.mutateAsync({
        cronId: job.id,
        updates: { enabled: !job.enabled },
      })
    } catch {
      toast.error('Failed to toggle cron job')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (jobId: string) => {
    if (!window.confirm('Delete this cron job? This cannot be undone.')) return
    try {
      await deleteJob.mutateAsync(jobId)
      toast.success('Cron job deleted')
    } catch {
      toast.error('Failed to delete cron job')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={14} className="text-emerald-500" />
      case 'failed':
        return <AlertCircle size={14} className="text-red-500" />
      case 'running':
        return <Loader2 size={14} className="animate-spin text-blue-500" />
      default:
        return <Clock size={14} className="text-gray-400" />
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center px-8 py-5 bg-[#F5F5F7] border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          {onBack && (
            <>
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <div className="h-4 w-px bg-gray-300" />
            </>
          )}
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-gray-900" />
            <h1 className="text-lg font-bold text-gray-900">Cron Jobs</h1>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {(jobs as CronJob[]).length} jobs
          </span>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors shadow-md shadow-violet-200"
        >
          <Plus size={14} />
          New Cron Job
        </button>
      </div>

      <div className="p-8">
        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Create Cron Job</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Daily Position Check"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Schedule
                  <span className="text-gray-400 ml-1">(cron expression)</span>
                </label>
                <div className="relative">
                  <input
                    value={formCron}
                    onChange={(e) => setFormCron(e.target.value)}
                    placeholder="0 9 * * *"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 pr-8"
                  />
                  <button
                    onClick={() => setShowPresets(!showPresets)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDown size={14} />
                  </button>
                  {showPresets && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowPresets(false)} />
                      <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg border border-gray-200 shadow-lg z-30 overflow-hidden">
                        {CRON_PRESETS.map((preset) => (
                          <button
                            key={preset.expression}
                            onClick={() => { setFormCron(preset.expression); setShowPresets(false) }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm flex justify-between items-center"
                          >
                            <span className="text-gray-900">{preset.label}</span>
                            <span className="text-[10px] font-mono text-gray-400">{preset.expression}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {formCron && !validateCron(formCron) && (
                  <p className="text-[10px] text-violet-500 mt-1">{describeCron(formCron)}</p>
                )}
                {formCron && validateCron(formCron) && (
                  <p className="text-[10px] text-red-500 mt-1">{validateCron(formCron)}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Linked Recipe</label>
                <select
                  value={formRecipeId}
                  onChange={(e) => setFormRecipeId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200"
                >
                  <option value="">No recipe (manual)</option>
                  {(recipes as Recipe[]).map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Timezone</label>
                <select
                  value={formTimezone}
                  onChange={(e) => setFormTimezone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern (New York)</option>
                  <option value="America/Chicago">Central (Chicago)</option>
                  <option value="America/Denver">Mountain (Denver)</option>
                  <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Berlin">Berlin</option>
                  <option value="Europe/Moscow">Moscow</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Asia/Jerusalem">Jerusalem</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleCreate}
                disabled={createJob.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {createJob.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Jobs List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-gray-300" />
          </div>
        ) : (jobs as CronJob[]).length === 0 ? (
          <div className="text-center py-16">
            <Clock size={48} className="text-gray-200 mx-auto mb-4" />
            <h3 className="text-gray-500 font-medium mb-1">No cron jobs yet</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
              Schedule recipes to run automatically at specific times.
              Daily rank checks, weekly audits, monthly reports.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors shadow-md shadow-violet-200"
            >
              <Plus size={16} />
              Create Your First Cron Job
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Schedule</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Recipe</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Last Run</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Next Run</th>
                  <th className="text-center px-5 py-3 text-xs font-bold text-gray-400 uppercase">Runs</th>
                  <th className="text-center px-5 py-3 text-xs font-bold text-gray-400 uppercase">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(jobs as CronJob[]).map((job) => (
                  <tr
                    key={job.id}
                    className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors ${
                      !job.enabled ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-sm text-gray-900">{job.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{job.cron_expression}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-gray-600">{describeCron(job.cron_expression)}</span>
                    </td>
                    <td className="px-5 py-3">
                      {job.recipes ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 text-xs font-medium rounded-md">
                          <Play size={10} />
                          {job.recipes.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(job.last_run_status)}
                        <span className="text-xs text-gray-500">{formatDate(job.last_run_at)}</span>
                      </div>
                      {job.last_run_error && (
                        <p className="text-[10px] text-red-400 mt-0.5 truncate max-w-[200px]" title={job.last_run_error}>
                          {job.last_run_error}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-500">{formatDate(job.next_run_at)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Hash size={10} />
                        {job.run_count}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        job.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {job.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggle(job)}
                          disabled={togglingId === job.id}
                          className="p-1 text-gray-400 hover:text-violet-600 transition-colors"
                          title={job.enabled ? 'Disable' : 'Enable'}
                        >
                          {togglingId === job.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : job.enabled ? (
                            <ToggleRight size={22} className="text-violet-600" />
                          ) : (
                            <ToggleLeft size={22} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
