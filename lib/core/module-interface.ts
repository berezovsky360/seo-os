/**
 * Module Interface — The contract every SEO OS module must implement.
 *
 * Modules are server-side handlers that:
 * - React to incoming events (handleEvent)
 * - Execute named actions (executeAction), called by recipes or the UI
 * - Declare which events they emit and handle
 * - Declare which API keys they need
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CoreEvent, EventType, ModuleId, ApiKeyType } from './events'

// ====== Module Context (injected into every handler call) ======

export interface ModuleContext {
  userId: string
  siteId?: string
  apiKeys: Record<string, string> // Decrypted keys available to this module
  supabase: SupabaseClient        // Service-role client for DB operations
  emitEvent: (event: CoreEvent) => Promise<void> // Emit follow-up events into the bus
  settings?: Record<string, any>  // Per-module user settings from modules_config.settings
}

// ====== Action Parameter Definition ======

export interface ActionParam {
  name: string
  type: 'string' | 'number' | 'boolean' | 'select'
  label: string
  description?: string
  required: boolean
  default?: any
  options?: { label: string; value: string }[] // For 'select' type
}

// ====== Module Action (available in recipes) ======

export interface ModuleAction {
  id: string          // 'sync_site', 'push_metadata', 'generate_faq'
  name: string        // 'Sync Posts from WP'
  description: string // 'Fetches all posts and SEO data from a WordPress site'
  params: ActionParam[]
}

// ====== Sidebar Configuration ======

export interface ModuleSidebarConfig {
  section: string        // 'SEO Tools', 'Monitoring', etc.
  sectionColor: string   // 'bg-emerald-500'
  label: string          // Menu item text
  viewState: string      // ViewState value
  order: number          // Sort order within section
}

// ====== SEO Module Interface ======

export interface SEOModule {
  // Identity
  id: ModuleId
  name: string
  description: string
  icon: string // Lucide icon name: 'Globe', 'Zap', 'Search'

  // Event declarations
  emittedEvents: EventType[]
  handledEvents: EventType[]

  // Available actions (for recipes and direct calls)
  actions: ModuleAction[]

  // Dependencies
  requiredKeys: ApiKeyType[]

  // UI configuration
  sidebar: ModuleSidebarConfig | null // null = no sidebar entry

  // Handle an incoming event (called by CoreDispatcher)
  handleEvent(event: CoreEvent, context: ModuleContext): Promise<CoreEvent | null>

  // Execute a specific action (called by recipe engine or UI)
  executeAction(
    actionId: string,
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>>
}
