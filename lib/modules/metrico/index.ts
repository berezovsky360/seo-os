// Metrico Module — KPI Dashboard aggregating metrics from all SEO OS modules.

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'

export class MetricoModule implements SEOModule {
  id = 'metrico' as const
  name = 'Metrico'
  description = 'Unified KPI dashboard — aggregates articles, traffic, leads, keywords, funnels, and AI usage into a single overview.'
  icon = 'BarChart3'

  emittedEvents: EventType[] = []
  handledEvents: EventType[] = []

  actions: ModuleAction[] = [
    {
      id: 'refresh_stats',
      name: 'Refresh Stats',
      description: 'Re-fetch aggregated KPIs from all modules',
      params: [],
    },
  ]

  requiredKeys: ApiKeyType[] = []

  sidebar: ModuleSidebarConfig = {
    section: 'Analytics',
    sectionColor: 'bg-indigo-500',
    label: 'Metrico',
    viewState: 'metrico',
    order: 0,
  }

  async handleEvent(_event: CoreEvent, _context: ModuleContext): Promise<CoreEvent | null> {
    return null
  }

  async executeAction(
    actionId: string,
    _params: Record<string, any>,
    _context: ModuleContext
  ): Promise<Record<string, any>> {
    switch (actionId) {
      case 'refresh_stats':
        return { refreshed: true }
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }
}
