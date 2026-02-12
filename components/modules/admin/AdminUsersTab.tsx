'use client'

import { useState } from 'react'
import { Loader2, Shield, ShieldCheck, User, Globe, Monitor, Clock, Search } from 'lucide-react'
import { useAdminUsers, useUpdateUserRole, type AdminUser } from '@/hooks/useAdmin'

const ROLE_STYLES: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700',
  admin: 'bg-blue-100 text-blue-700',
  user: 'bg-gray-100 text-gray-600',
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  user: 'User',
}

function timeAgo(date: string): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const hours = Math.floor(diffMs / 3600000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export default function AdminUsersTab() {
  const { data: users = [], isLoading } = useAdminUsers()
  const updateRole = useUpdateUserRole()
  const [search, setSearch] = useState('')
  const [editingRole, setEditingRole] = useState<string | null>(null)

  const filtered = users.filter(u =>
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRole.mutate({ userId, role: newRole }, {
      onSuccess: () => setEditingRole(null),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users by email or name..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
        />
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
        <span className="text-gray-300">|</span>
        <span>{users.filter(u => u.role === 'super_admin').length} super admins</span>
        <span>{users.filter(u => u.role === 'admin').length} admins</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Sites</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Last Login</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(user => (
              <UserRow
                key={user.id}
                user={user}
                isEditingRole={editingRole === user.id}
                onStartEdit={() => setEditingRole(user.id)}
                onCancelEdit={() => setEditingRole(null)}
                onRoleChange={(role) => handleRoleChange(user.id, role)}
                isUpdating={updateRole.isPending}
              />
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <User size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No users found</p>
          </div>
        )}
      </div>
    </div>
  )
}

function UserRow({
  user, isEditingRole, onStartEdit, onCancelEdit, onRoleChange, isUpdating,
}: {
  user: AdminUser
  isEditingRole: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onRoleChange: (role: string) => void
  isUpdating: boolean
}) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.avatar_emoji || (user.display_name || user.email || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.display_name || user.email?.split('@')[0]}
            </p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {isEditingRole ? (
          <div className="flex items-center gap-1">
            <select
              defaultValue={user.role}
              onChange={e => onRoleChange(e.target.value)}
              disabled={isUpdating}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white disabled:opacity-50"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <button onClick={onCancelEdit} className="text-xs text-gray-400 hover:text-gray-600 px-1">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={onStartEdit}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_STYLES[user.role] || ROLE_STYLES.user}`}
          >
            {user.role === 'super_admin' ? <ShieldCheck size={11} /> : user.role === 'admin' ? <Shield size={11} /> : null}
            {ROLE_LABELS[user.role] || user.role}
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-700 font-medium">{user.sites_count}</span>
      </td>
      <td className="px-4 py-3">
        {user.last_login ? (
          <div className="space-y-0.5">
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <Clock size={10} />
              {timeAgo(user.last_login.at)}
            </p>
            {user.last_login.location && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Globe size={10} />
                {user.last_login.location}
              </p>
            )}
            {user.last_login.device && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Monitor size={10} />
                {user.last_login.device}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">Never</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-500">
          {new Date(user.created_at).toLocaleDateString()}
        </span>
      </td>
    </tr>
  )
}
