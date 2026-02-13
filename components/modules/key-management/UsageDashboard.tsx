'use client'

import React, { useState } from 'react'
import {
  DollarSign, Activity, Zap, TrendingUp, Loader2,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from 'recharts'
import { useUsageStats } from '@/hooks/useUsageDashboard'
import BudgetSettings from './BudgetSettings'
import UsageLogTable from './UsageLogTable'

const PERIODS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
]

const SERVICES = [
  { value: 'all', label: 'All APIs' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'dataforseo', label: 'DataForSEO' },
]

const SERVICE_COLORS: Record<string, string> = {
  gemini: '#6366f1',
  openai: '#10b981',
  dataforseo: '#f59e0b',
}

function formatCost(v: number): string {
  return `$${v.toFixed(4)}`
}

function formatTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(v)
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-semibold text-gray-900">{formatCost(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function UsageDashboard() {
  const [period, setPeriod] = useState('30d')
  const [service, setService] = useState('all')
  const [logPage, setLogPage] = useState(1)

  const { data, isLoading, error } = useUsageStats(period, service, logPage)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading usage data...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-32 text-red-500 text-sm">
        Failed to load usage data. Please try again.
      </div>
    )
  }

  const { summary, daily_costs, service_breakdown, budget_status } = data

  // Prepare bar chart data from service breakdown
  const barData = Object.entries(service_breakdown).map(([svc, stats]) => ({
    name: svc.charAt(0).toUpperCase() + svc.slice(1),
    cost: stats.cost,
    requests: stats.requests,
    fill: SERVICE_COLORS[svc] || '#94a3b8',
  }))

  // Budget with highest percentage for headline stat
  const topBudget = budget_status?.length
    ? budget_status.reduce((a, b) => (a.percentage > b.percentage ? a : b))
    : null

  return (
    <div className="p-8 max-w-5xl space-y-8">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => { setPeriod(p.value); setLogPage(1) }}
              className={`px-3.5 py-2 text-xs font-semibold transition-colors ${
                period === p.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
          {SERVICES.map(s => (
            <button
              key={s.value}
              onClick={() => { setService(s.value); setLogPage(1) }}
              className={`px-3.5 py-2 text-xs font-semibold transition-colors ${
                service === s.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Cost"
          value={formatCost(summary.total_cost)}
          accent="border-l-emerald-500"
        />
        <StatCard
          icon={Activity}
          label="Requests"
          value={summary.total_requests.toLocaleString()}
          accent="border-l-blue-500"
        />
        <StatCard
          icon={Zap}
          label="Tokens (AI)"
          value={formatTokens(summary.total_tokens)}
          accent="border-l-violet-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Budget Used"
          value={topBudget ? `${Math.round(topBudget.percentage)}%` : 'No limit'}
          accent={
            topBudget && topBudget.percentage >= 100
              ? 'border-l-red-500'
              : topBudget && topBudget.percentage >= 80
              ? 'border-l-amber-500'
              : 'border-l-gray-300'
          }
          sub={topBudget ? `$${topBudget.current_spend.toFixed(2)} / $${topBudget.monthly_limit.toFixed(2)}` : undefined}
        />
      </div>

      {/* Budget Progress Bars */}
      {budget_status && budget_status.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Monthly Budgets</h3>
          {budget_status.map(b => (
            <div key={b.service} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700 capitalize">{b.service}</span>
                <span className={`font-semibold ${
                  b.percentage >= 100 ? 'text-red-600' : b.percentage >= 80 ? 'text-amber-600' : 'text-gray-500'
                }`}>
                  ${b.current_spend.toFixed(2)} / ${b.monthly_limit.toFixed(2)}
                </span>
              </div>
              <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                    b.percentage >= 100
                      ? 'bg-red-500'
                      : b.percentage >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(b.percentage, 100)}%` }}
                />
                {/* 80% marker */}
                <div className="absolute inset-y-0 left-[80%] w-px bg-gray-300" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Daily Cost Trend */}
      {daily_costs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Daily Cost Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={daily_costs} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="gradGemini" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDataforseo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={v => {
                  const d = new Date(v)
                  return `${d.getDate()}/${d.getMonth() + 1}`
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={v => `$${v}`}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Area
                type="monotone"
                dataKey="gemini"
                name="Gemini"
                stroke="#6366f1"
                fill="url(#gradGemini)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="dataforseo"
                name="DataForSEO"
                stroke="#f59e0b"
                fill="url(#gradDataforseo)"
                stackId="1"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Service Breakdown */}
      {barData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Cost by Service</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `$${v}`} width={50} />
              <Tooltip formatter={(v) => formatCost(Number(v))} />
              <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <rect key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Budget Settings */}
      <BudgetSettings />

      {/* Detailed Log */}
      <UsageLogTable
        items={data.log.items}
        total={data.log.total}
        page={logPage}
        perPage={data.log.per_page}
        onPageChange={setLogPage}
      />
    </div>
  )
}

// ====== Stat Card ======

function StatCard({ icon: Icon, label, value, accent, sub }: {
  icon: React.ElementType
  label: string
  value: string
  accent: string
  sub?: string
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-l-4 ${accent}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="text-gray-400" />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}
