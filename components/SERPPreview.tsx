'use client'

interface SERPPreviewProps {
  title: string
  description: string
  url: string
}

export default function SERPPreview({ title, description, url }: SERPPreviewProps) {
  // Truncate title at 60 chars (Google's limit)
  const displayTitle = title.length > 60 ? title.substring(0, 57) + '...' : title

  // Truncate description at 160 chars (Google's limit)
  const displayDesc =
    description.length > 160 ? description.substring(0, 157) + '...' : description

  // Character count with color coding
  const getTitleColor = (length: number) => {
    if (length >= 50 && length <= 60) return 'text-emerald-600'
    if (length > 60) return 'text-rose-600'
    return 'text-amber-600'
  }

  const getDescColor = (length: number) => {
    if (length >= 150 && length <= 160) return 'text-emerald-600'
    if (length > 160) return 'text-rose-600'
    return 'text-amber-600'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">
          Google Search Preview
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          How your page will appear in search results
        </p>
      </div>

      {/* SERP Mockup */}
      <div className="p-6 bg-white">
        <div className="max-w-2xl space-y-2">
          {/* Breadcrumb / URL */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-xs">🌐</span>
            </div>
            <div>
              <p className="text-sm text-gray-700 font-normal">
                {url || 'example.com'} <span className="text-gray-400">›</span>
              </p>
            </div>
          </div>

          {/* Title */}
          <h4 className="text-xl text-[#1a0dab] hover:underline cursor-pointer font-normal leading-tight">
            {displayTitle || 'Your SEO Title Will Appear Here'}
          </h4>

          {/* Description */}
          <p className="text-sm text-[#4d5156] leading-relaxed">
            {displayDesc ||
              'Your meta description will appear here. Make it compelling to improve click-through rate from search results.'}
          </p>
        </div>
      </div>

      {/* Character counts */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-gray-600">Title: </span>
            <span className={`font-semibold ${getTitleColor(title.length)}`}>
              {title.length}/60 characters
            </span>
          </div>
          <div>
            <span className="text-gray-600">Description: </span>
            <span className={`font-semibold ${getDescColor(description.length)}`}>
              {description.length}/160 characters
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
