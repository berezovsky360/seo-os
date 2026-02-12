'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useWorkspace } from '@/lib/contexts/WorkspaceContext'

const WS_EMOJI_OPTIONS = ['🏢', '🚀', '💼', '🎯', '🔥', '💡', '🌟', '🎨', '⚡', '🧪', '📊', '🛒', '🎮', '📚', '🌍', '🏠']

interface CreateWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const { createWorkspace, switchWorkspace } = useWorkspace()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🏢')
  const [loading, setLoading] = useState(false)

  if (!isOpen || typeof window === 'undefined') return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    const ws = await createWorkspace(name.trim(), emoji)
    setLoading(false)

    if (ws) {
      switchWorkspace(ws.id)
      setName('')
      setEmoji('🏢')
      onClose()
    }
  }

  const handleClose = () => {
    setName('')
    setEmoji('🏢')
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
          <h2 className="text-lg font-bold text-gray-900">Create Workspace</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="px-6 text-sm text-gray-500 mb-4">
          Organize your sites into separate workspaces.
        </p>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Emoji picker */}
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
              placeholder="My Workspace"
              autoFocus
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Workspace'}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
