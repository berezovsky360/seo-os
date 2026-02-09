'use client'

import { useState } from 'react'

interface SocialPreviewProps {
  ogTitle: string
  ogDescription: string
  ogImage?: string
  twitterTitle: string
  twitterDescription: string
  twitterImage?: string
  url: string
}

export default function SocialPreview({
  ogTitle,
  ogDescription,
  ogImage,
  twitterTitle,
  twitterDescription,
  twitterImage,
  url,
}: SocialPreviewProps) {
  const [activeTab, setActiveTab] = useState<'facebook' | 'twitter'>('facebook')

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header with tabs */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Social Media Preview
          </h3>

          {/* Tab buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('facebook')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'facebook'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Facebook
            </button>
            <button
              onClick={() => setActiveTab('twitter')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'twitter'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Twitter
            </button>
          </div>
        </div>
      </div>

      {/* Preview content */}
      <div className="p-6">
        {activeTab === 'facebook' && (
          <div className="max-w-xl mx-auto">
            {/* Facebook Card Mockup */}
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
              {/* Image */}
              {ogImage ? (
                <div className="relative w-full aspect-[1.91/1] bg-gray-100">
                  <img
                    src={ogImage}
                    alt="OG Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full aspect-[1.91/1] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">No image</span>
                </div>
              )}

              {/* Content */}
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-500 uppercase mb-2">
                  {url || 'example.com'}
                </p>
                <h5 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">
                  {ogTitle || 'Facebook Open Graph Title'}
                </h5>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {ogDescription || 'Facebook Open Graph description will appear here...'}
                </p>
              </div>
            </div>

            {/* Info */}
            <p className="text-xs text-gray-500 mt-3 text-center">
              Image size: 1200x630px recommended
            </p>
          </div>
        )}

        {activeTab === 'twitter' && (
          <div className="max-w-xl mx-auto">
            {/* Twitter Card Mockup */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              {/* Image */}
              {twitterImage ? (
                <div className="relative w-full aspect-[2/1] bg-gray-100">
                  <img
                    src={twitterImage}
                    alt="Twitter Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full aspect-[2/1] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">No image</span>
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                <h5 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">
                  {twitterTitle || 'Twitter Card Title'}
                </h5>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {twitterDescription || 'Twitter Card description will appear here...'}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span>🔗</span>
                  {url || 'example.com'}
                </p>
              </div>
            </div>

            {/* Info */}
            <p className="text-xs text-gray-500 mt-3 text-center">
              Image size: 1200x600px for summary_large_image
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
