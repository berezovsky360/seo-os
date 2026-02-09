# Changelog

All notable changes to SEO OS are documented here.

## [1.0.0] — 2026-02-09

### Foundation
- **Next.js 16 + React 19 + TypeScript** full-stack platform
- **Supabase** backend: PostgreSQL, Auth, RLS, Realtime
- Dashboard with site cards, stats, quick actions
- Site Details: Content tab, Categories, Tags, Settings
- Article Editor with full-screen modal, Rank Math fields
- WordPress integration: REST API client, post sync, publish/update
- Content Calendar view

### Core Event Bus (Phases 1–7)
- `events_log` table + Realtime subscriptions
- `api_keys` encrypted storage + validation
- `modules_config` per-user module state
- `recipes` automation engine (trigger → conditions → actions)
- `user_preferences` + Setup Wizard onboarding
- Module registry, dispatcher, CoreContext provider
- Sidebar dynamic module sections
- EventLog viewer, RecipeList builder, KeyManagement UI

### Modules
- **RankMath Bridge** — Bulk metadata push/pull, 25+ Rank Math fields sync
- **Rank Pulse** — Keyword position monitoring (DataForSEO)
- **GSC Insights** — Search Console data sync & analysis
- **Nana Banana** — AI featured image generation pipeline (Gemini)
- **Marketplace** — Module install/configure/disable with data preservation

### SEO & Content
- SEO Score Indicator component
- Content Analysis, SERP Preview, Social Preview
- ArticleProductionView (global Posts), FinishedArticlesView
- MainKeywordsView, LLMTrackerView, KeywordResearch
- Author Rotator
- Drag-n-drop column reordering + customizable visibility

### UI/UX
- URL-based routing (`?view=...&siteId=...`)
- Back buttons in every view header
- Bulk selection & actions (Change Status, Sync to WP, Delete)
- Toast notification system
- Mobile-responsive sidebar with hamburger menu
- Hydration-safe rendering

### Database Migrations
- `20260207000000_initial_schema.sql` — sites, posts, generated_articles
- `20260208000000_rank_math_full_fields.sql` — 25+ Rank Math columns
- `20260210000000_core_event_bus.sql` — events_log, api_keys, modules_config, recipes, user_preferences
