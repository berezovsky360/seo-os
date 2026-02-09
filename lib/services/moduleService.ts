/**
 * Module Service — Client-side CRUD for module configuration.
 *
 * Manages which modules are enabled/disabled and their settings.
 */

import { supabase } from '@/lib/supabase/client'
import type { ModuleConfig, ModuleId } from '@/lib/core/events'

export const moduleService = {
  async getModules(): Promise<ModuleConfig[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('modules_config')
      .select('*')
      .eq('user_id', user.id)

    if (error) throw new Error(`Failed to fetch modules: ${error.message}`)
    return (data || []) as ModuleConfig[]
  },

  async toggleModule(moduleId: ModuleId, enabled: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    await supabase
      .from('modules_config')
      .upsert({
        user_id: user.id,
        module_id: moduleId,
        enabled,
      }, { onConflict: 'user_id,module_id' })
  },

  async batchToggle(modules: { module_id: ModuleId; enabled: boolean }[]): Promise<void> {
    const res = await fetch('/api/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Failed to update modules')
    }
  },

  async updateSettings(moduleId: ModuleId, settings: Record<string, any>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    await supabase
      .from('modules_config')
      .upsert({
        user_id: user.id,
        module_id: moduleId,
        settings,
      }, { onConflict: 'user_id,module_id' })
  },
}
