/**
 * Documentation Module — In-app reference for SEO OS.
 *
 * Provides architecture overview, API routes documentation,
 * module catalog, event types, and database schema reference.
 */

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'

export class DocsModule implements SEOModule {
  id = 'docs' as const
  name = 'Documentation'
  description = 'In-app reference: architecture, API routes, modules, events, and database schema.'
  icon = 'FileText'

  emittedEvents: EventType[] = []
  handledEvents: EventType[] = []
  actions: ModuleAction[] = []
  requiredKeys: ApiKeyType[] = []

  sidebar: ModuleSidebarConfig = {
    section: 'Admin',
    sectionColor: 'bg-gray-500',
    label: 'Documentation',
    viewState: 'docs',
    order: 2,
  }

  async handleEvent(_event: CoreEvent, _context: ModuleContext): Promise<CoreEvent | null> {
    return null
  }

  async executeAction(
    actionId: string,
    _params: Record<string, any>,
    _context: ModuleContext
  ): Promise<Record<string, any>> {
    throw new Error(`Docs module has no actions. Called: ${actionId}`)
  }
}
