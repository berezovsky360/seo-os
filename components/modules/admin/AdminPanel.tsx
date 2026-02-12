'use client'

import { useState } from 'react'
import { ChevronLeft, Users, BarChart3, Activity } from 'lucide-react'
import AdminUsersTab from './AdminUsersTab'
import AdminDashboardTab from './AdminDashboardTab'
import AdminActivityTab from './AdminActivityTab'

interface AdminPanelProps {
  onBack?: () => void
}

type Tab = 'users' | 'dashboard' | 'activity'

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('users')

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'activity', label: 'Activity', icon: Activity },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <>
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200"
              >
                <ChevronLeft size={14} />
                Back
              </button>
              <div className="h-4 w-px bg-gray-300" />
            </>
          )}
          <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
        </div>

        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'users' && <AdminUsersTab />}
        {activeTab === 'dashboard' && <AdminDashboardTab />}
        {activeTab === 'activity' && <AdminActivityTab />}
      </div>
    </div>
  )
}
