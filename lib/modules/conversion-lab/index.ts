// Conversion Lab Module — CRM pipeline, lead scoring, Ghost Popup, Silent Pulse analytics.

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'
import { calculateLeadScore, SCORING_RULES } from './lead-scoring'

export class ConversionLabModule implements SEOModule {
  id = 'conversion-lab' as const
  name = 'Conversion Lab'
  description = 'CRM pipeline, lead scoring, Ghost Popup triggers, and Silent Pulse analytics.'
  icon = 'FlaskConical'

  emittedEvents: EventType[] = [
    'lab.lead_moved',
    'lab.offer_sent',
    'lab.popup_triggered',
  ]

  handledEvents: EventType[] = [
    'lead.captured',
    'lead.magnet_delivered',
  ]

  actions: ModuleAction[] = [
    {
      id: 'move_lead',
      name: 'Move Lead to Stage',
      description: 'Move a lead to a different pipeline stage',
      params: [
        { name: 'lead_id', type: 'string', label: 'Lead ID', required: true },
        { name: 'stage', type: 'string', label: 'Pipeline Stage', required: true },
      ],
    },
    {
      id: 'score_lead',
      name: 'Recalculate Lead Score',
      description: 'Recalculate lead score based on all interactions',
      params: [
        { name: 'lead_id', type: 'string', label: 'Lead ID', required: true },
      ],
    },
    {
      id: 'create_ghost_popup',
      name: 'Create Ghost Popup',
      description: 'Create a new behavior-triggered popup for a landing site',
      params: [
        { name: 'landing_site_id', type: 'string', label: 'Landing Site ID', required: true },
        { name: 'name', type: 'string', label: 'Popup Name', required: true },
      ],
    },
  ]

  requiredKeys: ApiKeyType[] = []

  sidebar: ModuleSidebarConfig = {
    section: 'Growth',
    sectionColor: 'bg-rose-500',
    label: 'Conversion Lab',
    viewState: 'conversion-lab',
    order: 1,
  }

  async handleEvent(event: CoreEvent, context: ModuleContext): Promise<CoreEvent | null> {
    if (event.event_type === 'lead.captured') {
      // Auto-score new lead
      const leadId = event.payload.lead_id
      if (leadId) {
        try {
          await this.scoreLead({ lead_id: leadId }, context)
        } catch { /* scoring failure shouldn't block event chain */ }
      }
    }

    if (event.event_type === 'lead.magnet_delivered') {
      // Re-score after magnet delivery
      const leadId = event.payload.lead_id
      if (leadId) {
        try {
          await this.scoreLead({ lead_id: leadId }, context)
        } catch { /* scoring failure shouldn't block event chain */ }
      }
    }

    return null
  }

  async executeAction(
    actionId: string,
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    switch (actionId) {
      case 'move_lead': return this.moveLead(params, context)
      case 'score_lead': return this.scoreLead(params, context)
      case 'create_ghost_popup': return this.createGhostPopup(params, context)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  private async moveLead(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { lead_id, stage } = params
    if (!lead_id || !stage) throw new Error('lead_id and stage required')

    const { error } = await context.supabase
      .from('leads')
      .update({ pipeline_stage: stage })
      .eq('id', lead_id)
      .eq('user_id', context.userId)

    if (error) throw new Error(error.message)

    // Log interaction
    await context.supabase
      .from('lead_interactions')
      .insert({
        lead_id,
        event_type: 'stage_change',
        event_data: { stage },
      })

    await context.emitEvent({
      event_type: 'lab.lead_moved',
      source_module: 'conversion-lab',
      payload: { lead_id, stage },
    })

    return { lead_id, stage }
  }

  private async scoreLead(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { lead_id } = params
    if (!lead_id) throw new Error('lead_id required')

    const { data: interactions } = await context.supabase
      .from('lead_interactions')
      .select('event_type, event_data, duration_seconds')
      .eq('lead_id', lead_id)

    const { data: lead } = await context.supabase
      .from('leads')
      .select('total_downloads, total_page_views')
      .eq('id', lead_id)
      .eq('user_id', context.userId)
      .single()

    const score = calculateLeadScore(interactions || [], lead)

    await context.supabase
      .from('leads')
      .update({ lead_score: score })
      .eq('id', lead_id)
      .eq('user_id', context.userId)

    // Auto-promote to "hot" if score >= 50
    if (score >= SCORING_RULES.hot_threshold) {
      await context.supabase
        .from('leads')
        .update({ pipeline_stage: 'hot' })
        .eq('id', lead_id)
        .eq('user_id', context.userId)
        .neq('pipeline_stage', 'closed')
        .neq('pipeline_stage', 'lost')
    }

    return { lead_id, score }
  }

  private async createGhostPopup(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { landing_site_id, name } = params
    if (!landing_site_id || !name) throw new Error('landing_site_id and name required')

    const { data, error } = await context.supabase
      .from('ghost_popups')
      .insert({
        user_id: context.userId,
        landing_site_id,
        name,
        trigger_rules: { trigger: 'time_delay', value: 30, show_once: true },
        popup_html: '<div><h2>Special Offer</h2><p>Don\'t miss out!</p></div>',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return { popup_id: data.id, name: data.name }
  }
}
