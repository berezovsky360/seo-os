import React, { useState, useEffect } from 'react'
import { X, Tag, Folder } from 'lucide-react'

interface Category {
  id: number
  name: string
  slug: string
  count: number
}

interface Tag {
  id: number
  name: string
  slug: string
  count: number
}

interface PublishModalProps {
  isOpen: boolean
  onClose: () => void
  onPublish: (categoryIds: number[], tagIds: number[]) => void
  siteId: string
  articleTitle: string
  isPublishing?: boolean
  isUpdate?: boolean
}

const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  siteId,
  articleTitle,
  isPublishing = false,
  isUpdate = false,
}) => {
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch categories and tags when modal opens
  useEffect(() => {
    if (isOpen && siteId) {
      fetchCategoriesAndTags()
    }
  }, [isOpen, siteId])

  const fetchCategoriesAndTags = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/sites/${siteId}/categories-tags`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch categories and tags')
      }

      setCategories(data.categories || [])
      setTags(data.tags || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories and tags')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handlePublish = () => {
    onPublish(selectedCategories, selectedTags)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{isUpdate ? 'Update in WordPress' : 'Publish to WordPress'}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {articleTitle || 'Select categories and tags'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isPublishing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading categories and tags...</p>
            </div>
          ) : error ? (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-800 text-sm">Could not load categories and tags: {error}</p>
                <p className="text-amber-600 text-xs mt-1">You can still publish without selecting categories/tags, or retry loading.</p>
                <button
                  onClick={fetchCategoriesAndTags}
                  className="mt-3 px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Categories */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Folder size={16} className="text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-900">
                    Categories ({selectedCategories.length} selected)
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {categories.length === 0 ? (
                    <p className="text-sm text-gray-500 col-span-2">No categories found</p>
                  ) : (
                    categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => toggleCategory(category.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-900">{category.name}</span>
                        <span className="text-xs text-gray-400 ml-auto">({category.count})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tag size={16} className="text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-900">
                    Tags ({selectedTags.length} selected)
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    <p className="text-sm text-gray-500">No tags found</p>
                  ) : (
                    tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedTags.includes(tag.id)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag.name} ({tag.count})
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isPublishing}
            className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow-sm shadow-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPublishing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {isUpdate ? 'Updating...' : 'Publishing...'}
              </>
            ) : (
              isUpdate ? 'Update in WordPress' : 'Publish to WordPress'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PublishModal
