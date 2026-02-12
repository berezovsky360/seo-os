'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  ChevronLeft, Loader2, CheckCircle2, XCircle, Clock,
  Trash2, Filter, RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import type { BackgroundTask } from '@/lib/core/events'

interface TaskHistoryProps {
  onBack: () => void
}

type FilterStatus = 'all' | 'completed' | 'failed' | 'running'

function StatusIcon({ status }: { status: BackgroundTask['status'] }) {
  switch (status) {
    case 'queued':
      return <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
    case 'running':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
  }
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return '—'
  const start = new Date(startedAt).getTime()
  const end = completedAt ? new Date(completedAt).getTime() : Date.now()
  const diffSec = Math.floor((end - start) / 1000)
  if (diffSec < 60) return `${diffSec}s`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ${diffSec % 60}s`
  return `${Math.floor(diffSec / 3600)}h ${Math.floor((diffSec % 3600) / 60)}m`
}

function formatTaskType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

export default function TaskHistory({ onBack }: TaskHistoryProps) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<BackgroundTask[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [page, setPage] = useState(0)
  const limit = 50

  const fetchTasks = async () => {
    if (!user?.id) return
    setLoading(true)

    let query = supabase
      .from('background_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1)

    if (filterStatus === 'completed') {
      query = query.eq('status', 'completed')
    } else if (filterStatus === 'failed') {
      query = query.eq('status', 'failed')
    } else if (filterStatus === 'running') {
      query = query.in('status', ['queued', 'running'])
    }

    const { data } = await query
    setTasks(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [user?.id, filterStatus, page]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime updates
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel('task-history-live')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'background_tasks',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const updated = payload.new as BackgroundTask
        if (payload.eventType === 'INSERT') {
          setTasks(prev => [updated, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  const handleDelete = async (taskId: string) => {
    await supabase.from('background_tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const handleClearAll = async () => {
    if (!user?.id) return
    if (!window.confirm('Delete all completed and failed tasks?')) return
    await supabase
      .from('background_tasks')
      .delete()
      .eq('user_id', user.id)
      .in('status', ['completed', 'failed'])
    fetchTasks()
  }

  const stats = useMemo(() => {
    const running = tasks.filter(t => t.status === 'queued' || t.status === 'running').length
    const completed = tasks.filter(t => t.status === 'completed').length
    const failed = tasks.filter(t => t.status === 'failed').length
    return { running, completed, failed, total: tasks.length }
  }, [tasks])

  const FILTERS: { id: FilterStatus; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'running', label: 'Active', count: stats.running },
    { id: 'completed', label: 'Completed', count: stats.completed },
    { id: 'failed', label: 'Failed', count: stats.failed },
  ]

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 bg-[#F5F5F7] border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <div className="h-4 w-px bg-gray-300" />
          <Clock size={20} className="text-gray-900" />
          <h1 className="text-lg font-bold text-gray-900">Task History</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTasks()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          {(stats.completed > 0 || stats.failed > 0) && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={13} />
              Clear History
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 bg-white border-b border-gray-200 flex items-center gap-2">
        <Filter size={14} className="text-gray-400" />
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => { setFilterStatus(f.id); setPage(0); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterStatus === f.id
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f.label}
            {f.count != null && f.count > 0 && (
              <span className={`ml-1.5 ${filterStatus === f.id ? 'text-gray-300' : 'text-gray-400'}`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock size={40} className="text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-500">No tasks found</p>
            <p className="text-xs text-gray-400 mt-1">
              {filterStatus !== 'all' ? 'Try a different filter' : 'Background tasks will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map(task => (
              <div
                key={task.id}
                className="px-4 sm:px-6 lg:px-8 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <StatusIcon status={task.status} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{task.title}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        task.status === 'completed' ? 'bg-green-100 text-green-700'
                        : task.status === 'failed' ? 'bg-red-100 text-red-700'
                        : task.status === 'running' ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {task.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-medium">
                        {formatTaskType(task.task_type)}
                      </span>
                      <span>{new Date(task.created_at).toLocaleString()}</span>
                      <span>Duration: {formatDuration(task.started_at, task.completed_at)}</span>
                      {task.progress > 0 && task.progress < 100 && (
                        <span>{task.progress}%</span>
                      )}
                    </div>

                    {/* Error message */}
                    {task.status === 'failed' && task.error && (
                      <div className="mt-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                        <p className="text-xs text-red-600">{task.error}</p>
                      </div>
                    )}

                    {/* Result summary */}
                    {task.status === 'completed' && task.result && Object.keys(task.result).length > 0 && (
                      <div className="mt-2 px-3 py-2 bg-green-50 border border-green-100 rounded-lg">
                        <div className="flex flex-wrap gap-3 text-xs text-green-700">
                          {Object.entries(task.result).map(([key, val]) => (
                            <span key={key}>
                              <span className="text-green-500">{key.replace(/_/g, ' ')}:</span>{' '}
                              <span className="font-semibold">{typeof val === 'object' ? JSON.stringify(val).slice(0, 50) : String(val)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Progress bar for running tasks */}
                    {task.status === 'running' && (
                      <div className="mt-2 w-full max-w-xs bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  {(task.status === 'completed' || task.status === 'failed') && (
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {tasks.length >= limit && (
          <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-100">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-xs text-gray-400">Page {page + 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
