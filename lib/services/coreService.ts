/**
 * Core Service — Client-side API for the Event Bus.
 *
 * Handles: emitting events, reading event log, managing recipes.
 * All calls go through Next.js API routes (server handles encryption/auth).
 */

import { supabase } from '@/lib/supabase/client'
import type { CoreEvent, EventRecord, Recipe, UserPreferences } from '@/lib/core/events'

export const coreService = {
  // ====== Events ======

  async emitEvent(event: CoreEvent): Promise<{ event_id: string }> {
    const res = await fetch('/api/core/emit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Failed to emit event')
    }
    return res.json()
  },

  async getEvents(params?: {
    site_id?: string
    event_type?: string
    severity?: string
    limit?: number
    offset?: number
  }): Promise<EventRecord[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    let query = supabase
      .from('events_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(params?.limit || 50)

    if (params?.site_id) query = query.eq('site_id', params.site_id)
    if (params?.event_type) query = query.like('event_type', `${params.event_type}%`)
    if (params?.severity) query = query.eq('severity', params.severity)

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch events: ${error.message}`)
    return (data || []) as EventRecord[]
  },

  // ====== Recipes ======

  async getRecipes(sortBy?: string): Promise<Recipe[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const sortMap: Record<string, { column: string; ascending: boolean }> = {
      updated: { column: 'updated_at', ascending: false },
      created: { column: 'created_at', ascending: false },
      name_asc: { column: 'name', ascending: true },
      name_za: { column: 'name', ascending: false },
    }
    const sort = sortMap[sortBy || 'updated'] || sortMap.updated

    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order(sort.column, { ascending: sort.ascending })

    if (error) throw new Error(`Failed to fetch recipes: ${error.message}`)
    return (data || []) as Recipe[]
  },

  async createRecipe(recipe: {
    name: string
    description?: string
    trigger_event: string
    trigger_conditions?: Record<string, any>
    actions: { module: string; action: string; params: Record<string, any> }[]
    site_ids?: string[]
  }): Promise<Recipe> {
    const res = await fetch('/api/core/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Failed to create recipe')
    }
    return res.json()
  },

  async updateRecipe(recipeId: string, updates: Partial<Recipe>): Promise<Recipe> {
    const res = await fetch(`/api/core/recipes/${recipeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Failed to update recipe')
    }
    return res.json()
  },

  async deleteRecipe(recipeId: string): Promise<void> {
    const res = await fetch(`/api/core/recipes/${recipeId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Failed to delete recipe')
    }
  },

  // ====== User Preferences ======

  async getPreferences(): Promise<UserPreferences | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return data as UserPreferences | null
  },

  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        ...updates,
      }, { onConflict: 'user_id' })
  },

  async completeSetup(): Promise<void> {
    const res = await fetch('/api/setup/complete', { method: 'POST' })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Failed to complete setup')
    }
  },
}
