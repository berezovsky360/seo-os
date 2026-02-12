import { supabase } from '@/lib/supabase/client'
import type { Workspace } from '@/types'

export const workspaceService = {
  async getAll(): Promise<Workspace[]> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  },

  async create(workspace: { name: string; emoji?: string }): Promise<Workspace> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        user_id: user.id,
        name: workspace.name,
        emoji: workspace.emoji || '🏢',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async update(id: string, updates: { name?: string; emoji?: string }): Promise<void> {
    const { error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', id)

    if (error) throw new Error(error.message)
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
  },

  async moveSite(siteId: string, workspaceId: string): Promise<void> {
    const { error } = await supabase
      .from('sites')
      .update({ workspace_id: workspaceId })
      .eq('id', siteId)

    if (error) throw new Error(error.message)
  },
}
