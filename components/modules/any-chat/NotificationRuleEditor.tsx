'use client'

import { useState } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Bell, BellOff } from 'lucide-react'
import { useNotificationRules, useCreateRule, useUpdateRule, useDeleteRule, useChannels } from '@/hooks/useAnyChat'
import type { ChatChannel } from '@/types'

// Common event patterns grouped by category
const PATTERN_SUGGESTIONS = [
  { label: 'All Events', value: '*' },
  { label: 'All Cron', value: 'cron.*' },
  { label: 'Cron Executed', value: 'cron.job_executed' },
  { label: 'Cron Failed', value: 'cron.job_failed' },
  { label: 'All Tasks', value: 'task.*' },
  { label: 'Task Completed', value: 'task.completed' },
  { label: 'Task Failed', value: 'task.failed' },
  { label: 'All Engine', value: 'engine.*' },
  { label: 'Article Published', value: 'engine.article_published' },
  { label: 'Pipeline Completed', value: 'engine.pipeline_completed' },
  { label: 'Pipeline Failed', value: 'engine.pipeline_failed' },
  { label: 'All Recipes', value: 'core.recipe_*' },
  { label: 'Recipe Completed', value: 'core.recipe_completed' },
  { label: 'Recipe Failed', value: 'core.recipe_failed' },
  { label: 'Rank Changes', value: 'rank.*' },
  { label: 'Position Dropped', value: 'rank.position_dropped' },
  { label: 'Bridge Sync', value: 'bridge.*' },
  { label: 'GSC Alerts', value: 'gsc.*' },
  { label: 'Approval Responses', value: 'chat.approval_responded' },
]

interface Props {
  sites?: { id: string; name: string }[]
}

export default function NotificationRuleEditor({ sites = [] }: Props) {
  const { data: rules = [], isLoading } = useNotificationRules()
  const { data: channels = [] } = useChannels()
  const createRule = useCreateRule()
  const updateRule = useUpdateRule()
  const deleteRule = useDeleteRule()

  const [showForm, setShowForm] = useState(false)
  const [newPattern, setNewPattern] = useState('')
  const [newChannelId, setNewChannelId] = useState('')
  const [newSiteId, setNewSiteId] = useState('')

  const activeChannels = channels.filter((c: ChatChannel) => c.is_active && c.platform_chat_id)

  const handleCreate = async () => {
    if (!newPattern.trim() || !newChannelId) return
    await createRule.mutateAsync({
      channel_id: newChannelId,
      event_pattern: newPattern.trim(),
      site_id: newSiteId || undefined,
    })
    setNewPattern('')
    setNewChannelId('')
    setNewSiteId('')
    setShowForm(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 size={20} className="text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Existing rules */}
      {rules.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-400">
          <Bell size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No notification rules yet</p>
          <p className="text-xs mt-1">Create a rule to receive event notifications via your chat channels</p>
        </div>
      )}

      {rules.map((rule: any) => (
        <div
          key={rule.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
            rule.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
          }`}
        >
          {/* Toggle */}
          <button
            onClick={() => updateRule.mutate({ ruleId: rule.id, enabled: !rule.enabled })}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {rule.enabled ? (
              <ToggleRight size={22} className="text-emerald-500" />
            ) : (
              <ToggleLeft size={22} />
            )}
          </button>

          {/* Pattern */}
          <div className="flex-1 min-w-0">
            <code className="text-sm font-mono text-gray-800">{rule.event_pattern}</code>
            <div className="flex items-center gap-2 mt-0.5">
              {rule.chat_channels && (
                <span className="text-[10px] text-gray-400">
                  {rule.chat_channels.platform} &middot; {rule.chat_channels.channel_name}
                </span>
              )}
              {rule.site_id && (
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded-full">
                  {sites.find(s => s.id === rule.site_id)?.name || 'Specific site'}
                </span>
              )}
            </div>
          </div>

          {/* Delete */}
          <button
            onClick={() => deleteRule.mutate(rule.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {/* New rule form */}
      {showForm && (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
          {/* Event pattern */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Event Pattern</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPattern}
                onChange={e => setNewPattern(e.target.value)}
                placeholder="cron.* or engine.article_published"
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all font-mono"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {PATTERN_SUGGESTIONS.slice(0, 8).map(s => (
                <button
                  key={s.value}
                  onClick={() => setNewPattern(s.value)}
                  className={`px-2 py-1 text-[10px] rounded-lg transition-colors ${
                    newPattern === s.value ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Channel */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Send To</label>
            <select
              value={newChannelId}
              onChange={e => setNewChannelId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
            >
              <option value="">Select channel...</option>
              {activeChannels.map((ch: ChatChannel) => (
                <option key={ch.id} value={ch.id}>
                  {ch.channel_name || ch.platform} ({ch.platform})
                </option>
              ))}
            </select>
          </div>

          {/* Site filter */}
          {sites.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Site Filter (optional)</label>
              <select
                value={newSiteId}
                onChange={e => setNewSiteId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
              >
                <option value="">All Sites</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowForm(false); setNewPattern(''); setNewChannelId(''); setNewSiteId('') }}
              className="flex-1 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newPattern.trim() || !newChannelId || createRule.isPending}
              className="flex-1 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {createRule.isPending ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </div>
      )}

      {/* Add rule button */}
      {!showForm && activeChannels.length > 0 && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-emerald-600 border border-dashed border-emerald-300 rounded-xl hover:bg-emerald-50 transition-colors"
        >
          <Plus size={16} />
          Add Notification Rule
        </button>
      )}

      {activeChannels.length === 0 && !showForm && (
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">Connect a channel first to create notification rules</p>
        </div>
      )}
    </div>
  )
}
