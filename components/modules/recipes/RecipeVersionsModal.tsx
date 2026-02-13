'use client'

import React, { useState } from 'react'
import { X, History, RotateCcw, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/lib/contexts/ToastContext'

interface Version {
  id: string
  version_number: number
  created_at: string
  label: string | null
}

interface RecipeVersionsModalProps {
  recipeId: string
  recipeName: string
  onClose: () => void
  onRestored: () => void
}

export default function RecipeVersionsModal({ recipeId, recipeName, onClose, onRestored }: RecipeVersionsModalProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['recipe-versions', recipeId],
    queryFn: async () => {
      const res = await fetch(`/api/core/recipes/${recipeId}/versions`)
      if (!res.ok) throw new Error('Failed to fetch versions')
      return res.json() as Promise<Version[]>
    },
  })

  const restore = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await fetch(`/api/core/recipes/${recipeId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_id: versionId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to restore')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Recipe restored to selected version')
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipe-versions', recipeId] })
      onRestored()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const handleRestore = async (versionId: string) => {
    if (!window.confirm('Restore this version? Current state will be saved as a new version.')) return
    setRestoringId(versionId)
    try {
      await restore.mutateAsync(versionId)
    } finally {
      setRestoringId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <History size={18} className="text-indigo-600" />
            <div>
              <h2 className="text-base font-bold text-gray-900">Version History</h2>
              <p className="text-xs text-gray-400 truncate max-w-[250px]">{recipeName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-300" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <History size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No versions yet</p>
              <p className="text-xs text-gray-400 mt-1">Versions are created automatically when you save changes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        v{v.version_number}
                      </span>
                      {v.label && (
                        <span className="text-xs text-gray-500 truncate">{v.label}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(v.created_at)}</p>
                  </div>
                  <button
                    onClick={() => handleRestore(v.id)}
                    disabled={restoringId === v.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {restoringId === v.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RotateCcw size={12} />
                    )}
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
