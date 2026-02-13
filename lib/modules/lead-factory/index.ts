// Lead Factory Module — Lead capture forms, magnets, and delivery.

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'

export class LeadFactoryModule implements SEOModule {
  id = 'lead-factory' as const
  name = 'Lead Factory'
  description = 'Lead capture forms, magnets (PDF/downloads), and email delivery for landing sites.'
  icon = 'Magnet'

  emittedEvents: EventType[] = [
    'lead.captured',
    'lead.magnet_delivered',
    'lead.form_submitted',
  ]

  handledEvents: EventType[] = []

  actions: ModuleAction[] = [
    {
      id: 'create_form',
      name: 'Create Lead Form',
      description: 'Create a new lead capture form for a landing site',
      params: [
        { name: 'landing_site_id', type: 'string', label: 'Landing Site ID', required: true },
        { name: 'name', type: 'string', label: 'Form Name', required: true },
        { name: 'form_type', type: 'select', label: 'Form Type', required: false, options: [
          { label: 'Inline', value: 'inline' },
          { label: 'Popup', value: 'popup' },
          { label: 'Slide-in', value: 'slide_in' },
        ]},
      ],
    },
    {
      id: 'create_magnet',
      name: 'Create Lead Magnet',
      description: 'Create a new lead magnet (PDF, ebook, checklist, etc.)',
      params: [
        { name: 'landing_site_id', type: 'string', label: 'Landing Site ID', required: false },
        { name: 'name', type: 'string', label: 'Magnet Name', required: true },
        { name: 'file_url', type: 'string', label: 'File URL', required: true },
      ],
    },
    {
      id: 'send_magnet',
      name: 'Deliver Magnet to Lead',
      description: 'Send a lead magnet via email to a captured lead',
      params: [
        { name: 'lead_id', type: 'string', label: 'Lead ID', required: true },
        { name: 'magnet_id', type: 'string', label: 'Magnet ID', required: true },
      ],
    },
  ]

  requiredKeys: ApiKeyType[] = []

  sidebar: ModuleSidebarConfig = {
    section: 'Growth',
    sectionColor: 'bg-rose-500',
    label: 'Lead Factory',
    viewState: 'lead-factory',
    order: 0,
  }

  async handleEvent(_event: CoreEvent, _context: ModuleContext): Promise<CoreEvent | null> {
    return null
  }

  async executeAction(
    actionId: string,
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    switch (actionId) {
      case 'create_form': return this.createForm(params, context)
      case 'create_magnet': return this.createMagnet(params, context)
      case 'send_magnet': return this.sendMagnet(params, context)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  private async createForm(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { landing_site_id, name, form_type } = params
    if (!name) throw new Error('name is required')

    const { data, error } = await context.supabase
      .from('lead_forms')
      .insert({
        user_id: context.userId,
        landing_site_id: landing_site_id || null,
        name,
        form_type: form_type || 'inline',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return { form_id: data.id, name: data.name }
  }

  private async createMagnet(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { landing_site_id, name, file_url } = params
    if (!name || !file_url) throw new Error('name and file_url are required')

    const { data, error } = await context.supabase
      .from('lead_magnets')
      .insert({
        user_id: context.userId,
        landing_site_id: landing_site_id || null,
        name,
        file_url,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return { magnet_id: data.id, name: data.name }
  }

  private async sendMagnet(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { lead_id, magnet_id } = params
    if (!lead_id || !magnet_id) throw new Error('lead_id and magnet_id required')

    const { data: lead } = await context.supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .eq('user_id', context.userId)
      .single()

    if (!lead) throw new Error('Lead not found')

    const { data: magnet } = await context.supabase
      .from('lead_magnets')
      .select('*')
      .eq('id', magnet_id)
      .eq('user_id', context.userId)
      .single()

    if (!magnet) throw new Error('Magnet not found')

    // Deliver via email
    const { deliverMagnet } = await import('./email-sender')
    await deliverMagnet(lead, magnet, context.supabase)

    await context.emitEvent({
      event_type: 'lead.magnet_delivered',
      source_module: 'lead-factory',
      payload: { lead_id, magnet_id, email: lead.email },
    })

    return { lead_id, magnet_id, delivered: true }
  }
}
