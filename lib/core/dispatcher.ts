/**
 * Core Dispatcher — The heart of the Event Bus.
 *
 * Processes incoming events by:
 * 1. Persisting them to events_log
 * 2. Finding matching recipes (trigger_event + conditions)
 * 3. Executing recipe action chains in order
 * 4. Emitting follow-up events from module outputs
 */

import { createClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'
import type { CoreEvent, EventRecord, Recipe, ModuleId, ApiKeyType } from './events'
import type { ModuleContext, SEOModule } from './module-interface'
import { MODULE_REGISTRY } from './registry'

const MAX_RECIPE_DEPTH = 5

// Server-side Supabase client
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export class CoreDispatcher {
  /**
   * Emit and process a new event.
   * Called from POST /api/core/emit and from modules emitting follow-up events.
   */
  async dispatch(event: CoreEvent, userId: string): Promise<string> {
    const supabase = getSupabase()

    // 1. Insert event into events_log
    const { data: inserted, error: insertError } = await supabase
      .from('events_log')
      .insert({
        user_id: userId,
        event_type: event.event_type,
        source_module: event.source_module,
        payload: event.payload,
        site_id: event.site_id || null,
        severity: event.severity || 'info',
        status: 'pending',
        processed_by: [],
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      console.error('[CoreDispatcher] Failed to insert event:', insertError)
      throw new Error(`Failed to emit event: ${insertError?.message}`)
    }

    const eventId = inserted.id

    // 2. Find matching recipes
    const { data: recipes } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', userId)
      .eq('trigger_event', event.event_type)
      .eq('enabled', true)

    if (recipes && recipes.length > 0) {
      // 3. Update event status to processing
      await supabase
        .from('events_log')
        .update({ status: 'processing' })
        .eq('id', eventId)

      // 4. Execute each matching recipe
      for (const recipe of recipes) {
        // Check site scope
        if (recipe.site_ids && recipe.site_ids.length > 0 && event.site_id) {
          if (!recipe.site_ids.includes(event.site_id)) {
            continue // Skip: event site not in recipe scope
          }
        }

        // Check conditions
        if (!this.matchesConditions(event, recipe.trigger_conditions || {})) {
          continue
        }

        try {
          await this.executeRecipe(recipe as Recipe, event, userId, eventId)

          // Update recipe stats
          await supabase
            .from('recipes')
            .update({
              times_triggered: (recipe.times_triggered || 0) + 1,
              last_triggered_at: new Date().toISOString(),
            })
            .eq('id', recipe.id)
        } catch (err) {
          console.error(`[CoreDispatcher] Recipe "${recipe.name}" failed:`, err)
          // Log failure but don't stop other recipes
          await this.emitInternal({
            event_type: 'core.recipe_failed',
            source_module: 'core',
            payload: {
              recipe_id: recipe.id,
              recipe_name: recipe.name,
              error: err instanceof Error ? err.message : 'Unknown error',
              trigger_event_id: eventId,
            },
          }, userId)
        }
      }
    }

    // 5. Mark event as completed
    await supabase
      .from('events_log')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', eventId)

    return eventId
  }

  /**
   * Execute a recipe's action chain sequentially.
   * Each action's result is passed to the next as additional params.
   */
  async executeRecipe(
    recipe: Recipe,
    triggerEvent: CoreEvent,
    userId: string,
    eventId: string,
    depth: number = 0
  ): Promise<void> {
    if (depth >= MAX_RECIPE_DEPTH) {
      throw new Error(`Sub-recipe depth limit (${MAX_RECIPE_DEPTH}) exceeded — possible infinite loop`)
    }

    const supabase = getSupabase()
    let previousResult: Record<string, any> = { ...triggerEvent.payload }

    for (const action of recipe.actions) {
      // Intercept sub-recipe calls
      if (action.module === 'recipes' && action.action === 'execute_recipe') {
        const subRecipeId = action.params?.recipe_id
        if (!subRecipeId) {
          console.warn('[CoreDispatcher] Sub-recipe action missing recipe_id, skipping')
          continue
        }

        const subResult = await this.executeRecipeById(
          subRecipeId,
          { ...previousResult, ...(action.params?.input_mapping || {}) },
          userId,
          eventId,
          depth + 1
        )
        previousResult = { ...previousResult, ...subResult }
        continue
      }

      const moduleId = action.module as ModuleId
      const module = MODULE_REGISTRY[moduleId]

      if (!module) {
        console.warn(`[CoreDispatcher] Module "${moduleId}" not found in registry`)
        continue
      }

      // Check if module is enabled for this user
      const { data: moduleConfig } = await supabase
        .from('modules_config')
        .select('enabled, settings')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .single()

      if (!moduleConfig?.enabled && moduleId !== 'core') {
        console.warn(`[CoreDispatcher] Module "${moduleId}" is not enabled, skipping`)
        continue
      }

      // Build module context
      const apiKeys = await this.getDecryptedKeys(userId, module.requiredKeys)
      const context: ModuleContext = {
        userId,
        siteId: triggerEvent.site_id,
        apiKeys,
        supabase,
        emitEvent: async (evt: CoreEvent) => {
          await this.emitInternal(evt, userId)
        },
        settings: moduleConfig?.settings || {},
      }

      // Merge previous result into action params
      const mergedParams = { ...previousResult, ...action.params }

      try {
        const result = await module.executeAction(action.action, mergedParams, context)
        previousResult = { ...previousResult, ...result }

        // Log which module.action processed this event
        try {
          const { data: current } = await supabase
            .from('events_log')
            .select('processed_by')
            .eq('id', eventId)
            .single()

          const processedBy = [...(current?.processed_by || []), `${moduleId}.${action.action}`]
          await supabase
            .from('events_log')
            .update({ processed_by: processedBy })
            .eq('id', eventId)
        } catch {
          // Non-critical: don't block recipe execution
        }
      } catch (err) {
        console.error(`[CoreDispatcher] Action "${moduleId}.${action.action}" failed:`, err)
        throw err // Propagate to recipe-level error handling
      }
    }

    // Emit recipe completed event
    await this.emitInternal({
      event_type: 'core.recipe_completed',
      source_module: 'core',
      payload: {
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        trigger_event_id: eventId,
        result: previousResult,
      },
      site_id: triggerEvent.site_id,
    }, userId)
  }

  /**
   * Execute a recipe by its ID (used for sub-recipe calls).
   * Returns the accumulated result from the recipe's action chain.
   */
  async executeRecipeById(
    recipeId: string,
    inputParams: Record<string, any>,
    userId: string,
    parentEventId: string,
    depth: number
  ): Promise<Record<string, any>> {
    const supabase = getSupabase()

    const { data: recipe } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('user_id', userId)
      .single()

    if (!recipe) {
      throw new Error(`Sub-recipe "${recipeId}" not found`)
    }

    // Emit sub-recipe started
    await this.emitInternal({
      event_type: 'recipe.sub_recipe_started',
      source_module: 'recipes',
      payload: {
        parent_event_id: parentEventId,
        sub_recipe_id: recipeId,
        sub_recipe_name: recipe.name,
        depth,
      },
    }, userId)

    // Build a synthetic trigger event with the input params
    const syntheticEvent: CoreEvent = {
      event_type: recipe.trigger_event || 'core.manual_trigger',
      source_module: 'recipes',
      payload: inputParams,
    }

    await this.executeRecipe(recipe as Recipe, syntheticEvent, userId, parentEventId, depth)

    // Emit sub-recipe completed
    await this.emitInternal({
      event_type: 'recipe.sub_recipe_completed',
      source_module: 'recipes',
      payload: {
        parent_event_id: parentEventId,
        sub_recipe_id: recipeId,
        sub_recipe_name: recipe.name,
        depth,
      },
    }, userId)

    return inputParams
  }

  /**
   * Check if event payload matches recipe trigger conditions.
   * Supports: min_*, max_*, equals_*, contains_* prefixes.
   */
  matchesConditions(event: CoreEvent, conditions: Record<string, any>): boolean {
    for (const [key, threshold] of Object.entries(conditions)) {
      if (key.startsWith('min_')) {
        const field = key.replace('min_', '')
        const value = event.payload[field]
        if (value === undefined || value < threshold) return false
      } else if (key.startsWith('max_')) {
        const field = key.replace('max_', '')
        const value = event.payload[field]
        if (value === undefined || value > threshold) return false
      } else if (key.startsWith('equals_')) {
        const field = key.replace('equals_', '')
        if (event.payload[field] !== threshold) return false
      } else if (key.startsWith('contains_')) {
        const field = key.replace('contains_', '')
        const value = event.payload[field]
        if (!value || !String(value).includes(String(threshold))) return false
      } else {
        // Direct field match
        if (event.payload[key] !== threshold) return false
      }
    }
    return true
  }

  /**
   * Internal emit — inserts event without triggering recipes (prevents infinite loops).
   * Used for core lifecycle events (recipe_completed, recipe_failed).
   */
  private async emitInternal(event: CoreEvent, userId: string): Promise<void> {
    const supabase = getSupabase()
    await supabase.from('events_log').insert({
      user_id: userId,
      event_type: event.event_type,
      source_module: event.source_module,
      payload: event.payload,
      site_id: event.site_id || null,
      severity: event.severity || 'info',
      status: 'completed',
      processed_by: [],
      processed_at: new Date().toISOString(),
    })
  }

  /**
   * Decrypt API keys for a module from the api_keys table.
   */
  private async getDecryptedKeys(
    userId: string,
    requiredKeys: ApiKeyType[]
  ): Promise<Record<string, string>> {
    if (requiredKeys.length === 0) return {}

    const supabase = getSupabase()
    const keys: Record<string, string> = {}

    const { data } = await supabase
      .from('api_keys')
      .select('key_type, encrypted_value')
      .eq('user_id', userId)
      .in('key_type', requiredKeys)

    if (data) {
      const encryptionKey = getEncryptionKey()
      for (const row of data) {
        try {
          keys[row.key_type] = await decrypt(row.encrypted_value, encryptionKey)
        } catch (err) {
          console.error(`[CoreDispatcher] Failed to decrypt key "${row.key_type}":`, err)
        }
      }
    }

    return keys
  }
}

// Singleton instance
export const coreDispatcher = new CoreDispatcher()
