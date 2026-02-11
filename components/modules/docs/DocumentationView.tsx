'use client';

import React, { useState } from 'react';
import {
  ChevronLeft, ChevronDown, ChevronRight, Download, Bell,
  FileText, Server, Database, Zap, Globe, BookOpen, Code, Layers
} from 'lucide-react';

interface DocumentationViewProps {
  onBack?: () => void;
}

// Collapsible section
function Section({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <Icon size={18} className="text-indigo-500 flex-shrink-0" />
        <span className="text-sm font-bold text-gray-900 flex-1">{title}</span>
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-6 pb-5 border-t border-gray-50">
          {children}
        </div>
      )}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs font-mono overflow-x-auto my-3 leading-relaxed">
      {children}
    </pre>
  );
}

function Badge({ children, color = 'indigo' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    gray: 'bg-gray-50 text-gray-700 border-gray-100',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

function RouteRow({ method, path, desc }: { method: string; path: string; desc: string }) {
  const methodColors: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-700',
    POST: 'bg-blue-100 text-blue-700',
    PUT: 'bg-amber-100 text-amber-700',
    DELETE: 'bg-rose-100 text-rose-700',
  };
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="py-2.5 pr-3">
        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${methodColors[method] || 'bg-gray-100 text-gray-700'}`}>
          {method}
        </span>
      </td>
      <td className="py-2.5 pr-3 font-mono text-xs text-gray-700">{path}</td>
      <td className="py-2.5 text-xs text-gray-500">{desc}</td>
    </tr>
  );
}

export default function DocumentationView({ onBack }: DocumentationViewProps) {
  return (
    <div className="h-full flex flex-col bg-[#F5F5F7] relative font-sans">
      {/* Header */}
      <div className="flex justify-between items-center px-4 sm:px-8 py-5 bg-[#F5F5F7] z-10 sticky top-0">
        <div className="flex items-center gap-3 sm:gap-4">
          {onBack && (
            <>
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
              >
                <ChevronLeft size={14} />
                Back
              </button>
              <div className="h-4 w-px bg-gray-300" />
            </>
          )}
          <FileText size={20} className="text-gray-900" />
          <h1 className="text-lg font-bold text-gray-900">Documentation</h1>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">SEO OS v1.0</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8">
        {/* Architecture Overview */}
        <Section title="Architecture Overview" icon={Layers} defaultOpen={true}>
          <div className="mt-4 space-y-4 text-sm text-gray-600 leading-relaxed">
            <p>
              SEO OS is built on a <strong>Core + Module + Message Bus</strong> architecture.
              Modules are self-contained units that communicate via typed events through a central dispatcher.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <div className="font-bold text-indigo-900 text-xs mb-1">Core Dispatcher</div>
                <p className="text-xs text-indigo-700">Processes events, matches recipes, executes action chains, manages API key decryption.</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <div className="font-bold text-emerald-900 text-xs mb-1">Modules</div>
                <p className="text-xs text-emerald-700">Plugin-based system implementing SEOModule interface. Each module declares events, actions, and dependencies.</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div className="font-bold text-amber-900 text-xs mb-1">Message Bus</div>
                <p className="text-xs text-amber-700">Typed event bus with conditions and result chaining. Events persisted in events_log, delivered via Supabase Realtime.</p>
              </div>
            </div>

            <CodeBlock>{`Event Flow:
User Action / Cron / Module
    -> POST /api/core/emit
    -> CoreDispatcher.dispatch()
        1. Persist to events_log (status: pending)
        2. Find matching recipes (trigger_event + conditions)
        3. Execute action chain:
           Step 1: ModuleA.action(params) -> result1
           Step 2: ModuleB.action({...params, ...result1}) -> result2
        4. Emit core.recipe_completed
    -> Supabase Realtime -> Client UI updates`}</CodeBlock>

            <h4 className="font-bold text-gray-900 mt-4">Tech Stack</h4>
            <div className="flex flex-wrap gap-2">
              <Badge>Next.js 16</Badge>
              <Badge color="emerald">React 19</Badge>
              <Badge color="cyan">TypeScript</Badge>
              <Badge color="emerald">Supabase</Badge>
              <Badge color="amber">Tailwind CSS</Badge>
              <Badge color="violet">TanStack Query</Badge>
              <Badge color="rose">WordPress REST API</Badge>
            </div>
          </div>
        </Section>

        {/* API Routes */}
        <Section title="API Routes" icon={Server}>
          <div className="mt-4 space-y-6">
            {/* Sites */}
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Sites</h4>
              <table className="w-full text-left">
                <tbody>
                  <RouteRow method="GET" path="/api/sites" desc="List all sites for authenticated user" />
                  <RouteRow method="POST" path="/api/sites" desc="Create a new site" />
                  <RouteRow method="GET" path="/api/sites/[siteId]" desc="Get site details" />
                  <RouteRow method="PUT" path="/api/sites/[siteId]" desc="Update site" />
                  <RouteRow method="DELETE" path="/api/sites/[siteId]" desc="Delete site" />
                  <RouteRow method="POST" path="/api/sites/[siteId]/sync" desc="Sync posts from WordPress" />
                  <RouteRow method="POST" path="/api/sites/[siteId]/test-connection" desc="Test WordPress credentials" />
                  <RouteRow method="PUT" path="/api/sites/[siteId]/credentials" desc="Update WordPress credentials" />
                  <RouteRow method="GET" path="/api/sites/[siteId]/categories-tags" desc="Get categories and tags" />
                  <RouteRow method="GET" path="/api/sites/[siteId]/stats" desc="Get site statistics" />
                  <RouteRow method="GET" path="/api/sites/[siteId]/connector-status" desc="Check connector status" />
                  <RouteRow method="POST" path="/api/sites/[siteId]/upload-media" desc="Upload image to WP Media Library" />
                </tbody>
              </table>
            </div>

            {/* Articles */}
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Articles (Generated)</h4>
              <table className="w-full text-left">
                <tbody>
                  <RouteRow method="GET" path="/api/articles" desc="List generated articles (global or per-site)" />
                  <RouteRow method="POST" path="/api/articles" desc="Create new article" />
                  <RouteRow method="GET" path="/api/articles/[articleId]" desc="Get article details" />
                  <RouteRow method="PUT" path="/api/articles/[articleId]" desc="Update article fields" />
                  <RouteRow method="DELETE" path="/api/articles/[articleId]" desc="Delete article" />
                  <RouteRow method="POST" path="/api/articles/[articleId]/publish" desc="Publish article to WordPress" />
                  <RouteRow method="POST" path="/api/articles/[articleId]/analyze" desc="Run SEO analysis" />
                </tbody>
              </table>
            </div>

            {/* Posts */}
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Posts (WordPress Sync)</h4>
              <table className="w-full text-left">
                <tbody>
                  <RouteRow method="GET" path="/api/posts" desc="List synced WordPress posts" />
                  <RouteRow method="GET" path="/api/posts/[postId]" desc="Get post details" />
                  <RouteRow method="PUT" path="/api/posts/[postId]" desc="Update post fields in Supabase" />
                  <RouteRow method="POST" path="/api/posts/[postId]/publish" desc="Push post updates to WordPress" />
                  <RouteRow method="GET" path="/api/posts/[postId]/revisions" desc="Get post revision history" />
                </tbody>
              </table>
            </div>

            {/* Core */}
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Core Event Bus</h4>
              <table className="w-full text-left">
                <tbody>
                  <RouteRow method="POST" path="/api/core/emit" desc="Emit event into the bus (triggers recipes)" />
                  <RouteRow method="GET" path="/api/core/events" desc="List recent events" />
                  <RouteRow method="GET" path="/api/core/recipes" desc="List automation recipes" />
                  <RouteRow method="POST" path="/api/core/recipes" desc="Create recipe" />
                  <RouteRow method="PUT" path="/api/core/recipes/[recipeId]" desc="Update recipe" />
                  <RouteRow method="DELETE" path="/api/core/recipes/[recipeId]" desc="Delete recipe" />
                </tbody>
              </table>
            </div>

            {/* Modules */}
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Modules</h4>
              <table className="w-full text-left">
                <tbody>
                  <RouteRow method="GET" path="/api/modules" desc="List modules with enabled state" />
                  <RouteRow method="PUT" path="/api/modules/[moduleId]" desc="Enable/disable module" />
                  <RouteRow method="POST" path="/api/modules" desc="Batch toggle modules" />
                </tbody>
              </table>
            </div>

            {/* API Keys */}
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">API Keys</h4>
              <table className="w-full text-left">
                <tbody>
                  <RouteRow method="GET" path="/api/keys" desc="List API keys (masked)" />
                  <RouteRow method="POST" path="/api/keys/[keyType]" desc="Store/update API key (encrypted)" />
                  <RouteRow method="DELETE" path="/api/keys/[keyType]" desc="Delete API key" />
                  <RouteRow method="POST" path="/api/keys/[keyType]/validate" desc="Validate API key" />
                </tbody>
              </table>
            </div>

            {/* Module-specific routes */}
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Rank Pulse</h4>
              <table className="w-full text-left">
                <tbody>
                  <RouteRow method="POST" path="/api/rank-pulse/check" desc="Check keyword positions (DataForSEO)" />
                  <RouteRow method="GET" path="/api/rank-pulse/history" desc="Position history for keyword" />
                  <RouteRow method="GET" path="/api/rank-pulse/keywords" desc="List tracked keywords" />
                  <RouteRow method="POST" path="/api/rank-pulse/serp-snapshot" desc="Full SERP snapshot" />
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">GSC Insights</h4>
              <table className="w-full text-left">
                <tbody>
                  <RouteRow method="POST" path="/api/gsc-insights/sync" desc="Pull Search Console data" />
                  <RouteRow method="GET" path="/api/gsc-insights/analytics" desc="Search analytics overview" />
                  <RouteRow method="GET" path="/api/gsc-insights/queries" desc="Query-level data" />
                  <RouteRow method="GET" path="/api/gsc-insights/pages" desc="Page-level performance" />
                  <RouteRow method="GET" path="/api/gsc-insights/low-ctr" desc="Low CTR opportunities" />
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Nana Banana</h4>
              <table className="w-full text-left">
                <tbody>
                  <RouteRow method="POST" path="/api/nana-banana/generate-prompt" desc="Generate image prompt from article" />
                  <RouteRow method="POST" path="/api/nana-banana/generate-image" desc="Generate image via Imagen" />
                  <RouteRow method="POST" path="/api/nana-banana/analyze-image" desc="Gemini vision -> alt text + caption" />
                  <RouteRow method="POST" path="/api/nana-banana/push-to-wp" desc="Upload to WP + set featured" />
                  <RouteRow method="POST" path="/api/nana-banana/pipeline" desc="Full end-to-end pipeline" />
                  <RouteRow method="POST" path="/api/nana-banana/analyze-style" desc="Extract brand style from image" />
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        {/* Modules */}
        <Section title="Module Catalog" icon={Zap}>
          <div className="mt-4 space-y-4">
            {[
              { name: 'RankMath Bridge', id: 'rankmath-bridge', icon: 'Globe', desc: 'Sync SEO metadata across WordPress sites. Push/pull Rank Math fields in bulk.', events: ['bridge.sync_completed', 'bridge.metadata_pushed', 'bridge.bulk_push_completed', 'bridge.draft_created'], keys: 'None', color: 'indigo' },
              { name: 'Rank Pulse', id: 'rank-pulse', icon: 'BarChart3', desc: 'Real-time keyword position monitoring with SERP snapshots.', events: ['rank.check_completed', 'rank.position_dropped', 'rank.position_improved', 'rank.new_competitor'], keys: 'dataforseo', color: 'amber' },
              { name: 'GSC Insights', id: 'gsc-insights', icon: 'Search', desc: 'Google Search Console data sync and analysis.', events: ['gsc.data_synced', 'gsc.low_ctr_found', 'gsc.impressions_spike', 'gsc.keyword_discovered'], keys: 'gsc', color: 'violet' },
              { name: 'Nana Banana', id: 'nana-banana', icon: 'Image', desc: 'AI featured image generation with SEO alt-text.', events: ['banana.prompt_generated', 'banana.image_generated', 'banana.seo_description_ready', 'banana.image_pushed_to_wp'], keys: 'gemini', color: 'amber' },
              { name: 'Gemini Architect', id: 'gemini-architect', icon: 'Sparkles', desc: 'AI content analysis — semantic gaps, FAQ generation, title optimization.', events: ['content.analysis_completed', 'content.semantic_gap_found', 'content.faq_generated'], keys: 'gemini', color: 'emerald' },
              { name: 'Keyword Research', id: 'keyword-research', icon: 'Database', desc: 'Keyword database with intent, volume, and difficulty.', events: ['keyword.research_completed'], keys: 'None', color: 'emerald' },
              { name: 'Keyword Magic Tool', id: 'keyword-magic', icon: 'Wand2', desc: 'Research > Ideas > Cluster > Action workflow.', events: ['keyword.research_completed', 'keyword.cluster_created'], keys: 'None', color: 'rose' },
              { name: 'LLM Tracker', id: 'llm-tracker', icon: 'Bot', desc: 'AI search visibility across ChatGPT, Claude, Gemini, Perplexity.', events: ['llm.query_tracked', 'llm.visibility_changed'], keys: 'None', color: 'cyan' },
              { name: 'Recipes', id: 'recipes', icon: 'BookOpen', desc: 'If-this-then-that automation chains.', events: ['core.recipe_triggered', 'core.recipe_completed', 'core.recipe_failed'], keys: 'None', color: 'violet' },
              { name: 'Personas', id: 'personas', icon: 'Users', desc: 'Author personas and brand voice management.', events: [], keys: 'None', color: 'gray' },
              { name: 'Documentation', id: 'docs', icon: 'FileText', desc: 'In-app reference for SEO OS.', events: [], keys: 'None', color: 'gray' },
            ].map((mod) => (
              <div key={mod.id} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900">{mod.name}</span>
                    <span className="font-mono text-[10px] text-gray-400">{mod.id}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{mod.desc}</p>
                  <div className="flex flex-wrap gap-1">
                    {mod.events.map(e => <Badge key={e} color={mod.color}>{e}</Badge>)}
                    {mod.keys !== 'None' && <Badge color="rose">Key: {mod.keys}</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Event Types */}
        <Section title="Event Types" icon={Zap}>
          <div className="mt-4 space-y-3">
            {[
              { group: 'Core', events: [
                { type: 'core.module_enabled', desc: 'Module activated by user' },
                { type: 'core.module_disabled', desc: 'Module deactivated' },
                { type: 'core.recipe_triggered', desc: 'Recipe execution started' },
                { type: 'core.recipe_completed', desc: 'Recipe chain completed successfully' },
                { type: 'core.recipe_failed', desc: 'Recipe chain failed with error' },
              ]},
              { group: 'Rank Pulse', events: [
                { type: 'rank.check_completed', desc: 'Keyword position check finished' },
                { type: 'rank.position_dropped', desc: 'Keyword position dropped (payload: keyword, old_position, new_position, drop)' },
                { type: 'rank.position_improved', desc: 'Keyword position improved' },
                { type: 'rank.new_competitor', desc: 'New competitor appeared in SERP' },
                { type: 'rank.serp_structure_changed', desc: 'SERP feature layout changed' },
              ]},
              { group: 'Content (Gemini)', events: [
                { type: 'content.analysis_completed', desc: 'Content analysis finished' },
                { type: 'content.semantic_gap_found', desc: 'Missing topic detected' },
                { type: 'content.faq_generated', desc: 'FAQ schema generated from PAA' },
                { type: 'content.rewrite_ready', desc: 'Content rewrite suggestion ready' },
                { type: 'content.title_suggestions_ready', desc: 'Title alternatives generated' },
              ]},
              { group: 'Bridge (WordPress)', events: [
                { type: 'bridge.sync_completed', desc: 'WordPress posts synced to Supabase' },
                { type: 'bridge.metadata_pushed', desc: 'SEO metadata pushed to WordPress' },
                { type: 'bridge.bulk_push_completed', desc: 'Bulk metadata push finished' },
                { type: 'bridge.draft_created', desc: 'New WordPress draft created' },
              ]},
              { group: 'GSC', events: [
                { type: 'gsc.data_synced', desc: 'Search Console data pulled' },
                { type: 'gsc.low_ctr_found', desc: 'Page with high impressions + low CTR' },
                { type: 'gsc.impressions_spike', desc: 'Sudden increase in impressions' },
                { type: 'gsc.keyword_discovered', desc: 'New keyword appeared in queries' },
              ]},
              { group: 'Nana Banana', events: [
                { type: 'banana.prompt_generated', desc: 'Image prompt created from article' },
                { type: 'banana.image_generated', desc: 'Image rendered via Imagen' },
                { type: 'banana.seo_description_ready', desc: 'Alt-text + caption generated' },
                { type: 'banana.image_pushed_to_wp', desc: 'Image uploaded to WordPress' },
                { type: 'banana.pipeline_completed', desc: 'Full pipeline success' },
                { type: 'banana.pipeline_failed', desc: 'Pipeline error' },
              ]},
              { group: 'LLM Tracker', events: [
                { type: 'llm.query_tracked', desc: 'New query added to tracking' },
                { type: 'llm.visibility_changed', desc: 'Visibility score changed for a query' },
              ]},
              { group: 'Keywords', events: [
                { type: 'keyword.research_completed', desc: 'Keyword research batch finished' },
                { type: 'keyword.cluster_created', desc: 'Topic cluster generated' },
              ]},
            ].map(group => (
              <div key={group.group}>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">{group.group}</h4>
                <div className="space-y-1.5 mb-4">
                  {group.events.map(e => (
                    <div key={e.type} className="flex items-baseline gap-3">
                      <code className="text-[11px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded flex-shrink-0">{e.type}</code>
                      <span className="text-xs text-gray-500">{e.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Database Schema */}
        <Section title="Database Schema" icon={Database}>
          <div className="mt-4 space-y-4">
            {[
              { table: 'sites', desc: 'WordPress sites connected to SEO OS', cols: 'id, user_id, name, url, favicon, theme, wp_username, wp_app_password, metrics(json), content_queue(json), status, created_at' },
              { table: 'generated_articles', desc: 'Locally created content (before publishing)', cols: 'id, site_id, user_id, title, content, status, focus_keyword, seo_title, seo_description, seo_score, word_count, slug, featured_image_url, + 20 Rank Math fields, created_at, updated_at' },
              { table: 'posts', desc: 'Synced WordPress posts cache', cols: 'id, site_id, wp_post_id, title, slug, url, status, content, seo_score, focus_keyword, seo_title, seo_description, + 20 Rank Math fields, synced_at, published_at' },
              { table: 'events_log', desc: 'All events emitted through the message bus', cols: 'id, user_id, event_type, source_module, payload(json), site_id, severity, status, processed_by(text[]), result(json), error, created_at, processed_at' },
              { table: 'recipes', desc: 'Automation chains', cols: 'id, user_id, name, description, enabled, trigger_event, trigger_conditions(json), actions(json), site_ids(text[]), times_triggered, last_triggered_at, created_at, updated_at' },
              { table: 'modules_config', desc: 'Per-user module enabled/disabled state', cols: 'id, user_id, module_id, enabled, settings(json), created_at, updated_at' },
              { table: 'api_keys', desc: 'Encrypted API keys', cols: 'id, user_id, key_type, encrypted_value, label, is_valid, last_validated_at, validation_error, usage_count, balance, created_at' },
              { table: 'user_preferences', desc: 'User settings and setup state', cols: 'id, user_id, setup_completed, setup_step, default_view, language, notification_channels(json), created_at, updated_at' },
            ].map(t => (
              <div key={t.table} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-xs font-mono font-bold text-gray-900">{t.table}</code>
                  <span className="text-[10px] text-gray-400">{t.desc}</span>
                </div>
                <p className="text-[11px] text-gray-500 font-mono leading-relaxed">{t.cols}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Recipes */}
        <Section title="Recipes (Automation)" icon={BookOpen}>
          <div className="mt-4 space-y-4 text-sm text-gray-600 leading-relaxed">
            <p>
              Recipes are <strong>if-this-then-that</strong> automation chains. When an event matches a recipe's trigger + conditions,
              the action chain executes sequentially with result chaining.
            </p>

            <CodeBlock>{`Recipe Structure:
{
  trigger_event: "rank.position_dropped",
  trigger_conditions: { min_drop: 5, max_position: 20 },
  actions: [
    { module: "gsc-insights",      action: "check_impressions" },
    { module: "gemini-architect",   action: "analyze_content"   },
    { module: "gemini-architect",   action: "find_semantic_gaps" }
  ]
}`}</CodeBlock>

            <h4 className="font-bold text-gray-900">Condition Operators</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <code className="text-xs font-mono text-indigo-600">min_*</code>
                <p className="text-[10px] text-gray-500 mt-0.5">Minimum value</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <code className="text-xs font-mono text-indigo-600">max_*</code>
                <p className="text-[10px] text-gray-500 mt-0.5">Maximum value</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <code className="text-xs font-mono text-indigo-600">equals_*</code>
                <p className="text-[10px] text-gray-500 mt-0.5">Exact match</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <code className="text-xs font-mono text-indigo-600">contains_*</code>
                <p className="text-[10px] text-gray-500 mt-0.5">String contains</p>
              </div>
            </div>

            <h4 className="font-bold text-gray-900">Result Chaining</h4>
            <p>
              Each action receives the event payload merged with all previous action results.
              This enables pipelines like: analyze content → find gaps → generate FAQ → create draft.
            </p>

            <h4 className="font-bold text-gray-900">Pre-built Templates</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Badge color="emerald">Low CTR Rescue</Badge>
                <span className="text-xs text-gray-500">When page in TOP-3 with CTR &lt; 2%, analyze title and generate alternatives</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge color="amber">Smart Position Rescue</Badge>
                <span className="text-xs text-gray-500">When position drops 5+, run content analysis and find semantic gaps</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge color="violet">New Keyword Alert</Badge>
                <span className="text-xs text-gray-500">When new keyword discovered in GSC, generate FAQ</span>
              </li>
            </ul>
          </div>
        </Section>

        {/* WordPress Integration */}
        <Section title="WordPress Integration" icon={Globe}>
          <div className="mt-4 space-y-4 text-sm text-gray-600 leading-relaxed">
            <p>
              SEO OS connects to WordPress sites via the <strong>REST API + Application Passwords</strong>.
              Credentials are encrypted at rest using AES-256-GCM.
            </p>

            <h4 className="font-bold text-gray-900">WordPress Client</h4>
            <p>
              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">lib/wordpress/client.ts</code> — Handles all WP REST API communication:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-500">
              <li>Create / Update / Get posts</li>
              <li>Create categories and tags</li>
              <li>Upload media to Media Library</li>
              <li>Fetch Rank Math metadata (25+ fields)</li>
              <li>Push Rank Math metadata back to WordPress</li>
            </ul>

            <h4 className="font-bold text-gray-900">Gutenberg Block Wrapping</h4>
            <p>
              Content is stored as clean HTML in Supabase. At publish time,
              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded mx-1">addGutenbergBlockMarkers()</code>
              wraps WordPress columns with block comments:
            </p>
            <CodeBlock>{`// Input (Supabase):
<div class="wp-block-columns">
  <div class="wp-block-column"><p>Col 1</p></div>
  <div class="wp-block-column"><p>Col 2</p></div>
</div>

// Output (WordPress):
<!-- wp:columns -->
<div class="wp-block-columns">
  <!-- wp:column --><div class="wp-block-column"><p>Col 1</p></div><!-- /wp:column -->
  <!-- wp:column --><div class="wp-block-column"><p>Col 2</p></div><!-- /wp:column -->
</div>
<!-- /wp:columns -->`}</CodeBlock>

            <h4 className="font-bold text-gray-900">Two-Table Architecture</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <div className="font-bold text-blue-900 text-xs mb-1">generated_articles</div>
                <p className="text-[11px] text-blue-700">Locally created content. Editable, unpublished drafts. Published to WP via /publish endpoint.</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                <div className="font-bold text-emerald-900 text-xs mb-1">posts</div>
                <p className="text-[11px] text-emerald-700">Synced WordPress posts cache. Pulled from WP during sync. Can be edited and pushed back.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* Editor */}
        <Section title="Article Editor" icon={Code}>
          <div className="mt-4 space-y-4 text-sm text-gray-600 leading-relaxed">
            <p>
              The editor uses <strong>contentEditable + execCommand</strong> (no heavy libraries).
              Features built with a pure DOM approach:
            </p>

            <h4 className="font-bold text-gray-900">Block Structure</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-500">
              <li><code className="bg-gray-100 px-1 py-0.5 rounded">defaultParagraphSeparator: 'p'</code> — Enter creates new &lt;p&gt; elements</li>
              <li><code className="bg-gray-100 px-1 py-0.5 rounded">normalizeBlockStructure()</code> — Splits &lt;br&gt;-separated content into separate blocks</li>
              <li>Safari fallback via onKeyDown handler</li>
            </ul>

            <h4 className="font-bold text-gray-900">Floating Toolbar</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-500">
              <li>Notion-style dark toolbar appears on text selection</li>
              <li>Turn Into dropdown (Text, H1-H4, Lists, Quote)</li>
              <li>Inline formatting (Bold, Italic, Underline, Strikethrough, Link, Code)</li>
              <li>Mobile-compatible via <code className="bg-gray-100 px-1 py-0.5 rounded">onPointerDown + savedRangeRef</code></li>
            </ul>

            <h4 className="font-bold text-gray-900">Block Drag-and-Drop</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-500">
              <li>Overlay approach (doesn't inject into contentEditable DOM)</li>
              <li>GripVertical handle on hover</li>
              <li>Blue insertion line during drag</li>
              <li>Hidden on mobile</li>
            </ul>

            <h4 className="font-bold text-gray-900">WordPress Columns</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-500">
              <li>2/3/4 column layouts via toolbar buttons</li>
              <li>Flex display with dashed border in editor</li>
              <li>Each column independently editable</li>
              <li>Responsive: stacks vertically on mobile</li>
              <li>Gutenberg comments added only at publish time</li>
            </ul>
          </div>
        </Section>

        {/* Module Interface */}
        <Section title="SEOModule Interface" icon={Code}>
          <div className="mt-4">
            <CodeBlock>{`interface SEOModule {
  // Identity
  id: ModuleId
  name: string
  description: string
  icon: string // Lucide icon name

  // Event declarations
  emittedEvents: EventType[]
  handledEvents: EventType[]

  // Available actions (for recipes and direct calls)
  actions: ModuleAction[]

  // Dependencies
  requiredKeys: ApiKeyType[]

  // UI configuration
  sidebar: ModuleSidebarConfig | null

  // Handle an incoming event
  handleEvent(event: CoreEvent, context: ModuleContext): Promise<CoreEvent | null>

  // Execute a specific action
  executeAction(
    actionId: string,
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>>
}

interface ModuleContext {
  userId: string
  siteId?: string
  apiKeys: Record<string, string>  // Decrypted
  supabase: SupabaseClient
  emitEvent: (event: CoreEvent) => Promise<void>
}`}</CodeBlock>
          </div>
        </Section>
      </div>
    </div>
  );
}
