'use client'

import React, { useState } from 'react'
import {
  ChevronLeft, Send, Plus, ExternalLink, RefreshCw, Eye,
  Loader2, User, Globe, FileText, X,
} from 'lucide-react'
import {
  useTelegraphAccounts,
  useCreateTelegraphAccount,
  useTelegraphPages,
  usePublishToTelegraph,
  useRefreshTelegraphViews,
  TelegraphAccountRecord,
} from '@/hooks/useTelegraph'
import { useToast } from '@/lib/contexts/ToastContext'

interface TelegraphDashboardProps {
  onBack: () => void
}

export default function TelegraphDashboard({ onBack }: TelegraphDashboardProps) {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'pages' | 'accounts'>('pages')
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [showQuickPublish, setShowQuickPublish] = useState(false)

  // Hooks
  const { data: accounts = [], isLoading: accountsLoading } = useTelegraphAccounts()
  const { data: pages = [], isLoading: pagesLoading } = useTelegraphPages()
  const createAccount = useCreateTelegraphAccount()
  const publishMutation = usePublishToTelegraph()
  const refreshViews = useRefreshTelegraphViews()

  // Create account form
  const [shortName, setShortName] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [authorUrl, setAuthorUrl] = useState('')

  // Quick publish form
  const [publishTitle, setPublishTitle] = useState('')
  const [publishContent, setPublishContent] = useState('')
  const [publishAccountId, setPublishAccountId] = useState('')

  const handleCreateAccount = async () => {
    if (!shortName.trim()) return
    try {
      await createAccount.mutateAsync({
        short_name: shortName.trim(),
        author_name: authorName.trim() || undefined,
        author_url: authorUrl.trim() || undefined,
      })
      toast.success('Telegraph account created')
      setShowCreateAccount(false)
      setShortName('')
      setAuthorName('')
      setAuthorUrl('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create account')
    }
  }

  const handlePublish = async () => {
    if (!publishTitle.trim() || !publishContent.trim() || !publishAccountId) return
    try {
      const result = await publishMutation.mutateAsync({
        account_id: publishAccountId,
        title: publishTitle.trim(),
        html_content: `<p>${publishContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`,
      })
      toast.success('Published to Telegraph')
      setShowQuickPublish(false)
      setPublishTitle('')
      setPublishContent('')
      if (result.page?.url) {
        window.open(result.page.url, '_blank')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish')
    }
  }

  const handleRefreshViews = async () => {
    try {
      await refreshViews.mutateAsync()
      toast.success('Views refreshed')
    } catch {
      toast.error('Failed to refresh views')
    }
  }

  const getSourceBadge = (page: any) => {
    if (page.source_item_id) return { label: 'Content Lots', color: 'bg-orange-100 text-orange-700' }
    if (page.source_article_id) return { label: 'Pipeline', color: 'bg-purple-100 text-purple-700' }
    return { label: 'Manual', color: 'bg-gray-100 text-gray-600' }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-5 bg-[#F5F5F7] border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <div className="h-4 w-px bg-gray-300" />
          <Send size={20} className="text-sky-600" />
          <h1 className="text-lg font-bold text-gray-900">Telegraph</h1>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {pages.length} pages
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (accounts.length === 0) {
                toast.error('Create an account first')
                setActiveTab('accounts')
                setShowCreateAccount(true)
                return
              }
              setPublishAccountId(accounts[0].id)
              setShowQuickPublish(true)
            }}
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            <Plus size={14} />
            Publish
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
          <button
            onClick={() => setActiveTab('pages')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'pages'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pages
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'accounts'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Accounts
          </button>
        </div>

        {/* ====== Pages Tab ====== */}
        {activeTab === 'pages' && (
          <div>
            {/* Refresh button */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-700">Published Pages</h2>
              <button
                onClick={handleRefreshViews}
                disabled={refreshViews.isPending}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={refreshViews.isPending ? 'animate-spin' : ''} />
                Refresh views
              </button>
            </div>

            {pagesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-gray-300 animate-spin" />
              </div>
            ) : pages.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                <FileText size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No pages published yet</p>
                <p className="text-xs text-gray-400 mt-1">Create an account and publish your first article</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Title</th>
                      <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Views</th>
                      <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Source</th>
                      <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Published</th>
                      <th className="text-right text-xs font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map(page => {
                      const badge = getSourceBadge(page)
                      return (
                        <tr key={page.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-900 line-clamp-1">{page.title}</span>
                            <span className="text-xs text-gray-400 block truncate">{page.url}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Eye size={12} className="text-gray-400" />
                              <span className="text-sm font-medium text-gray-700">{page.views}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.color}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-500">{formatDate(page.created_at)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
                            >
                              Open
                              <ExternalLink size={11} />
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ====== Accounts Tab ====== */}
        {activeTab === 'accounts' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-700">Telegraph Accounts</h2>
              <button
                onClick={() => setShowCreateAccount(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={12} />
                Create Account
              </button>
            </div>

            {accountsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-gray-300 animate-spin" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                <User size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No accounts yet</p>
                <p className="text-xs text-gray-400 mt-1">Create your first Telegraph account to start publishing</p>
                <button
                  onClick={() => setShowCreateAccount(true)}
                  className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 px-4 py-2 rounded-xl shadow-sm transition-colors mx-auto"
                >
                  <Plus size={14} />
                  Create Account
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map(account => (
                  <div
                    key={account.id}
                    className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
                        <Send size={18} className="text-sky-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{account.short_name}</h3>
                        {account.author_name && (
                          <p className="text-xs text-gray-400">{account.author_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {account.page_count} {account.page_count === 1 ? 'page' : 'pages'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(account.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Account Modal */}
      {showCreateAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateAccount(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Create Telegraph Account</h2>
              <button onClick={() => setShowCreateAccount(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Short Name *
                </label>
                <input
                  type="text"
                  value={shortName}
                  onChange={e => setShortName(e.target.value)}
                  placeholder="my-blog"
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-200 focus:border-sky-300 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Author Name
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-200 focus:border-sky-300 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Author URL
                </label>
                <input
                  type="text"
                  value={authorUrl}
                  onChange={e => setAuthorUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-200 focus:border-sky-300 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowCreateAccount(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAccount}
                disabled={!shortName.trim() || createAccount.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50"
              >
                {createAccount.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={14} />
                    Create
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Publish Modal */}
      {showQuickPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowQuickPublish(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Publish to Telegraph</h2>
              <button onClick={() => setShowQuickPublish(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Account
                </label>
                <select
                  value={publishAccountId}
                  onChange={e => setPublishAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-200 focus:border-sky-300 outline-none transition-all"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.short_name} {a.author_name ? `(${a.author_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  value={publishTitle}
                  onChange={e => setPublishTitle(e.target.value)}
                  placeholder="Article title"
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-200 focus:border-sky-300 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Content *
                </label>
                <textarea
                  value={publishContent}
                  onChange={e => setPublishContent(e.target.value)}
                  placeholder="Write your article content here..."
                  rows={8}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-200 focus:border-sky-300 outline-none transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowQuickPublish(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={!publishTitle.trim() || !publishContent.trim() || publishMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-xl hover:bg-sky-700 transition-colors disabled:opacity-50"
              >
                {publishMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Send size={14} />
                    Publish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
