'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useMessages, useSendMessage } from '@/hooks/useAnyChat'
import type { ChatMessage } from '@/types'

interface ChatMessageListProps {
  channelId: string
  channelName?: string
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ApprovalBadge({ metadata }: { metadata: Record<string, any> }) {
  if (metadata?.approved === true) {
    return <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle size={12} /> Approved</span>
  }
  if (metadata?.approved === false) {
    return <span className="inline-flex items-center gap-1 text-xs text-red-500"><XCircle size={12} /> Rejected</span>
  }
  return <span className="inline-flex items-center gap-1 text-xs text-amber-500"><Clock size={12} /> Pending</span>
}

export default function ChatMessageList({ channelId, channelName }: ChatMessageListProps) {
  const { data: messages = [], isLoading } = useMessages(channelId)
  const sendMutation = useSendMessage()
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    if (!draft.trim() || sendMutation.isPending) return
    await sendMutation.mutateAsync({ channel_id: channelId, text: draft.trim() })
    setDraft('')
  }

  // Show messages in chronological order (oldest first)
  const sorted = [...messages].reverse()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">{channelName || 'Messages'}</h3>
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Bot size={40} className="mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Send a test message or set up notification rules</p>
          </div>
        )}

        {sorted.map((msg: ChatMessage) => {
          const isOutbound = msg.direction === 'outbound'
          const isApproval = msg.message_type === 'approval_request' || msg.message_type === 'approval_response'

          return (
            <div
              key={msg.id}
              className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${isOutbound ? 'order-2' : 'order-1'}`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                    isOutbound
                      ? 'bg-blue-500 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
                <div className={`flex items-center gap-2 mt-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
                  {msg.message_type !== 'text' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      msg.message_type === 'report' ? 'bg-purple-100 text-purple-600' :
                      msg.message_type === 'approval_request' ? 'bg-amber-100 text-amber-600' :
                      msg.message_type === 'approval_response' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {msg.message_type.replace('_', ' ')}
                    </span>
                  )}
                  {isApproval && <ApprovalBadge metadata={msg.metadata} />}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sendMutation.isPending}
            className="px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
