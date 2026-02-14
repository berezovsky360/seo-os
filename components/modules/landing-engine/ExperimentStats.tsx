'use client'

import React from 'react'
import { Trophy, BarChart3, Loader2, Users, Eye, MousePointerClick } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useExperiment, useExperimentStats } from '@/hooks/useLandingEngine'

// ====== Types ======

interface ExperimentStatsProps {
  siteId: string
  experimentId: string
}

interface VariantData {
  variant_key: string
  views: number
  conversions: number
  rate: number
}

interface StatsData {
  variants: VariantData[]
  confidence: number
  winner: string | null
  sample_size: number
}

// ====== Confidence helpers ======

function getConfidenceInfo(confidence: number): {
  label: string
  bg: string
  text: string
  bold: boolean
} {
  if (confidence >= 99) {
    return { label: 'Highly significant', bg: 'bg-emerald-50', text: 'text-emerald-700', bold: true }
  }
  if (confidence >= 95) {
    return { label: 'Statistically significant', bg: 'bg-emerald-50', text: 'text-emerald-700', bold: false }
  }
  if (confidence >= 90) {
    return { label: 'Marginally significant', bg: 'bg-amber-50', text: 'text-amber-700', bold: false }
  }
  return { label: 'Not significant', bg: 'bg-gray-50', text: 'text-gray-500', bold: false }
}

// ====== Bar colors ======

const COLOR_CONTROL = '#9ca3af'  // gray-400
const COLOR_VARIANT = '#6366f1'  // indigo-500
const COLOR_WINNER = '#10b981'   // emerald-500

function getBarColor(variantKey: string, winner: string | null, isControl: boolean): string {
  if (winner && variantKey === winner) return COLOR_WINNER
  if (isControl) return COLOR_CONTROL
  return COLOR_VARIANT
}

// ====== Component ======

export default function ExperimentStats({ siteId, experimentId }: ExperimentStatsProps) {
  const { data: experiment, isLoading: expLoading } = useExperiment(siteId, experimentId)
  const { data: stats, isLoading: statsLoading } = useExperimentStats(siteId, experimentId)

  const isLoading = expLoading || statsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (!stats || !experiment) {
    return (
      <div className="text-center py-16">
        <BarChart3 size={40} className="mx-auto mb-3 text-gray-200" />
        <h3 className="text-gray-500 font-medium">No experiment data</h3>
        <p className="text-sm text-gray-400 mt-1">Stats will appear once the experiment is running.</p>
      </div>
    )
  }

  const statsData = stats as StatsData
  const { variants, confidence, winner, sample_size } = statsData
  const confidenceInfo = getConfidenceInfo(confidence)

  // Determine control variant (first one, typically "A")
  const controlKey = variants.length > 0 ? variants[0].variant_key : null

  // Chart data
  const chartData = variants.map((v) => ({
    variant_key: v.variant_key,
    rate: parseFloat((v.rate * 100).toFixed(2)),
    isControl: v.variant_key === controlKey,
  }))

  return (
    <div className="space-y-5">
      {/* Experiment header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">{experiment.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                experiment.status === 'running'
                  ? 'bg-emerald-50 text-emerald-700'
                  : experiment.status === 'completed'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {experiment.status
                ? experiment.status.charAt(0).toUpperCase() + experiment.status.slice(1)
                : 'Draft'}
            </span>
            {experiment.winner_variant_key && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                <Trophy size={12} />
                Winner: {experiment.winner_variant_key}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Sample size */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-indigo-50 rounded-lg">
              <Users size={14} className="text-indigo-600" />
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Sample Size
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {sample_size.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">Total participants</div>
        </div>

        {/* Confidence */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-indigo-50 rounded-lg">
              <BarChart3 size={14} className="text-indigo-600" />
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Confidence
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {confidence.toFixed(1)}%
          </div>
          <div className="mt-2">
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs ${confidenceInfo.bg} ${confidenceInfo.text} ${
                confidenceInfo.bold ? 'font-bold' : 'font-medium'
              }`}
            >
              {confidenceInfo.label}
            </span>
          </div>
        </div>

        {/* Winner */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-amber-50 rounded-lg">
              <Trophy size={14} className="text-amber-600" />
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Winner
            </span>
          </div>
          {winner ? (
            <>
              <div className="text-2xl font-bold text-emerald-600">
                Variant {winner}
              </div>
              <div className="text-xs text-gray-400 mt-1">Declared winner</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-300">&mdash;</div>
              <div className="text-xs text-gray-400 mt-1">Not yet determined</div>
            </>
          )}
        </div>
      </div>

      {/* Variants table */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Variant Performance
        </h4>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Variant
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span className="inline-flex items-center gap-1">
                    <Eye size={12} />
                    Views
                  </span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span className="inline-flex items-center gap-1">
                    <MousePointerClick size={12} />
                    Conversions
                  </span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Rate
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => {
                const isControl = variant.variant_key === controlKey
                const isWinner = winner !== null && variant.variant_key === winner
                return (
                  <tr
                    key={variant.variant_key}
                    className={`border-b border-gray-100 transition-colors ${
                      isWinner ? 'bg-emerald-50/40' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {variant.variant_key}
                        </span>
                        {isControl && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500 uppercase">
                            Control
                          </span>
                        )}
                        {isWinner && (
                          <Trophy size={14} className="text-amber-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      {variant.views.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      {variant.conversions.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      <span
                        className={
                          isWinner
                            ? 'text-emerald-600'
                            : isControl
                            ? 'text-gray-600'
                            : 'text-indigo-600'
                        }
                      >
                        {(variant.rate * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isWinner ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          Winner
                        </span>
                      ) : isControl ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Baseline
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                          Challenger
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar chart */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Conversion Rate by Variant
        </h4>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="variant_key"
                tick={{ fontSize: 13, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: any) => `${value}%`}
              />
              <Tooltip
                formatter={(value: any, name: any) => [`${value}%`, 'Conversion Rate']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  fontSize: '13px',
                }}
                cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
              />
              <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.variant_key, winner, entry.isControl)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Chart legend */}
          <div className="flex items-center justify-center gap-5 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLOR_CONTROL }} />
              <span className="text-xs text-gray-500">Control</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLOR_VARIANT }} />
              <span className="text-xs text-gray-500">Variant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLOR_WINNER }} />
              <span className="text-xs text-gray-500">Winner</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confidence indicator */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Statistical Confidence
        </h4>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Confidence Level</span>
            <span
              className={`inline-flex px-2.5 py-1 rounded-full text-xs ${confidenceInfo.bg} ${confidenceInfo.text} ${
                confidenceInfo.bold ? 'font-bold' : 'font-medium'
              }`}
            >
              {confidenceInfo.label}
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                confidence >= 95
                  ? 'bg-emerald-500'
                  : confidence >= 90
                  ? 'bg-amber-400'
                  : 'bg-gray-300'
              }`}
              style={{ width: `${Math.min(confidence, 100)}%` }}
            />
            {/* Threshold markers */}
            <div
              className="absolute inset-y-0 w-px bg-gray-300"
              style={{ left: '90%' }}
              title="90% threshold"
            />
            <div
              className="absolute inset-y-0 w-px bg-gray-400"
              style={{ left: '95%' }}
              title="95% threshold"
            />
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">0%</span>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">90%</span>
              <span className="text-xs text-gray-400">95%</span>
            </div>
            <span className="text-xs text-gray-400">100%</span>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            {confidence >= 95 ? (
              <p>
                Results have reached statistical significance at{' '}
                <strong>{confidence.toFixed(1)}%</strong> confidence.{' '}
                {winner
                  ? `Variant ${winner} is the recommended winner.`
                  : 'A winner can be declared.'}
              </p>
            ) : confidence >= 90 ? (
              <p>
                Results are marginally significant at <strong>{confidence.toFixed(1)}%</strong>{' '}
                confidence. Consider gathering more data before making a decision.
              </p>
            ) : (
              <p>
                Current confidence is <strong>{confidence.toFixed(1)}%</strong>. More traffic is
                needed to reach statistical significance (95%+).
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
