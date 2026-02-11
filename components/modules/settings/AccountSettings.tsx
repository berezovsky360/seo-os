'use client'

import React, { useState, useEffect } from 'react'
import {
  ChevronLeft, User, Shield, Monitor, Clock, Key, Trash2,
  AlertTriangle, Loader2, Smartphone, Globe, CheckCircle2,
  Laptop, X,
} from 'lucide-react'
import type { ViewState } from '@/types'
import { useAuth } from '@/lib/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'

interface AccountSettingsProps {
  onBack?: () => void
  onChangeView?: (view: ViewState) => void
}

// ====== Section Card wrapper ======

function Section({ title, icon: Icon, children, danger }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <div className={`bg-white rounded-2xl border ${danger ? 'border-red-200' : 'border-gray-200'} shadow-sm overflow-hidden`}>
      <div className={`flex items-center gap-3 px-6 py-4 border-b ${danger ? 'border-red-100 bg-red-50/50' : 'border-gray-100'}`}>
        <Icon size={18} className={danger ? 'text-red-500' : 'text-gray-700'} />
        <h2 className={`text-sm font-bold ${danger ? 'text-red-900' : 'text-gray-900'}`}>{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ====== Component ======

export default function AccountSettings({ onBack, onChangeView }: AccountSettingsProps) {
  const { user } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  // Login history & sessions state
  const [loginHistory, setLoginHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  // Pre-populate from user metadata
  useEffect(() => {
    if (user?.user_metadata) {
      setFirstName(user.user_metadata.first_name || '')
      setLastName(user.user_metadata.last_name || '')
    }
  }, [user])

  // Fetch login history
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/auth/login-history')
        if (res.ok) {
          const data = await res.json()
          setLoginHistory(data.history || [])
        }
      } catch { /* ignore */ }
      setHistoryLoading(false)
    }
    fetchHistory()
  }, [])

  // Fetch active sessions
  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/auth/sessions')
        if (res.ok) {
          const data = await res.json()
          setSessions(data.sessions || [])
        }
      } catch { /* ignore */ }
      setSessionsLoading(false)
    }
    fetchSessions()
  }, [])

  const handleSaveProfile = async () => {
    setSaving(true)
    setSaveMsg(null)
    const { error } = await supabase.auth.updateUser({
      data: { first_name: firstName, last_name: lastName }
    })
    setSaving(false)
    if (error) {
      setSaveMsg({ type: 'error', text: error.message })
    } else {
      setSaveMsg({ type: 'success', text: 'Profile updated successfully' })
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  const handleResetPassword = async () => {
    if (!user?.email) return
    setResetError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(user.email)
    if (error) {
      setResetError(error.message)
    } else {
      setResetSent(true)
      setTimeout(() => setResetSent(false), 5000)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId)
    try {
      const res = await fetch(`/api/auth/sessions?id=${sessionId}`, { method: 'DELETE' })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
      }
    } catch { /* ignore */ }
    setRevokingId(null)
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Standard header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-5 bg-[#F5F5F7] border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <>
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
              >
                <ChevronLeft size={14} />
                Back
              </button>
              <div className="h-4 w-px bg-gray-300" />
            </>
          )}
          <User size={20} className="text-gray-900" />
          <h1 className="text-lg font-bold text-gray-900">Account Settings</h1>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">

        {/* ====== Profile ====== */}
        <Section title="Profile" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-black transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Save Changes
            </button>
            {saveMsg && (
              <span className={`text-xs font-medium ${saveMsg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                {saveMsg.text}
              </span>
            )}
          </div>
        </Section>

        {/* ====== Security ====== */}
        <Section title="Security" icon={Shield}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Password</p>
              <p className="text-xs text-gray-500 mt-0.5">Send a password reset link to your email</p>
              {resetError && <p className="text-xs text-red-600 mt-1">{resetError}</p>}
            </div>
            <button
              onClick={handleResetPassword}
              disabled={resetSent}
              className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-colors ${
                resetSent
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {resetSent ? 'Email Sent!' : 'Reset Password'}
            </button>
          </div>
        </Section>

        {/* ====== Connected Devices ====== */}
        <Section title="Connected Devices" icon={Monitor}>
          {sessionsLoading ? (
            <div className="flex items-center gap-2 text-gray-400 py-4">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No active sessions found</p>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => {
                const DeviceIcon = session.device_name?.toLowerCase().includes('iphone') || session.device_name?.toLowerCase().includes('android')
                  ? Smartphone
                  : session.device_name?.toLowerCase().includes('firefox') || session.device_name?.toLowerCase().includes('windows')
                    ? Monitor
                    : Laptop
                return (
                  <div key={session.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <DeviceIcon size={18} className="text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{session.device_name}</p>
                        {session.is_current && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <Globe size={10} className="inline mr-1" />
                        {session.ip_address || 'Unknown IP'} &middot; {session.last_active_at ? new Date(session.last_active_at).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                    {!session.is_current && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingId === session.id}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {revokingId === session.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* ====== Login History ====== */}
        <Section title="Login History" icon={Clock}>
          {historyLoading ? (
            <div className="flex items-center gap-2 text-gray-400 py-4">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading history...</span>
            </div>
          ) : loginHistory.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No login history yet</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Date</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">IP Address</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 hidden sm:table-cell">Device</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((entry: any) => (
                    <tr key={entry.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 text-gray-700 font-medium whitespace-nowrap">
                        {new Date(entry.logged_in_at).toLocaleString()}
                      </td>
                      <td className="py-3 text-gray-500 font-mono text-xs">{entry.ip_address || '—'}</td>
                      <td className="py-3 text-gray-500 hidden sm:table-cell">{entry.device_label || '—'}</td>
                      <td className="py-3 text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          entry.status === 'success'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {entry.status === 'success' ? 'Success' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* ====== API Keys ====== */}
        <Section title="API Keys" icon={Key}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Service Integrations</p>
              <p className="text-xs text-gray-500 mt-0.5">Manage API keys for Gemini, DataForSEO, GSC, and more</p>
            </div>
            <button
              onClick={() => onChangeView?.('key-management' as ViewState)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              <Key size={14} />
              Manage Keys
            </button>
          </div>
        </Section>

        {/* ====== Danger Zone ====== */}
        <Section title="Danger Zone" icon={AlertTriangle} danger>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-900">Delete Account</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Your account can be recovered within 30 days after deletion.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 border border-red-200 transition-colors"
            >
              <Trash2 size={14} />
              Delete Account
            </button>
          </div>
        </Section>

        <div className="h-8" />
      </div>

      {/* ====== Delete Confirmation Modal ====== */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6 animate-[slideIn_250ms_ease-out]">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Account</h3>
            </div>

            <p className="text-sm text-gray-600 mb-2">
              This will permanently delete your account, all sites, articles, and settings.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              You have <span className="font-bold text-gray-900">30 days</span> to recover your account after deletion by contacting support.
            </p>

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Type DELETE to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition-all mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirmText !== 'DELETE'}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
