'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { X, Upload, FileText, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import type { PersonaDB, PersonaDocument, WritingStyle } from '@/types'
import { usePersonaDocuments, useUploadPersonaDocument, useDeletePersonaDocument, useProcessDocument } from '@/hooks/usePersonas'

interface PersonaEditorModalProps {
  isOpen: boolean
  onClose: () => void
  persona: PersonaDB | null // null = create mode
  onSave: (data: {
    name: string
    role: string
    avatar_url: string
    system_prompt: string
    writing_style: string
    is_default: boolean
  }) => void
  isSaving: boolean
}

const WRITING_STYLES: { value: WritingStyle; label: string; description: string }[] = [
  { value: 'balanced', label: 'Balanced', description: 'Natural, well-rounded tone' },
  { value: 'formal', label: 'Formal', description: 'Professional and authoritative' },
  { value: 'casual', label: 'Casual', description: 'Friendly and conversational' },
  { value: 'technical', label: 'Technical', description: 'Detailed and precise' },
  { value: 'creative', label: 'Creative', description: 'Engaging and expressive' },
]

const PersonaEditorModal: React.FC<PersonaEditorModalProps> = ({
  isOpen,
  onClose,
  persona,
  onSave,
  isSaving,
}) => {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [writingStyle, setWritingStyle] = useState<WritingStyle>('balanced')
  const [isDefault, setIsDefault] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEditMode = !!persona

  // Populate form when persona changes
  useEffect(() => {
    if (persona) {
      setName(persona.name)
      setRole(persona.role)
      setAvatarUrl(persona.avatar_url || '')
      setSystemPrompt(persona.system_prompt)
      setWritingStyle((persona.writing_style as WritingStyle) || 'balanced')
      setIsDefault(persona.is_default)
    } else {
      setName('')
      setRole('')
      setAvatarUrl('')
      setSystemPrompt('')
      setWritingStyle('balanced')
      setIsDefault(false)
    }
  }, [persona])

  // Documents
  const { data: documents = [] } = usePersonaDocuments(persona?.id || null)
  const uploadDoc = useUploadPersonaDocument()
  const deleteDoc = useDeletePersonaDocument()
  const processDoc = useProcessDocument()

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!persona?.id) return
    for (const file of Array.from(files)) {
      const result = await uploadDoc.mutateAsync({ personaId: persona.id, file })
      // Auto-process chunked documents
      if (result.document.strategy === 'chunked' && !result.document.is_processed) {
        processDoc.mutate({ document_id: result.document.id })
      }
    }
  }, [persona?.id, uploadDoc, processDoc])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }, [handleFileUpload])

  const handleSubmit = () => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      role: role.trim(),
      avatar_url: avatarUrl.trim(),
      system_prompt: systemPrompt,
      writing_style: writingStyle,
      is_default: isDefault,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditMode ? 'Edit Persona' : 'Create Persona'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Identity */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Identity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sarah Chen"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Role</label>
                <input
                  type="text"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="e.g. Senior SEO Writer"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Avatar URL</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
          </div>

          {/* AI Instructions */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">AI Instructions</h3>
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">System Prompt</label>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                placeholder="Define the persona's voice, expertise, writing patterns, terminology preferences, and any specific instructions for content generation..."
                rows={8}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none resize-y"
              />
              <div className="text-right mt-1">
                <span className="text-xs text-gray-400">{systemPrompt.length} characters</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Writing Style</label>
              <div className="flex flex-wrap gap-2">
                {WRITING_STYLES.map(style => (
                  <button
                    key={style.value}
                    onClick={() => setWritingStyle(style.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      writingStyle === style.value
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={style.description}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Knowledge Base (only in edit mode) */}
          {isEditMode && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Knowledge Base (RAG)</h3>
              <p className="text-xs text-gray-500 mb-3">
                Upload files to train this persona. Small files (&lt;50KB) are used as inline context. Larger files are chunked and embedded for semantic retrieval.
              </p>

              {/* Drag-and-drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-indigo-300 rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                <Upload size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 font-medium">Drop files here or click to upload</p>
                <p className="text-xs text-gray-400 mt-1">.txt, .md, .csv supported</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".txt,.md,.csv,.text"
                  onChange={e => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
              </div>

              {uploadDoc.isPending && (
                <div className="flex items-center gap-2 mt-3 text-sm text-indigo-600">
                  <Loader2 size={14} className="animate-spin" />
                  Uploading...
                </div>
              )}

              {/* Document list */}
              {documents.length > 0 && (
                <div className="mt-4 space-y-2">
                  {documents.map((doc: PersonaDocument) => (
                    <div key={doc.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText size={16} className="text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{doc.file_name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              doc.strategy === 'inline' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                            }`}>
                              {doc.strategy}
                            </span>
                            {doc.is_processed ? (
                              <span className="flex items-center gap-0.5 text-emerald-500">
                                <CheckCircle2 size={10} />
                                {doc.chunk_count > 0 ? `${doc.chunk_count} chunks` : 'Ready'}
                              </span>
                            ) : doc.processing_error ? (
                              <span className="flex items-center gap-0.5 text-rose-500">
                                <AlertCircle size={10} />
                                Error
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-amber-500">
                                <Loader2 size={10} className="animate-spin" />
                                Processing
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteDoc.mutate({ personaId: persona!.id, documentId: doc.id })}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-gray-300 hover:text-rose-500 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Default toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-600 font-medium">Set as default persona</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSaving}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {isEditMode ? 'Save Changes' : 'Create Persona'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PersonaEditorModal
