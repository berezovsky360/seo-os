'use client'

import { useState } from 'react'
import {
  ChevronLeft, MessageCircle, Radio, Bell, Plus,
  Loader2, Trash2, ToggleLeft, ToggleRight, Bot,
} from 'lucide-react'
import { useChannels, useDeleteChannel, useUpdateChannel } from '@/hooks/useAnyChat'
import ConnectTelegramModal from './ConnectTelegramModal'
import ChatMessageList from './ChatMessageList'
import NotificationRuleEditor from './NotificationRuleEditor'
import type { ChatChannel } from '@/types'

type Tab = 'channels' | 'messages' | 'rules'

interface AnyChatDashboardProps {
  onBack: () => void
  sites?: { id: string; name: string }[]
}

const PLATFORM_INFO: Record<string, { label: string; color: string; icon: string }> = {
  telegram: { label: 'Telegram', color: 'bg-blue-500', icon: '✈️' },
  slack: { label: 'Slack', color: 'bg-purple-500', icon: '💬' },
  discord: { label: 'Discord', color: 'bg-indigo-500', icon: '🎮' },
  whatsapp: { label: 'WhatsApp', color: 'bg-green-500', icon: '📱' },
  webchat: { label: 'Webchat', color: 'bg-gray-500', icon: '🌐' },
}

export default function AnyChatDashboard({ onBack, sites = [] }: AnyChatDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('channels')
  const [showConnectTelegram, setShowConnectTelegram] = useState(false)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)

  const { data: channels = [], isLoading } = useChannels()
  const deleteChannel = useDeleteChannel()
  const updateChannel = useUpdateChannel()

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'channels', label: 'Channels', icon: <Radio size={14} /> },
    { id: 'messages', label: 'Messages', icon: <MessageCircle size={14} /> },
    { id: 'rules', label: 'Rules', icon: <Bell size={14} /> },
  ]

  const selectedChannel = channels.find((c: ChatChannel) => c.id === selectedChannelId)

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle size={20} className="text-emerald-500" />
                Any Chat
              </h1>
              <p className="text-xs text-gray-400">Notifications, reports & human-in-the-loop approvals</p>
            </div>
          </div>

          {activeTab === 'channels' && (
            <button
              onClick={() => setShowConnectTelegram(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium rounded-xl hover:shadow-lg transition-all"
            >
              <Plus size={14} />
              Connect Telegram
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 -mb-[1px]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border border-b-0 ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 border-gray-200'
                  : 'text-gray-400 hover:text-gray-600 border-transparent hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Channels Tab */}
          {activeTab === 'channels' && (
            <div className="space-y-3">
              {isLoading && (
                <div className="flex items-center justify-center h-32">
                  <Loader2 size={24} className="text-gray-400 animate-spin" />
                </div>
              )}

              {!isLoading && channels.length === 0 && (
                <div className="text-center py-12">
                  <Bot size={48} className="mx-auto mb-3 text-gray-300" />
                  <h3 className="text-sm font-semibold text-gray-600">No channels connected</h3>
                  <p className="text-xs text-gray-400 mt-1">Connect a Telegram bot to start receiving notifications</p>
                  <button
                    onClick={() => setShowConnectTelegram(true)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    <Plus size={14} />
                    Connect Telegram
                  </button>
                </div>
              )}

              {channels.map((channel: ChatChannel) => {
                const platform = PLATFORM_INFO[channel.platform] || PLATFORM_INFO.webchat
                const isConfigured = !!channel.platform_chat_id

                return (
                  <div
                    key={channel.id}
                    className={`flex items-center gap-4 px-5 py-4 bg-white rounded-xl border transition-all ${
                      channel.is_active ? 'border-gray-200 hover:shadow-sm' : 'border-gray-100 opacity-60'
                    }`}
                  >
                    {/* Platform icon */}
                    <div className={`w-10 h-10 ${platform.color} rounded-xl flex items-center justify-center text-white text-lg`}>
                      {platform.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-800 truncate">
                          {channel.channel_name || platform.label}
                        </h3>
                        {channel.metadata?.bot_username && (
                          <span className="text-xs text-gray-400">@{channel.metadata.bot_username}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        <span className="text-xs text-gray-400">
                          {isConfigured ? 'Connected' : 'Waiting for /start'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {isConfigured && (
                        <button
                          onClick={() => {
                            setSelectedChannelId(channel.id)
                            setActiveTab('messages')
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          Messages
                        </button>
                      )}

                      <button
                        onClick={() => updateChannel.mutate({ channelId: channel.id, is_active: !channel.is_active })}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {channel.is_active ? (
                          <ToggleRight size={20} className="text-emerald-500" />
                        ) : (
                          <ToggleLeft size={20} />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          if (confirm('Delete this channel? All messages and rules will be removed.')) {
                            deleteChannel.mutate(channel.id)
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div>
              {channels.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <MessageCircle size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Connect a channel first to see messages</p>
                </div>
              ) : (
                <div>
                  {/* Channel selector if multiple */}
                  {channels.length > 1 && (
                    <div className="mb-4 flex gap-2">
                      {channels.filter((c: ChatChannel) => !!c.platform_chat_id).map((ch: ChatChannel) => (
                        <button
                          key={ch.id}
                          onClick={() => setSelectedChannelId(ch.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            selectedChannelId === ch.id
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {ch.channel_name || ch.platform}
                        </button>
                      ))}
                    </div>
                  )}

                  {(selectedChannelId || channels[0]?.id) && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <ChatMessageList
                        channelId={selectedChannelId || channels[0].id}
                        channelName={
                          (selectedChannel || channels[0])?.channel_name || 'Messages'
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Rules Tab */}
          {activeTab === 'rules' && (
            <NotificationRuleEditor sites={sites} />
          )}
        </div>
      </div>

      {/* Connect Telegram Modal */}
      <ConnectTelegramModal
        isOpen={showConnectTelegram}
        onClose={() => setShowConnectTelegram(false)}
      />
    </div>
  )
}
