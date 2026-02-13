'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Loader2,
} from 'lucide-react'

interface MagnetManagerProps {
  magnet?: any
  landingSiteId?: string
  onSave: (data: Record<string, any>) => void
  onClose: () => void
}

export default function MagnetManager({ magnet, landingSiteId, onSave, onClose }: MagnetManagerProps) {
  const isEdit = !!magnet?.id

  const [name, setName] = useState(magnet?.name || '')
  const [fileUrl, setFileUrl] = useState(magnet?.file_url || '')
  const [fileType, setFileType] = useState<string>(magnet?.file_type || 'pdf')
  const [description, setDescription] = useState(magnet?.description || '')
  const [saving, setSaving] = useState(false)

  // Sync state when magnet prop changes
  useEffect(() => {
    if (magnet) {
      setName(magnet.name || '')
      setFileUrl(magnet.file_url || '')
      setFileType(magnet.file_type || 'pdf')
      setDescription(magnet.description || '')
    }
  }, [magnet])

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const data: Record<string, any> = {
        name: name.trim(),
        file_url: fileUrl.trim() || undefined,
        file_type: fileType,
        description: description.trim() || undefined,
      }
      if (landingSiteId && !isEdit) data.landing_site_id = landingSiteId

      await onSave(data)
    } catch {
      // error handling delegated to parent
    } finally {
      setSaving(false)
    }
  }

  const fileTypeOptions: { value: string; label: string }[] = [
    { value: 'pdf', label: 'PDF' },
    { value: 'ebook', label: 'eBook' },
    { value: 'video', label: 'Video' },
    { value: 'checklist', label: 'Checklist' },
    { value: 'template', label: 'Template' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Edit Magnet' : 'Create Magnet'}
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
              Magnet Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SEO Checklist 2026"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* File URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              File URL
            </label>
            <input
              type="text"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://example.com/downloads/seo-checklist.pdf"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">Direct download link for the lead magnet file</p>
          </div>

          {/* File Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              File Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {fileTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFileType(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    fileType === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of what the lead magnet contains and its value to the reader..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            />
          </div>
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
            {isEdit ? 'Save Changes' : 'Create Magnet'}
          </button>
        </div>
      </div>
    </div>
  )
}
