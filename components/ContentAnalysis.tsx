'use client'

import { CheckCircle, AlertCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react'
import SEOScoreIndicator from './SEOScoreIndicator'

interface ContentAnalysisProps {
  content: string
  keyword: string
  seoScore: number
  preliminaryScore?: number // For comparison: predicted vs actual
  wordCount: number
  readabilityScore?: number
  imagesCount?: number
  imagesAltCount?: number
  internalLinksCount?: number
  externalLinksCount?: number
}

export default function ContentAnalysis({
  content,
  keyword,
  seoScore,
  preliminaryScore,
  wordCount,
  readabilityScore,
  imagesCount = 0,
  imagesAltCount = 0,
  internalLinksCount = 0,
  externalLinksCount = 0,
}: ContentAnalysisProps) {
  // Calculate keyword density
  const keywordCount = keyword
    ? (content.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length
    : 0
  const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0

  // Check criteria with status
  const checks = [
    {
      label: 'Word Count',
      value: wordCount,
      status: wordCount >= 1000 ? 'good' : wordCount >= 500 ? 'warning' : 'error',
      message: `${wordCount} words`,
      suggestion: wordCount < 1000 ? '(aim for 1000+)' : '',
    },
    {
      label: 'Keyword Density',
      value: density,
      status: density >= 0.5 && density <= 2.5 ? 'good' : density > 0 ? 'warning' : 'error',
      message: `${density.toFixed(2)}%`,
      suggestion: density < 0.5 || density > 2.5 ? '(aim for 0.5-2.5%)' : '',
    },
    {
      label: 'Readability',
      value: readabilityScore || 0,
      status: !readabilityScore ? 'warning' : readabilityScore >= 60 ? 'good' : 'warning',
      message: readabilityScore ? `${readabilityScore}/100` : 'Not analyzed',
      suggestion: !readabilityScore ? '(analyze after publishing)' : '',
    },
    {
      label: 'Images with Alt',
      value: imagesAltCount,
      status:
        imagesCount === 0
          ? 'warning'
          : imagesAltCount === imagesCount
          ? 'good'
          : imagesAltCount > 0
          ? 'warning'
          : 'error',
      message: `${imagesAltCount}/${imagesCount}`,
      suggestion: imagesCount > 0 && imagesAltCount < imagesCount ? '(add alt text)' : '',
    },
    {
      label: 'Internal Links',
      value: internalLinksCount,
      status: internalLinksCount >= 3 ? 'good' : internalLinksCount > 0 ? 'warning' : 'error',
      message: `${internalLinksCount} links`,
      suggestion: internalLinksCount < 3 ? '(aim for 3-5)' : '',
    },
    {
      label: 'External Links',
      value: externalLinksCount,
      status:
        externalLinksCount >= 1 && externalLinksCount <= 3
          ? 'good'
          : externalLinksCount > 3
          ? 'warning'
          : 'warning',
      message: `${externalLinksCount} links`,
      suggestion: externalLinksCount === 0 ? '(add 1-2)' : externalLinksCount > 3 ? '(too many)' : '',
    },
  ]

  // Calculate score improvement if preliminary score exists
  const scoreImprovement =
    preliminaryScore !== undefined ? seoScore - preliminaryScore : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header with score indicator */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Content Analysis
            </h3>
            <p className="text-sm text-gray-500">
              SEO quality check based on Rank Math criteria
            </p>

            {/* Score comparison (predicted vs actual) */}
            {scoreImprovement !== null && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Predicted: <span className="font-medium">{preliminaryScore}</span>
                </span>
                <span className="text-gray-300">→</span>
                <span className="text-sm text-gray-900 font-semibold">
                  Actual: {seoScore}
                </span>
                {scoreImprovement !== 0 && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      scoreImprovement > 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {scoreImprovement > 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    {Math.abs(scoreImprovement)} points
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Score indicator */}
          <SEOScoreIndicator
            score={seoScore}
            label="SEO Score"
            size="md"
          />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 gap-3">
          {checks.map((check) => (
            <div
              key={check.label}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Status icon */}
                {check.status === 'good' && (
                  <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
                )}
                {check.status === 'warning' && (
                  <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
                )}
                {check.status === 'error' && (
                  <XCircle size={18} className="text-rose-600 flex-shrink-0" />
                )}

                {/* Label */}
                <span className="text-sm font-medium text-gray-700">
                  {check.label}
                </span>
              </div>

              {/* Value and suggestion */}
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">
                  {check.message}
                </span>
                {check.suggestion && (
                  <span className="text-xs text-gray-500 ml-1">
                    {check.suggestion}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Keyword info */}
        {keyword && (
          <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <p className="text-xs font-medium text-indigo-900 mb-1">
              Focus Keyword
            </p>
            <p className="text-sm text-indigo-700">
              "{keyword}" <span className="text-indigo-500">• Found {keywordCount}x in content</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
