'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import type { BackgroundTask } from '@/lib/core/events'

interface BackgroundTaskContextType {
  tasks: BackgroundTask[]
  activeCount: number
  failedCount: number
  hasRunning: boolean
  dismissTask: (id: string) => void
  clearCompleted: () => void
  isExpanded: boolean
  setIsExpanded: (v: boolean) => void
}

const BackgroundTaskContext = createContext<BackgroundTaskContextType | undefined>(undefined)

export function BackgroundTaskProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<BackgroundTask[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [isExpanded, setIsExpanded] = useState(false)
  const autoCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevActiveCount = useRef(0)

  // Initial fetch: queued/running + last 24h completed/failed
  useEffect(() => {
    if (!user?.id) return

    const fetchTasks = async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      // Active tasks (no time filter)
      const { data: active } = await supabase
        .from('background_tasks')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['queued', 'running'])
        .order('created_at', { ascending: false })

      // Recently finished tasks
      const { data: finished } = await supabase
        .from('background_tasks')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['completed', 'failed'])
        .gte('completed_at', oneDayAgo)
        .order('completed_at', { ascending: false })
        .limit(20)

      const all = [...(active || []), ...(finished || [])]
      setTasks(all)
    }

    fetchTasks()
  }, [user?.id])

  // Realtime: INSERT + UPDATE on background_tasks
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('background-tasks')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'background_tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newTask = payload.new as BackgroundTask
          setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)])
          setIsExpanded(true) // auto-expand on new task
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'background_tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as BackgroundTask
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Auto-collapse 3s after all tasks finish
  const activeCount = useMemo(
    () => tasks.filter((t) => t.status === 'queued' || t.status === 'running').length,
    [tasks]
  )

  useEffect(() => {
    if (autoCollapseTimer.current) {
      clearTimeout(autoCollapseTimer.current)
      autoCollapseTimer.current = null
    }

    // Transition from active → no active
    if (prevActiveCount.current > 0 && activeCount === 0) {
      autoCollapseTimer.current = setTimeout(() => {
        setIsExpanded(false)
      }, 3000)
    }

    prevActiveCount.current = activeCount

    return () => {
      if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current)
    }
  }, [activeCount])

  const dismissTask = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id))
  }, [])

  const clearCompleted = useCallback(() => {
    setDismissed((prev) => {
      const next = new Set(prev)
      for (const t of tasks) {
        if (t.status === 'completed' || t.status === 'failed') {
          next.add(t.id)
        }
      }
      return next
    })
  }, [tasks])

  const visibleTasks = useMemo(
    () => tasks.filter((t) => !dismissed.has(t.id)),
    [tasks, dismissed]
  )

  const hasRunning = useMemo(
    () => tasks.some((t) => t.status === 'running'),
    [tasks]
  )

  const failedCount = useMemo(
    () => visibleTasks.filter((t) => t.status === 'failed').length,
    [visibleTasks]
  )

  const value: BackgroundTaskContextType = {
    tasks: visibleTasks,
    activeCount,
    failedCount,
    hasRunning,
    dismissTask,
    clearCompleted,
    isExpanded,
    setIsExpanded,
  }

  return (
    <BackgroundTaskContext.Provider value={value}>
      {children}
    </BackgroundTaskContext.Provider>
  )
}

export function useBackgroundTasks() {
  const context = useContext(BackgroundTaskContext)
  if (context === undefined) {
    throw new Error('useBackgroundTasks must be used within a BackgroundTaskProvider')
  }
  return context
}
