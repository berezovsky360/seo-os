/**
 * Cron Scheduler Module — Time-based triggers for recipes.
 *
 * Allows scheduling recipes to run on cron expressions
 * (e.g., daily position checks, weekly content audits).
 */

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'

export class CronModule implements SEOModule {
  id = 'cron' as const
  name = 'Cron Scheduler'
  description = 'Schedule recipes to run at specific times using cron expressions.'
  icon = 'Clock'

  emittedEvents: EventType[] = [
    'cron.job_executed',
    'cron.job_failed',
  ]

  handledEvents: EventType[] = []

  actions: ModuleAction[] = [
    {
      id: 'create_job',
      name: 'Create Cron Job',
      description: 'Schedule a recipe to run on a cron schedule',
      params: [
        { name: 'name', type: 'string', label: 'Job Name', required: true },
        { name: 'cron_expression', type: 'string', label: 'Cron Expression', required: true },
        { name: 'recipe_id', type: 'string', label: 'Recipe ID', required: true },
      ],
    },
    {
      id: 'execute_due_jobs',
      name: 'Execute Due Jobs',
      description: 'Find and execute all cron jobs that are due to run',
      params: [],
    },
  ]

  requiredKeys: ApiKeyType[] = []

  sidebar: ModuleSidebarConfig = {
    section: 'Automation',
    sectionColor: 'bg-violet-500',
    label: 'Cron Jobs',
    viewState: 'cron-jobs',
    order: 2,
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
      case 'create_job': {
        const { data, error } = await context.supabase
          .from('cron_jobs')
          .insert({
            user_id: context.userId,
            site_id: context.siteId || null,
            name: params.name,
            cron_expression: params.cron_expression,
            recipe_id: params.recipe_id,
            enabled: true,
            timezone: params.timezone || 'UTC',
          })
          .select()
          .single()

        if (error) throw new Error(`Failed to create cron job: ${error.message}`)
        return { job: data }
      }

      default:
        throw new Error(`Cron module action not implemented: ${actionId}`)
    }
  }
}
