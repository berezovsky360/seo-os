'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, FileText, Eye, Users as UsersIcon, Search, GitBranch,
  Cpu, TrendingUp, TrendingDown, ArrowLeft, RefreshCw, Loader2,
  Magnet, Globe, Target,
} from 'lucide-react'
import { useMetricoStats } from '@/hooks/useMetrico'
import { useQueryClient } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ————————————————————————————— KPI Stat Card —————————————————————————————

function StatCard({
  icon,
  iconBg,
  label,
  value,
  secondary,
  secondaryColor,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string | number
  secondary?: string
  secondaryColor?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {secondary && (
        <p className={`text-xs font-medium ${secondaryColor || 'text-gray-400'}`}>{secondary}</p>
      )}
    </div>
  )
}

// ————————————————————————— Detail Breakdown Card ——————————————————————————

function DetailCard({
  title,
  items,
}: {
  title: string
  items: { label: string; value: string | number; color?: string }[]
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h4 className="text-sm font-bold text-gray-700 mb-3">{title}</h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{item.label}</span>
            <span className={`text-sm font-bold ${item.color || 'text-gray-900'}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ————————————————————————— Main Dashboard ————————————————————————————————

export default function MetricoDashboard() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: stats, isLoading, error } = useMetricoStats()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['metrico-stats'] })
  }

  return (
    <div className="p-6 md:p-10 h-full overflow-y-auto bg-[#F5F5F7]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <LayoutDashboard size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Metrico</h1>
            <p className="text-xs text-gray-400">Unified KPI Dashboard</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {/* Loading / Error */}
      {isLoading && !stats && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm mb-6">
          Failed to load stats: {(error as Error).message}
        </div>
      )}

      {stats && (
        <>
          {/* KPI Summary Row — 6 cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard
              icon={<FileText size={16} className="text-blue-600" />}
              iconBg="bg-blue-50"
              label="Articles"
              value={stats.content.total_articles}
              secondary={`${stats.content.published_articles} published`}
              secondaryColor="text-emerald-500"
            />
            <StatCard
              icon={<Eye size={16} className="text-indigo-600" />}
              iconBg="bg-indigo-50"
              label="Traffic (30d)"
              value={stats.traffic.total_page_views.toLocaleString()}
              secondary={`${stats.traffic.total_visitors.toLocaleString()} visitors`}
            />
            <StatCard
              icon={<Magnet size={16} className="text-rose-600" />}
              iconBg="bg-rose-50"
              label="Leads"
              value={stats.leads.total_leads}
              secondary={`+${stats.leads.new_leads_30d} last 30d`}
              secondaryColor="text-emerald-500"
            />
            <StatCard
              icon={<Search size={16} className="text-orange-600" />}
              iconBg="bg-orange-50"
              label="Keywords"
              value={stats.keywords.total_keywords}
              secondary={stats.keywords.avg_position > 0 ? `Avg pos: ${stats.keywords.avg_position}` : 'No data'}
            />
            <StatCard
              icon={<GitBranch size={16} className="text-violet-600" />}
              iconBg="bg-violet-50"
              label="Funnels"
              value={stats.funnels.active_funnels}
              secondary={`${stats.funnels.total_funnel_events} events (30d)`}
            />
            <StatCard
              icon={<Cpu size={16} className="text-slate-600" />}
              iconBg="bg-slate-50"
              label="AI Cost (30d)"
              value={`$${stats.ai_usage.estimated_cost_30d.toFixed(2)}`}
              secondary={`${stats.ai_usage.total_tokens_30d.toLocaleString()} tokens`}
            />
          </div>

          {/* Traffic Chart */}
          {stats.traffic.views_trend.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-8">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Traffic — Last 30 Days</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.traffic.views_trend}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickFormatter={(v: string) => v.slice(5)} // MM-DD
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="#6366f1"
                      fillOpacity={1}
                      fill="url(#colorViews)"
                      name="Page Views"
                    />
                    <Area
                      type="monotone"
                      dataKey="visitors"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorVisitors)"
                      name="Visitors"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Detail Sections — 3 columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Content Column */}
            <div className="space-y-4">
              <DetailCard
                title="Content"
                items={[
                  { label: 'Total Articles', value: stats.content.total_articles },
                  { label: 'Published', value: stats.content.published_articles, color: 'text-emerald-600' },
                  { label: 'Drafts', value: stats.content.draft_articles, color: 'text-amber-600' },
                  { label: 'WP Posts', value: stats.content.total_wp_posts },
                  { label: 'Total Words', value: stats.content.total_word_count.toLocaleString() },
                ]}
              />
              <DetailCard
                title="SEO Health"
                items={[
                  { label: 'Avg SEO Score', value: stats.content.avg_seo_score > 0 ? `${stats.content.avg_seo_score}%` : '—' },
                  { label: 'Below 80%', value: stats.content.low_seo_articles, color: stats.content.low_seo_articles > 0 ? 'text-red-500' : 'text-gray-900' },
                ]}
              />
            </div>

            {/* Leads Column */}
            <div className="space-y-4">
              <DetailCard
                title="Leads"
                items={[
                  { label: 'Total Leads', value: stats.leads.total_leads },
                  { label: 'New (30d)', value: `+${stats.leads.new_leads_30d}`, color: 'text-emerald-600' },
                  { label: 'Forms', value: stats.leads.total_forms },
                  { label: 'Submissions', value: stats.leads.total_submissions },
                  { label: 'Magnets', value: stats.leads.total_magnets },
                  { label: 'Downloads', value: stats.leads.total_downloads },
                ]}
              />
              {stats.leads.leads_by_stage.length > 0 && (
                <DetailCard
                  title="Leads by Stage"
                  items={stats.leads.leads_by_stage.map((s: any) => ({
                    label: s.stage.charAt(0).toUpperCase() + s.stage.slice(1),
                    value: s.count,
                  }))}
                />
              )}
            </div>

            {/* Performance Column */}
            <div className="space-y-4">
              <DetailCard
                title="Keywords"
                items={[
                  { label: 'Tracked', value: stats.keywords.total_keywords },
                  { label: 'Avg Position', value: stats.keywords.avg_position || '—' },
                  { label: 'Improved', value: stats.keywords.improved, color: 'text-emerald-600' },
                  { label: 'Declined', value: stats.keywords.declined, color: 'text-red-500' },
                ]}
              />
              <DetailCard
                title="Funnels"
                items={[
                  { label: 'Total', value: stats.funnels.total_funnels },
                  { label: 'Active', value: stats.funnels.active_funnels, color: 'text-emerald-600' },
                  { label: 'Events (30d)', value: stats.funnels.total_funnel_events },
                ]}
              />
              <DetailCard
                title="Landing Pages"
                items={[
                  { label: 'Sites', value: stats.landing.total_sites },
                  { label: 'Pages', value: stats.landing.total_pages },
                  { label: 'Published', value: stats.landing.published_pages, color: 'text-emerald-600' },
                ]}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
