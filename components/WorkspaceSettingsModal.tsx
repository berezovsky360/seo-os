'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Trash2 } from 'lucide-react'
import { useWorkspace } from '@/lib/contexts/WorkspaceContext'
import type { Workspace } from '@/types'

const WS_EMOJI_OPTIONS = ['🏢', '🚀', '💼', '🎯', '🔥', '💡', '🌟', '🎨', '⚡', '🧪', '📊', '🛒', '🎮', '📚', '🌍', '🏠']

interface WorkspaceSettingsModalProps {
  workspace: Workspace | null
  onClose: () => void
}

export default function WorkspaceSettingsModal({ workspace, onClose }: WorkspaceSettingsModalProps) {
  const { renameWorkspace, deleteWorkspace, workspaces } = useWorkspace()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🏢')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (workspace) {
      setName(workspace.name)
      setEmoji(workspace.emoji)
      setConfirmDelete(false)
    }
  }, [workspace])

  if (!workspace || typeof window === 'undefined') return null

  const canDelete = !workspace.is_default && workspaces.length > 1

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await renameWorkspace(workspace.id, name.trim(), emoji)
    setSaving(false)
    onClose()
  }

  const handleDelete = async () => {
    await deleteWorkspace(workspace.id)
    onClose()
  }

  const handleClose = () => {
    setConfirmDelete(false)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-bold text-gray-900">Workspace Settings</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5 mt-2">
          {/* Icon */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Icon</label>
            <div className="grid grid-cols-8 gap-1.5">
              {WS_EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl text-lg transition-all ${
                    emoji === e
                      ? 'bg-indigo-50 ring-2 ring-indigo-400 shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
            />
          </div>

          {/* Default badge */}
          {workspace.is_default && (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-xl">
              <span className="text-xs font-semibold text-indigo-600">Default Workspace</span>
              <span className="text-[10px] text-indigo-400">New sites are added here</span>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || (name === workspace.name && emoji === workspace.emoji)}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Danger zone */}
          {canDelete && (
            <div className="border-t border-gray-100 pt-4">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 size={14} />
                  Delete Workspace
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-500 text-center">
                    Sites will be moved to the default workspace. This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
