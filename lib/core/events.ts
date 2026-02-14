/**
 * Core Event Bus — Standardized event types for module communication.
 *
 * Modules emit and handle events through the Core Dispatcher.
 * Events are persisted in the `events_log` table and delivered
 * to the client via Supabase Realtime.
 */

// ====== Module Identifiers ======

export type ModuleId =
  | 'core'
  | 'rank-pulse'
  | 'gemini-architect'
  | 'rankmath-bridge'
  | 'gsc-insights'
  | 'nana-banana'
  // Marketplace modules
  | 'recipes'
  | 'personas'
  | 'llm-tracker'
  | 'keyword-research'
  | 'keyword-magic'
  | 'docs'
  | 'ai-writer'
  | 'cron'
  | 'content-engine'
  | 'telegraph'
  | 'any-chat'
  | 'competitor-analysis'
  | 'competitor-anatomy'
  | 'lead-factory'
  | 'conversion-lab'
  | 'landing-engine'
  | 'funnel-builder'
  | 'metrico'

// ====== API Key Types ======

export type ApiKeyType = 'gemini' | 'dataforseo' | 'gsc' | 'ga4' | 'openai'

// ====== Event Types ======

export type EventType =
  // Core lifecycle events
  | 'core.module_enabled'
  | 'core.module_disabled'
  | 'core.recipe_triggered'
  | 'core.recipe_completed'
  | 'core.recipe_failed'
  // Rank Pulse events (position monitoring)
  | 'rank.check_completed'
  | 'rank.position_dropped'
  | 'rank.position_improved'
  | 'rank.new_competitor'
  | 'rank.serp_structure_changed'
  // Gemini Content Architect events (AI analysis)
  | 'content.analysis_completed'
  | 'content.semantic_gap_found'
  | 'content.faq_generated'
  | 'content.rewrite_ready'
  | 'content.title_suggestions_ready'
  | 'content.title_generated'
  | 'content.description_generated'
  // RankMath Bridge events (WordPress sync)
  | 'bridge.sync_completed'
  | 'bridge.metadata_pushed'
  | 'bridge.bulk_push_completed'
  | 'bridge.draft_created'
  // GSC Insights events (Search Console)
  | 'gsc.data_synced'
  | 'gsc.low_ctr_found'
  | 'gsc.impressions_spike'
  | 'gsc.keyword_discovered'
  // Nana Banana events (AI image generation)
  | 'banana.prompt_generated'
  | 'banana.image_generated'
  | 'banana.seo_description_ready'
  | 'banana.image_pushed_to_wp'
  | 'banana.pipeline_completed'
  | 'banana.pipeline_failed'
  // LLM Tracker events
  | 'llm.query_tracked'
  | 'llm.visibility_changed'
  // Keyword events
  | 'keyword.research_completed'
  | 'keyword.cluster_created'
  // Persona events
  | 'persona.created'
  | 'persona.updated'
  | 'persona.document_uploaded'
  | 'persona.document_processed'
  // AI Writer events
  | 'writer.title_generated'
  | 'writer.description_generated'
  | 'writer.content_generated'
  // Cron Scheduler events
  | 'cron.job_executed'
  | 'cron.job_failed'
  // Content Engine events
  | 'engine.feed_polled'
  | 'engine.items_scored'
  | 'engine.facts_extracted'
  | 'engine.facts_checked'
  | 'engine.items_clustered'
  | 'engine.sections_generated'
  | 'engine.article_assembled'
  | 'engine.article_published'
  | 'engine.pipeline_completed'
  | 'engine.pipeline_failed'
  // Redirect events
  | 'redirect.created'
  | 'redirect.deleted'
  | 'redirect.404_detected'
  | 'redirect.slug_changed'
  | 'redirect.bulk_imported'
  // Content Lots (swipe review) events
  | 'swipe.approved'
  | 'swipe.rejected'
  | 'swipe.super_liked'
  // Telegraph events
  | 'telegraph.page_created'
  | 'telegraph.page_updated'
  | 'telegraph.page_views_fetched'
  // Competitor Analysis events
  | 'competitor.analysis_completed'
  | 'competitor.new_threat'
  | 'competitor.keyword_gap_found'
  | 'competitor.overview_fetched'
  | 'competitor.top_pages_fetched'
  | 'competitor.competitors_discovered'
  | 'competitor.content_gap_analyzed'
  | 'competitor.deep_analysis_completed'
  // Any Chat events
  | 'chat.message_sent'
  | 'chat.message_received'
  | 'chat.approval_requested'
  | 'chat.approval_responded'
  | 'chat.channel_connected'
  // Sub-Recipe events (inter-recipe communication)
  | 'recipe.sub_recipe_started'
  | 'recipe.sub_recipe_completed'
  // Background Task events
  | 'task.created'
  | 'task.started'
  | 'task.progress'
  | 'task.completed'
  | 'task.failed'
  // Competitor Anatomy events (On-Page API)
  | 'anatomy.crawl_started'
  | 'anatomy.crawl_progress'
  | 'anatomy.crawl_completed'
  | 'anatomy.crawl_failed'
  | 'anatomy.instant_audit_completed'
  | 'anatomy.issues_found'
  // Lead Factory events
  | 'lead.captured'
  | 'lead.magnet_delivered'
  | 'lead.form_submitted'
  // Conversion Lab events
  | 'lab.lead_moved'
  | 'lab.offer_sent'
  | 'lab.popup_triggered'
  // Funnel Builder events
  | 'funnel.step_reached'
  | 'funnel.completed'
  | 'funnel.abandoned'

// ====== Background Task Types ======

export type BackgroundTaskStatus = 'queued' | 'running' | 'completed' | 'failed'

export type BackgroundTaskType =
  | 'deep_analysis'
  | 'article_generation'
  | 'image_generation'
  | 'keyword_fetch'
  | 'competitor_discover'
  | 'content_pipeline'
  | 'onpage_crawl'
  | 'bulk_generate'

export interface BackgroundTask {
  id: string
  user_id: string
  task_type: BackgroundTaskType
  title: string
  status: BackgroundTaskStatus
  progress: number
  result: Record<string, any> | null
  error: string | null
  metadata: Record<string, any>
  created_at: string
  started_at: string | null
  completed_at: string | null
}

// ====== Event Severity ======

export type EventSeverity = 'info' | 'warning' | 'critical'

// ====== Event Status ======

export type EventStatus = 'pending' | 'processing' | 'completed' | 'failed'

// ====== Core Event (what modules emit and receive) ======

export interface CoreEvent {
  event_type: EventType
  source_module: ModuleId
  payload: Record<string, any>
  site_id?: string
  severity?: EventSeverity
}

// ====== Persisted Event (what's stored in events_log) ======

export interface EventRecord {
  id: string
  user_id: string
  event_type: EventType
  source_module: ModuleId
  payload: Record<string, any>
  site_id: string | null
  severity: EventSeverity
  status: EventStatus
  processed_by: string[]
  result: Record<string, any> | null
  error: string | null
  created_at: string
  processed_at: string | null
}

// ====== API Key Info (client-side, masked) ======

export interface ApiKeyInfo {
  id: string
  key_type: ApiKeyType
  label: string | null
  is_valid: boolean
  last_validated_at: string | null
  validation_error: string | null
  usage_count: number
  balance: number | null
  masked_value: string // 'AIza...***'
  created_at: string
}

// ====== Module Config (from modules_config table) ======

export interface ModuleConfig {
  id: string
  user_id: string
  module_id: ModuleId
  enabled: boolean
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

// ====== Recipe (automation chain) ======

export interface RecipeAction {
  module: ModuleId
  action: string
  params: Record<string, any>
}

export interface Recipe {
  id: string
  user_id: string
  name: string
  description: string | null
  enabled: boolean
  trigger_event: EventType
  trigger_conditions: Record<string, any>
  actions: RecipeAction[]
  site_ids: string[] | null
  graph_layout: Record<string, any> | null
  times_triggered: number
  last_triggered_at: string | null
  created_at: string
  updated_at: string
}

// ====== User Preferences ======

export interface UserPreferences {
  id: string
  user_id: string
  setup_completed: boolean
  setup_step: number
  default_view: string
  language: string
  notification_channels: {
    email: boolean
    telegram: boolean
  }
  created_at: string
  updated_at: string
}
