'use client'

import { Loader2, Users, Globe, FileText, Zap, TrendingUp, Newspaper, BarChart3 } from 'lucide-react'
import { useAdminStats } from '@/hooks/useAdmin'

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Users
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboardTab() {
  const { data: stats, isLoading } = useAdminStats()

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  const maxSignup = Math.max(...stats.signups_per_week.map(w => w.count), 1)

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.total_users}
          sub={`${stats.active_users_7d} active this week`}
          color="bg-indigo-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Active Users (30d)"
          value={stats.active_users_30d}
          sub={`${stats.total_users > 0 ? Math.round((stats.active_users_30d / stats.total_users) * 100) : 0}% of total`}
          color="bg-green-500"
        />
        <StatCard
          icon={Globe}
          label="Total Sites"
          value={stats.total_sites}
          sub={`~${stats.avg_sites_per_user} per user`}
          color="bg-blue-500"
        />
        <StatCard
          icon={FileText}
          label="Total Articles"
          value={stats.total_articles}
          color="bg-purple-500"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Newspaper}
          label="WP Posts Synced"
          value={stats.total_posts}
          color="bg-amber-500"
        />
        <StatCard
          icon={BarChart3}
          label="RSS Items Ingested"
          value={stats.total_content_items}
          color="bg-orange-500"
        />
        <StatCard
          icon={Zap}
          label="Swipe Decisions"
          value={stats.total_swipes}
          color="bg-pink-500"
        />
        <StatCard
          icon={Users}
          label="Avg Sites/User"
          value={stats.avg_sites_per_user}
          color="bg-cyan-500"
        />
      </div>

      {/* Signups chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Signups (last 8 weeks)</h3>
        <div className="flex items-end gap-2 h-32">
          {stats.signups_per_week.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-gray-500">{w.count}</span>
              <div
                className="w-full bg-indigo-400 rounded-t-md min-h-[4px] transition-all"
                style={{ height: `${(w.count / maxSignup) * 100}%` }}
              />
              <span className="text-[9px] text-gray-400">
                {new Date(w.week).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
