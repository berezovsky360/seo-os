// Funnel Builder Module — Visual funnel constructor

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'

export class FunnelBuilderModule implements SEOModule {
  id = 'funnel-builder' as const
  name = 'Funnel Builder'
  description = 'Visual funnel constructor — connects landing pages, forms, email, and conversions into a unified flow with analytics.'
  icon = 'GitBranch'

  emittedEvents: EventType[] = [
    'funnel.step_reached',
    'funnel.completed',
    'funnel.abandoned',
  ]

  handledEvents: EventType[] = [
    'lead.captured',
    'lead.magnet_delivered',
    'lead.form_submitted',
  ]

  actions: ModuleAction[] = [
    {
      id: 'create_funnel',
      name: 'Create Funnel',
      description: 'Create a new conversion funnel',
      params: [
        { name: 'name', type: 'string', label: 'Funnel Name', required: true },
        { name: 'site_id', type: 'string', label: 'Site ID', required: false },
      ],
    },
    {
      id: 'activate_funnel',
      name: 'Activate Funnel',
      description: 'Set a funnel status to active',
      params: [
        { name: 'funnel_id', type: 'string', label: 'Funnel ID', required: true },
      ],
    },
    {
      id: 'pause_funnel',
      name: 'Pause Funnel',
      description: 'Pause an active funnel',
      params: [
        { name: 'funnel_id', type: 'string', label: 'Funnel ID', required: true },
      ],
    },
  ]

  requiredKeys: ApiKeyType[] = []

  sidebar: ModuleSidebarConfig = {
    section: 'Growth',
    sectionColor: 'bg-rose-500',
    label: 'Funnel Builder',
    viewState: 'funnel-builder',
    order: 2,
  }

  async handleEvent(event: CoreEvent, context: ModuleContext): Promise<CoreEvent | null> {
    // Track funnel progress when leads are captured
    if (event.event_type === 'lead.captured') {
      const { form_id, lead_id } = event.payload

      // Find active funnels with a form node matching this form_id
      const { data: funnels } = await context.supabase
        .from('funnels')
        .select('id, graph')
        .eq('status', 'active')

      if (funnels) {
        for (const funnel of funnels) {
          const nodes = funnel.graph?.nodes || []
          const formNode = nodes.find(
            (n: any) => n.type === 'form' && n.data?.formId === form_id
          )
          if (formNode) {
            await context.supabase.from('funnel_events').insert({
              funnel_id: funnel.id,
              node_id: formNode.id,
              event_type: 'form_submit',
              lead_id,
            })

            await context.emitEvent({
              event_type: 'funnel.step_reached',
              source_module: 'funnel-builder',
              payload: { funnel_id: funnel.id, node_id: formNode.id, step: 'form_submit', lead_id },
            })
          }
        }
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
      case 'create_funnel': {
        const { data, error } = await context.supabase
          .from('funnels')
          .insert({
            user_id: context.userId,
            site_id: params.site_id || null,
            name: params.name,
          })
          .select()
          .single()
        if (error) throw new Error(error.message)
        return { funnel_id: data.id }
      }
      case 'activate_funnel': {
        const { error } = await context.supabase
          .from('funnels')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', params.funnel_id)
          .eq('user_id', context.userId)
        if (error) throw new Error(error.message)
        return { status: 'active' }
      }
      case 'pause_funnel': {
        const { error } = await context.supabase
          .from('funnels')
          .update({ status: 'paused', updated_at: new Date().toISOString() })
          .eq('id', params.funnel_id)
          .eq('user_id', context.userId)
        if (error) throw new Error(error.message)
        return { status: 'paused' }
      }
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }
}
