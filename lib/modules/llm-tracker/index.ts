/**
 * LLM Tracker Module — AI search visibility monitoring.
 *
 * Track how your brand/content appears in responses from
 * ChatGPT, Claude, Gemini, and Perplexity.
 */

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'

export class LLMTrackerModule implements SEOModule {
  id = 'llm-tracker' as const
  name = 'LLM Tracker'
  description = 'Track AI search visibility across ChatGPT, Claude, Gemini, and Perplexity.'
  icon = 'Bot'

  emittedEvents: EventType[] = [
    'llm.query_tracked',
    'llm.visibility_changed',
  ]

  handledEvents: EventType[] = []

  actions: ModuleAction[] = [
    {
      id: 'track_query',
      name: 'Track Query',
      description: 'Add a query to monitor across LLM platforms',
      params: [
        { name: 'query', type: 'string', label: 'Search Query', required: true },
      ],
    },
    {
      id: 'check_visibility',
      name: 'Check Visibility',
      description: 'Run visibility check across all tracked queries',
      params: [],
    },
  ]

  requiredKeys: ApiKeyType[] = []

  sidebar: ModuleSidebarConfig = {
    section: 'Research',
    sectionColor: 'bg-cyan-500',
    label: 'LLM Tracker',
    viewState: 'llm-tracker',
    order: 4,
  }

  async handleEvent(_event: CoreEvent, _context: ModuleContext): Promise<CoreEvent | null> {
    return null
  }

  async executeAction(
    actionId: string,
    _params: Record<string, any>,
    _context: ModuleContext
  ): Promise<Record<string, any>> {
    throw new Error(`LLM Tracker module action not yet implemented: ${actionId}`)
  }
}
