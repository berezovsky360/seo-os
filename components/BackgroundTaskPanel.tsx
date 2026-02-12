'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBackgroundTasks } from '@/lib/contexts/BackgroundTaskContext'
import type { BackgroundTask } from '@/lib/core/events'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronUp,
  ChevronDown,
  X,
  Trash2,
  ExternalLink,
} from 'lucide-react'

function formatElapsed(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}

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

function TaskRow({ task, onDismiss }: { task: BackgroundTask; onDismiss: () => void }) {
  const timeRef = task.started_at || task.created_at

  return (
    <div className="px-3 py-2.5 border-b border-gray-100 last:border-0 group">
      <div className="flex items-start gap-2">
        <StatusIcon status={task.status} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{formatElapsed(timeRef)}</span>
            {task.status === 'failed' && task.error && (
              <span className="text-xs text-red-500 truncate">{task.error}</span>
            )}
          </div>
          {task.status === 'running' && (
            <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-gray-500 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function PanelContent() {
  const { tasks, activeCount, hasRunning, dismissTask, clearCompleted, isExpanded, setIsExpanded } =
    useBackgroundTasks()

  // Don't render at all if no tasks
  if (tasks.length === 0) return null

  const completedCount = tasks.filter((t) => t.status === 'completed' || t.status === 'failed').length

  const failedCount = tasks.filter((t) => t.status === 'failed').length

  // Collapsed badge
  if (!isExpanded) {
    const hasFailed = failedCount > 0
    return (
      <div className="fixed bottom-6 right-6 md:bottom-6 md:right-6 max-md:bottom-20 max-md:left-4 max-md:right-4 z-[55]">
        <button
          onClick={() => setIsExpanded(true)}
          className={`w-full md:w-auto flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-lg border hover:shadow-xl transition-shadow ${
            hasFailed ? 'border-red-200' : 'border-gray-200'
          }`}
        >
          {hasRunning ? (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          ) : hasFailed ? (
            <XCircle className="w-4 h-4 text-red-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          )}
          <span className="text-sm font-medium text-gray-700">
            {activeCount > 0
              ? `${activeCount} task${activeCount > 1 ? 's' : ''} running`
              : hasFailed
                ? `${failedCount} task${failedCount > 1 ? 's' : ''} failed`
                : 'Tasks done'}
          </span>
          <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" />
        </button>
      </div>
    )
  }

  // Expanded panel
  return (
    <div className="fixed bottom-6 right-6 md:bottom-6 md:right-6 max-md:bottom-0 max-md:left-0 max-md:right-0 z-[55] animate-slide-up">
      <div className="md:w-80 bg-white rounded-xl md:rounded-xl max-md:rounded-t-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {hasRunning && <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
            <span className="text-sm font-semibold text-gray-700">
              Background Tasks
              {activeCount > 0 && (
                <span className="ml-1.5 text-xs font-normal text-gray-400">
                  ({activeCount} active)
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setIsExpanded(false)
                window.dispatchEvent(new CustomEvent('navigate-view', { detail: 'task-history' }))
              }}
              className="px-2 py-0.5 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="View full history"
            >
              View All
            </button>
            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear completed"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Collapse"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Task list */}
        <div className="max-h-[400px] max-md:max-h-[60vh] overflow-y-auto">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onDismiss={() => dismissTask(task.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function BackgroundTaskPanel() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(<PanelContent />, document.body)
}
