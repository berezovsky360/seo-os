'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  ChevronLeft,
  Plus,
  Trash2,
  Play,
  Pause,
  Trophy,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import {
  useExperiment,
  useExperimentVariants,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
  useUpdateExperiment,
} from '@/hooks/useLandingEngine'

// ====== Types ======

interface VariantEditorProps {
  siteId: string
  experimentId: string
  onClose: () => void
}

interface Variant {
  id: string
  landing_page_id: string
  variant_key: string
  content: string | null
  title: string | null
  seo_title: string | null
  seo_description: string | null
  weight: number
  is_control: boolean
  created_at: string
  [key: string]: any
}

interface Experiment {
  id: string
  name: string
  status: string
  landing_page_id: string
  landing_site_id: string
  goal_type: string | null
  goal_selector: string | null
  started_at: string | null
  ended_at: string | null
  winner_variant_key: string | null
  created_at: string
  [key: string]: any
}

// ====== Helpers ======

function statusConfig(status: string) {
  switch (status) {
    case 'running':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Running' }
    case 'paused':
      return { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Paused' }
    case 'completed':
      return { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Completed' }
    case 'draft':
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Draft' }
  }
}

function nextVariantKey(variants: Variant[]): string {
  const existingKeys = variants.map((v) => v.variant_key)
  // Start from B (A is usually the control)
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let i = 0; i < letters.length; i++) {
    if (!existingKeys.includes(letters[i])) {
      return letters[i]
    }
  }
  return `V${variants.length + 1}`
}

// ====== Variant Card ======

function VariantCard({
  variant,
  isWinner,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: {
  variant: Variant
  isWinner: boolean
  onUpdate: (updates: Record<string, any>) => void
  onDelete: () => void
  isUpdating: boolean
  isDeleting: boolean
}) {
  const [title, setTitle] = useState(variant.title || '')
  const [seoTitle, setSeoTitle] = useState(variant.seo_title || '')
  const [seoDescription, setSeoDescription] = useState(variant.seo_description || '')
  const [content, setContent] = useState(variant.content || '')
  const [weight, setWeight] = useState(variant.weight)
  const [hasContentOverride, setHasContentOverride] = useState(variant.content !== null)

  const handleBlur = useCallback(
    (field: string, value: any) => {
      const original = variant[field]
      if (value !== original) {
        onUpdate({ [field]: value })
      }
    },
    [variant, onUpdate]
  )

  const handleWeightChange = useCallback(
    (newWeight: number) => {
      setWeight(newWeight)
      onUpdate({ weight: newWeight })
    },
    [onUpdate]
  )

  const toggleContentOverride = useCallback(() => {
    if (hasContentOverride) {
      setHasContentOverride(false)
      setContent('')
      onUpdate({ content: null })
    } else {
      setHasContentOverride(true)
    }
  }, [hasContentOverride, onUpdate])

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Variant key badge */}
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <span className="text-lg font-bold text-indigo-600">{variant.variant_key}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                Variant {variant.variant_key}
              </span>
              {variant.is_control && (
                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide">
                  Control
                </span>
              )}
              {isWinner && (
                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1">
                  <Trophy size={10} />
                  Winner
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">
              Weight: {weight}%
            </span>
          </div>
        </div>

        {/* Delete button — cannot delete control variant */}
        {!variant.is_control && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
            title="Delete variant"
          >
            {isDeleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        )}
      </div>

      {/* Weight Slider */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
          Traffic Weight
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={weight}
            onChange={(e) => handleWeightChange(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="w-14 text-right">
            <span className="text-sm font-semibold text-gray-900">{weight}%</span>
          </div>
        </div>
      </div>

      {/* Editable Fields */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => handleBlur('title', title || null)}
            placeholder="Variant title"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              SEO Title
            </label>
            <span
              className={`text-xs ${
                seoTitle.length > 60 ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              {seoTitle.length}/60
            </span>
          </div>
          <input
            type="text"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            onBlur={() => handleBlur('seo_title', seoTitle || null)}
            placeholder="SEO title for this variant"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              SEO Description
            </label>
            <span
              className={`text-xs ${
                seoDescription.length > 160 ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              {seoDescription.length}/160
            </span>
          </div>
          <textarea
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            onBlur={() => handleBlur('seo_description', seoDescription || null)}
            placeholder="Meta description for this variant"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
        </div>
      </div>

      {/* Content Override */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Content Override
          </label>
          <button
            onClick={toggleContentOverride}
            className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
              hasContentOverride
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}
          >
            {hasContentOverride ? 'Remove Override' : 'Add Override'}
          </button>
        </div>
        {hasContentOverride ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => handleBlur('content', content || null)}
            placeholder="HTML content for this variant..."
            rows={5}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
        ) : (
          <div className="px-3 py-3 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-center">
            <span className="text-xs text-gray-400">Using page default content</span>
          </div>
        )}
      </div>

      {/* Saving indicator */}
      {isUpdating && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Loader2 size={12} className="animate-spin" />
          <span>Saving...</span>
        </div>
      )}
    </div>
  )
}

// ====== Main Component ======

export default function VariantEditor({ siteId, experimentId, onClose }: VariantEditorProps) {
  const { data: experiment, isLoading: expLoading } = useExperiment(siteId, experimentId)
  const { data: variants = [], isLoading: varsLoading } = useExperimentVariants(siteId, experimentId)

  const createVariant = useCreateVariant()
  const updateVariant = useUpdateVariant()
  const deleteVariant = useDeleteVariant()
  const updateExperiment = useUpdateExperiment()

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const exp: Experiment | null = experiment ?? null
  const variantList: Variant[] = variants

  // Weight validation
  const totalWeight = useMemo(
    () => variantList.reduce((sum, v) => sum + (v.weight || 0), 0),
    [variantList]
  )
  const weightIsValid = totalWeight === 100

  // Status config
  const status = statusConfig(exp?.status || 'draft')

  // ====== Handlers ======

  const handleAddVariant = useCallback(() => {
    const key = nextVariantKey(variantList)
    createVariant.mutate({
      siteId,
      experimentId,
      variant: {
        variant_key: key,
        title: `Variant ${key}`,
        weight: 0,
        is_control: false,
        landing_page_id: exp?.landing_page_id,
      },
    })
  }, [siteId, experimentId, variantList, exp, createVariant])

  const handleUpdateVariant = useCallback(
    (variantId: string, updates: Record<string, any>) => {
      setUpdatingId(variantId)
      updateVariant.mutate(
        { siteId, experimentId, variantId, updates },
        { onSettled: () => setUpdatingId(null) }
      )
    },
    [siteId, experimentId, updateVariant]
  )

  const handleDeleteVariant = useCallback(
    (variantId: string) => {
      if (!confirm('Delete this variant? This cannot be undone.')) return
      setDeletingId(variantId)
      deleteVariant.mutate(
        { siteId, experimentId, variantId },
        { onSettled: () => setDeletingId(null) }
      )
    },
    [siteId, experimentId, deleteVariant]
  )

  const handleUpdateStatus = useCallback(
    (newStatus: string, extra?: Record<string, any>) => {
      const updates: Record<string, any> = { status: newStatus, ...extra }
      if (newStatus === 'running' && !exp?.started_at) {
        updates.started_at = new Date().toISOString()
      }
      if (newStatus === 'completed') {
        updates.ended_at = new Date().toISOString()
      }
      updateExperiment.mutate({ siteId, experimentId, updates })
    },
    [siteId, experimentId, exp, updateExperiment]
  )

  const handleDeclareWinner = useCallback(() => {
    // Find variant with highest weight (or let user pick in the future)
    const sorted = [...variantList].sort((a, b) => (b.weight || 0) - (a.weight || 0))
    const winner = sorted[0]
    if (!winner) return
    handleUpdateStatus('completed', { winner_variant_key: winner.variant_key })
  }, [variantList, handleUpdateStatus])

  const handleRestart = useCallback(() => {
    handleUpdateStatus('draft', {
      winner_variant_key: null,
      started_at: null,
      ended_at: null,
    })
  }, [handleUpdateStatus])

  // ====== Loading State ======

  if (expLoading || varsLoading) {
    return (
      <div className="h-full flex flex-col bg-[#F5F5F7]">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <span className="text-sm text-gray-400">Loading experiment...</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-gray-300" />
        </div>
      </div>
    )
  }

  if (!exp) {
    return (
      <div className="h-full flex flex-col bg-[#F5F5F7]">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <span className="text-sm text-gray-500">Experiment not found</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle size={40} className="text-gray-200 mx-auto mb-3" />
            <h3 className="text-gray-500 font-medium mb-1">Experiment not found</h3>
            <p className="text-sm text-gray-400">
              This experiment may have been deleted.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ====== Render ======

  return (
    <div className="h-full flex flex-col bg-[#F5F5F7]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900">{exp.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`${status.bg} ${status.text} px-2 py-0.5 rounded-full text-xs font-medium`}
              >
                {status.label}
              </span>
              {exp.started_at && (
                <span className="text-xs text-gray-400">
                  Started {new Date(exp.started_at).toLocaleDateString()}
                </span>
              )}
              {exp.ended_at && (
                <span className="text-xs text-gray-400">
                  Ended {new Date(exp.ended_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons based on status */}
        <div className="flex items-center gap-2">
          {exp.status === 'draft' && (
            <button
              onClick={() => handleUpdateStatus('running')}
              disabled={updateExperiment.isPending || variantList.length < 2}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md shadow-indigo-200"
              title={variantList.length < 2 ? 'Need at least 2 variants to start' : ''}
            >
              {updateExperiment.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
              Start Experiment
            </button>
          )}

          {exp.status === 'running' && (
            <>
              <button
                onClick={() => handleUpdateStatus('paused')}
                disabled={updateExperiment.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
              >
                {updateExperiment.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Pause size={14} />
                )}
                Pause
              </button>
              <button
                onClick={handleDeclareWinner}
                disabled={updateExperiment.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-md shadow-amber-200"
              >
                {updateExperiment.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trophy size={14} />
                )}
                Declare Winner
              </button>
            </>
          )}

          {exp.status === 'paused' && (
            <>
              <button
                onClick={() => handleUpdateStatus('running')}
                disabled={updateExperiment.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md shadow-indigo-200"
              >
                {updateExperiment.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                Resume
              </button>
              <button
                onClick={handleDeclareWinner}
                disabled={updateExperiment.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-md shadow-amber-200"
              >
                {updateExperiment.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trophy size={14} />
                )}
                Declare Winner
              </button>
            </>
          )}

          {exp.status === 'completed' && (
            <>
              {exp.winner_variant_key && (
                <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-2 rounded-lg text-sm font-medium">
                  <Trophy size={14} />
                  Winner: Variant {exp.winner_variant_key}
                </span>
              )}
              <button
                onClick={handleRestart}
                disabled={updateExperiment.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
              >
                {updateExperiment.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                Restart
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Weight Warning */}
        {variantList.length > 0 && !weightIsValid && (
          <div className="mb-5 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              Variant weights sum to <strong>{totalWeight}%</strong> instead of 100%.
              Adjust the weights so they total exactly 100%.
            </p>
          </div>
        )}

        {/* Variant List */}
        <div className="space-y-4">
          {variantList.length === 0 ? (
            <div className="text-center py-16">
              <AlertCircle size={40} className="mx-auto mb-3 text-gray-200" />
              <h3 className="text-gray-500 font-medium">No variants yet</h3>
              <p className="text-sm text-gray-400 mt-1">
                Add variants to start your A/B test
              </p>
            </div>
          ) : (
            variantList.map((variant: Variant) => (
              <VariantCard
                key={variant.id}
                variant={variant}
                isWinner={exp.winner_variant_key === variant.variant_key}
                onUpdate={(updates) => handleUpdateVariant(variant.id, updates)}
                onDelete={() => handleDeleteVariant(variant.id)}
                isUpdating={updatingId === variant.id}
                isDeleting={deletingId === variant.id}
              />
            ))
          )}
        </div>

        {/* Add Variant Button */}
        <div className="mt-5">
          <button
            onClick={handleAddVariant}
            disabled={createVariant.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors disabled:opacity-50"
          >
            {createVariant.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Add Variant {nextVariantKey(variantList)}
          </button>
        </div>
      </div>
    </div>
  )
}
