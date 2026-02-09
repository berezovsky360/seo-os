/**
 * Module Registry — Static map of all available SEO OS modules.
 *
 * Modules are registered here so the Core Dispatcher can find them.
 * New modules: implement SEOModule interface → add to this registry.
 */

import type { ModuleId } from './events'
import type { SEOModule } from './module-interface'
import { RankMathBridgeModule } from '@/lib/modules/rankmath-bridge'

// Placeholder modules for future implementation
import { RankPulseModule } from '@/lib/modules/rank-pulse'
import { GeminiArchitectModule } from '@/lib/modules/gemini-architect'
import { GSCInsightsModule } from '@/lib/modules/gsc-insights'

export const MODULE_REGISTRY: Record<string, SEOModule> = {
  'rankmath-bridge': new RankMathBridgeModule(),
  'rank-pulse': new RankPulseModule(),
  'gemini-architect': new GeminiArchitectModule(),
  'gsc-insights': new GSCInsightsModule(),
}

/**
 * Get a module by ID. Returns undefined if not found.
 */
export function getModule(moduleId: string): SEOModule | undefined {
  return MODULE_REGISTRY[moduleId]
}

/**
 * Get all registered modules.
 */
export function getAllModules(): SEOModule[] {
  return Object.values(MODULE_REGISTRY)
}

/**
 * Module metadata for client-side display (no server-side handlers).
 */
export interface ModuleInfo {
  id: ModuleId
  name: string
  description: string
  icon: string
  requiredKeys: string[]
  sidebar: SEOModule['sidebar']
  emittedEvents: string[]
  handledEvents: string[]
  actions: { id: string; name: string; description: string }[]
}

/**
 * Get module info for client-side (strips server handlers).
 */
export function getModuleInfoList(): ModuleInfo[] {
  return Object.values(MODULE_REGISTRY).map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    icon: m.icon,
    requiredKeys: m.requiredKeys,
    sidebar: m.sidebar,
    emittedEvents: m.emittedEvents,
    handledEvents: m.handledEvents,
    actions: m.actions.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
    })),
  }))
}
