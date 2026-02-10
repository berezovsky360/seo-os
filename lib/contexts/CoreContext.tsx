'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import { useModules } from '@/hooks/useModules'
import { useApiKeys } from '@/hooks/useApiKeys'
import { useEvents } from '@/hooks/useEvents'
import { useRecipes } from '@/hooks/useRecipes'
import type { ModuleId, EventRecord, ApiKeyInfo, Recipe, ModuleConfig } from '@/lib/core/events'

// ====== Sidebar Section (built dynamically from enabled modules) ======

export interface SidebarItem {
  label: string
  viewState: string
  icon?: string
}

export interface SidebarSection {
  title: string
  color: string
  items: SidebarItem[]
}

// ====== Context Type ======

interface CoreContextType {
  // Module state
  enabledModules: Set<string>
  isModuleEnabled: (id: ModuleId) => boolean
  modulesLoading: boolean

  // Events (live via Realtime)
  recentEvents: EventRecord[]
  eventsLoading: boolean

  // API keys (masked)
  apiKeys: ApiKeyInfo[]
  apiKeysLoading: boolean

  // Recipes
  recipes: Recipe[]
  recipesLoading: boolean

  // Dynamic sidebar sections from enabled modules
  getModuleSidebarSections: () => SidebarSection[]
}

const CoreContext = createContext<CoreContextType | undefined>(undefined)

// ====== Module sidebar definitions (static, from registry) ======

const MODULE_SIDEBAR_MAP: Record<string, { section: string; sectionColor: string; label: string; viewState: string; order: number }> = {
  // Marketplace modules
  'recipes': { section: 'Automation', sectionColor: 'bg-violet-500', label: 'Recipes', viewState: 'recipes', order: 1 },
  'personas': { section: 'Content', sectionColor: 'bg-yellow-500', label: 'Personas', viewState: 'authors', order: 2 },
  'llm-tracker': { section: 'Research', sectionColor: 'bg-cyan-500', label: 'LLM Tracker', viewState: 'llm-tracker', order: 4 },
  'keyword-research': { section: 'Research', sectionColor: 'bg-cyan-500', label: 'Keyword Research', viewState: 'keywords-db', order: 1 },
  'keyword-magic': { section: 'Research', sectionColor: 'bg-cyan-500', label: 'Keyword Magic Tool', viewState: 'keywords-main', order: 2 },
  // 'docs' is rendered in the hardcoded System section of Sidebar.tsx
  // Core modules
  'rankmath-bridge': { section: 'SEO Tools', sectionColor: 'bg-blue-500', label: 'RankMath Bridge', viewState: 'bulk-metadata', order: 1 },
  'rank-pulse': { section: 'Monitoring', sectionColor: 'bg-orange-500', label: 'Rank Pulse', viewState: 'rank-pulse', order: 1 },
  'gsc-insights': { section: 'Monitoring', sectionColor: 'bg-purple-500', label: 'GSC Insights', viewState: 'gsc-insights', order: 2 },
  'nana-banana': { section: 'Content', sectionColor: 'bg-yellow-500', label: 'Nana Banana', viewState: 'nana-banana', order: 1 },
  'cron': { section: 'Automation', sectionColor: 'bg-violet-500', label: 'Cron Jobs', viewState: 'cron-jobs', order: 2 },
}

export function CoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [realtimeEvents, setRealtimeEvents] = useState<EventRecord[]>([])

  // React Query hooks (fetch data from Supabase / API routes)
  const { data: modulesData, isLoading: modulesLoading } = useModules()
  const { data: apiKeysData, isLoading: apiKeysLoading } = useApiKeys()
  const { data: eventsData, isLoading: eventsLoading } = useEvents({ limit: 50 })
  const { data: recipesData, isLoading: recipesLoading } = useRecipes()

  // Build enabled modules set
  const enabledModules = useMemo(() => {
    const set = new Set<string>()
    if (modulesData) {
      for (const mod of modulesData as ModuleConfig[]) {
        if (mod.enabled) set.add(mod.module_id)
      }
    }
    return set
  }, [modulesData])

  const isModuleEnabled = useCallback(
    (id: ModuleId) => enabledModules.has(id),
    [enabledModules]
  )

  // Merge realtime events with fetched events (dedup by id)
  const recentEvents = useMemo(() => {
    const eventMap = new Map<string, EventRecord>()
    // Add fetched events first
    for (const evt of (eventsData || []) as EventRecord[]) {
      eventMap.set(evt.id, evt)
    }
    // Overlay realtime events (newer)
    for (const evt of realtimeEvents) {
      eventMap.set(evt.id, evt)
    }
    // Sort by created_at desc
    return Array.from(eventMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100)
  }, [eventsData, realtimeEvents])

  // Supabase Realtime subscription for live events
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('core-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events_log',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newEvent = payload.new as EventRecord
          setRealtimeEvents((prev) => [newEvent, ...prev].slice(0, 100))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Build dynamic sidebar sections from enabled modules
  const getModuleSidebarSections = useCallback((): SidebarSection[] => {
    const sectionMap = new Map<string, { color: string; items: { label: string; viewState: string; order: number }[] }>()

    for (const moduleId of enabledModules) {
      const config = MODULE_SIDEBAR_MAP[moduleId]
      if (!config) continue

      if (!sectionMap.has(config.section)) {
        sectionMap.set(config.section, { color: config.sectionColor, items: [] })
      }
      sectionMap.get(config.section)!.items.push({
        label: config.label,
        viewState: config.viewState,
        order: config.order,
      })
    }

    // Sort items within each section
    const sections: SidebarSection[] = []
    for (const [title, data] of sectionMap) {
      data.items.sort((a, b) => a.order - b.order)
      sections.push({
        title,
        color: data.color,
        items: data.items.map(({ label, viewState }) => ({ label, viewState })),
      })
    }

    return sections
  }, [enabledModules])

  const value: CoreContextType = {
    enabledModules,
    isModuleEnabled,
    modulesLoading,
    recentEvents,
    eventsLoading,
    apiKeys: (apiKeysData || []) as ApiKeyInfo[],
    apiKeysLoading,
    recipes: (recipesData || []) as Recipe[],
    recipesLoading,
    getModuleSidebarSections,
  }

  return (
    <CoreContext.Provider value={value}>
      {children}
    </CoreContext.Provider>
  )
}

export function useCore() {
  const context = useContext(CoreContext)
  if (context === undefined) {
    throw new Error('useCore must be used within a CoreProvider')
  }
  return context
}
