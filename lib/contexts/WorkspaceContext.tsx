'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import type { Workspace } from '@/types'

interface WorkspaceContextType {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  currentWorkspaceId: string | null
  isAllWorkspaces: boolean
  loading: boolean
  switchWorkspace: (workspaceId: string | null) => void
  createWorkspace: (name: string, emoji?: string) => Promise<Workspace | null>
  renameWorkspace: (id: string, name: string, emoji?: string) => Promise<void>
  deleteWorkspace: (id: string) => Promise<void>
  refetchWorkspaces: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  currentWorkspace: null,
  currentWorkspaceId: null,
  isAllWorkspaces: false,
  loading: true,
  switchWorkspace: () => {},
  createWorkspace: async () => null,
  renameWorkspace: async () => {},
  deleteWorkspace: async () => {},
  refetchWorkspaces: async () => {},
})

export const useWorkspace = () => useContext(WorkspaceContext)

function getStorageKey(userId: string) {
  return `seo-os-workspace-${userId}`
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || null
  const isAllWorkspaces = currentWorkspaceId === null && workspaces.length > 0

  // Fetch workspaces when user changes
  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([])
      setCurrentWorkspaceId(null)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch workspaces:', error)
      setLoading(false)
      return
    }

    const list = data || []
    setWorkspaces(list)

    // Restore from localStorage or fall back to default
    const stored = localStorage.getItem(getStorageKey(user.id))
    if (stored === '__all__') {
      setCurrentWorkspaceId(null)
    } else {
      const match = list.find(w => w.id === stored)
      if (match) {
        setCurrentWorkspaceId(match.id)
      } else {
        const defaultWs = list.find(w => w.is_default) || list[0]
        if (defaultWs) {
          setCurrentWorkspaceId(defaultWs.id)
          localStorage.setItem(getStorageKey(user.id), defaultWs.id)
        }
      }
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  const switchWorkspace = useCallback((workspaceId: string | null) => {
    setCurrentWorkspaceId(workspaceId)
    if (user) {
      if (workspaceId) {
        localStorage.setItem(getStorageKey(user.id), workspaceId)
      } else {
        // "All Workspaces" mode — store special sentinel
        localStorage.setItem(getStorageKey(user.id), '__all__')
      }
    }
  }, [user])

  const createWorkspace = useCallback(async (name: string, emoji?: string): Promise<Workspace | null> => {
    if (!user) return null

    const { data, error } = await supabase
      .from('workspaces')
      .insert({ user_id: user.id, name, emoji: emoji || '🏢' })
      .select()
      .single()

    if (error) {
      console.error('Failed to create workspace:', error)
      return null
    }

    setWorkspaces(prev => [...prev, data])
    return data
  }, [user])

  const renameWorkspace = useCallback(async (id: string, name: string, emoji?: string) => {
    const updates: Record<string, string> = { name }
    if (emoji !== undefined) updates.emoji = emoji

    const { error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Failed to rename workspace:', error)
      return
    }

    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, name, ...(emoji !== undefined ? { emoji } : {}) } : w))
  }, [])

  const deleteWorkspace = useCallback(async (id: string) => {
    // Cannot delete default or last workspace
    const target = workspaces.find(w => w.id === id)
    if (!target || target.is_default || workspaces.length <= 1) return

    // Move sites from deleted workspace to default
    const defaultWs = workspaces.find(w => w.is_default)
    if (defaultWs) {
      await supabase
        .from('sites')
        .update({ workspace_id: defaultWs.id })
        .eq('workspace_id', id)
    }

    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete workspace:', error)
      return
    }

    setWorkspaces(prev => prev.filter(w => w.id !== id))

    // If we deleted the active workspace, switch to default
    if (currentWorkspaceId === id && defaultWs) {
      switchWorkspace(defaultWs.id)
    }
  }, [workspaces, currentWorkspaceId, switchWorkspace])

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      currentWorkspace,
      currentWorkspaceId,
      isAllWorkspaces,
      loading,
      switchWorkspace,
      createWorkspace,
      renameWorkspace,
      deleteWorkspace,
      refetchWorkspaces: fetchWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}
