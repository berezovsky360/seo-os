'use client'

import { useState } from 'react'
import { Loader2, ChevronLeft, ChevronRight, Globe, Monitor, Shield } from 'lucide-react'
import { useAdminActivity } from '@/hooks/useAdmin'

export default function AdminActivityTab() {
  const [page, setPage] = useState(0)
  const { data: activity = [], isLoading } = useAdminActivity(page)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Login Activity (all users)
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-gray-400">Page {page + 1}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={activity.length < 50}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">IP</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Location</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Device</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activity.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {a.user_display_name || a.user_email?.split('@')[0] || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400 truncate max-w-[200px]">{a.user_email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-600">
                    {new Date(a.logged_in_at).toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500 font-mono">{a.ip_address || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  {(a.city || a.country) ? (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Globe size={10} />
                      {[a.city, a.country].filter(Boolean).join(', ')}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {a.device_label ? (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Monitor size={10} />
                      {a.device_label}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    a.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {activity.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Shield size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No login activity found</p>
          </div>
        )}
      </div>
    </div>
  )
}
