'use client'

import { useState, useMemo } from 'react'
import { useFunnelAnalytics } from '@/hooks/useFunnelBuilder'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Loader2, TrendingUp } from 'lucide-react'

const PERIOD_OPTIONS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

const EVENT_COLORS: Record<string, string> = {
  page_view: '#6366f1',
  form_submit: '#f43f5e',
  email_sent: '#0ea5e9',
  email_opened: '#06b6d4',
  converted: '#10b981',
}

interface FunnelAnalyticsProps {
  funnelId: string
  graph: any
}

export default function FunnelAnalytics({ funnelId, graph }: FunnelAnalyticsProps) {
  const [periodDays, setPeriodDays] = useState(30)

  const from = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - periodDays)
    return d.toISOString()
  }, [periodDays])

  const { data: analytics, isLoading } = useFunnelAnalytics(funnelId, from)

  // Build funnel step data from graph nodes + analytics
  const funnelSteps = useMemo(() => {
    const nodes = graph?.nodes || []
    const analyticsMap = new Map<string, Record<string, number>>()

    for (const item of analytics || []) {
      if (!analyticsMap.has(item.node_id)) analyticsMap.set(item.node_id, {})
      analyticsMap.get(item.node_id)![item.event_type] = item.count
    }

    return nodes.map((node: any) => {
      const stats = analyticsMap.get(node.id) || {}
      const total = Object.values(stats).reduce((a: number, b: number) => a + b, 0)
      return {
        id: node.id,
        name: node.data?.label || node.type || 'Step',
        type: node.type,
        total,
        ...stats,
      }
    })
  }, [graph, analytics])

  // Compute drop-off rates
  const dropOffData = useMemo(() => {
    if (funnelSteps.length < 2) return []
    return funnelSteps.map((step: any, i: number) => {
      const prev = i > 0 ? funnelSteps[i - 1].total : step.total
      const rate = prev > 0 ? ((prev - step.total) / prev * 100) : 0
      return {
        ...step,
        dropOff: Math.max(0, rate),
        convRate: prev > 0 ? (step.total / prev * 100) : 0,
      }
    })
  }, [funnelSteps])

  const totalStart = funnelSteps[0]?.total || 0
  const totalEnd = funnelSteps[funnelSteps.length - 1]?.total || 0
  const overallRate = totalStart > 0 ? (totalEnd / totalStart * 100) : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period selector + summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp size={18} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-gray-900">Funnel Performance</h3>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setPeriodDays(opt.days)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                periodDays === opt.days
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-indigo-50 rounded-xl px-4 py-3 border border-indigo-100">
          <div className="text-xs text-indigo-600 font-medium">Visitors</div>
          <div className="text-2xl font-bold text-indigo-900 mt-0.5">{totalStart}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
          <div className="text-xs text-emerald-600 font-medium">Conversions</div>
          <div className="text-2xl font-bold text-emerald-900 mt-0.5">{totalEnd}</div>
        </div>
        <div className="bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
          <div className="text-xs text-amber-600 font-medium">Conversion Rate</div>
          <div className="text-2xl font-bold text-amber-900 mt-0.5">{overallRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Bar chart */}
      {dropOffData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dropOffData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value: any, name: any) => [value, name === 'total' ? 'Events' : name]}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {dropOffData.map((entry: any, i: number) => (
                  <Cell
                    key={i}
                    fill={EVENT_COLORS[entry.type === 'conversion' ? 'converted' : entry.type === 'form' ? 'form_submit' : 'page_view'] || '#6366f1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Step-by-step breakdown */}
      {dropOffData.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Step Breakdown</h4>
          {dropOffData.map((step: any, i: number) => (
            <div key={step.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-2.5">
              <span className="text-xs text-gray-400 font-mono w-6">{i + 1}.</span>
              <span className="text-sm font-medium text-gray-800 flex-1">{step.name}</span>
              <span className="text-sm font-bold text-gray-900">{step.total}</span>
              {i > 0 && (
                <span className={`text-xs font-semibold ${step.dropOff > 50 ? 'text-red-500' : step.dropOff > 20 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {step.dropOff > 0 ? `-${step.dropOff.toFixed(0)}%` : '0%'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {funnelSteps.length === 0 && (
        <div className="text-center py-12 text-sm text-gray-400">
          No analytics data yet. Add steps to your funnel and activate it.
        </div>
      )}
    </div>
  )
}
