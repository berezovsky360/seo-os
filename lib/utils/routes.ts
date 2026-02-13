// Dashboard route mapping — single source of truth for all view → URL mappings

export const DASHBOARD_ROUTES: Record<string, string> = {
  'dashboard': '/dashboard',
  'site-details': '/dashboard/sites', // needs /{siteId} appended
  'calendar': '/dashboard/calendar',
  'keywords-main': '/dashboard/keywords',
  'llm-tracker': '/dashboard/llm-tracker',
  'keywords-db': '/dashboard/keyword-research',
  'authors': '/dashboard/personas',
  'marketplace': '/dashboard/marketplace',
  'key-management': '/dashboard/keys',
  'event-log': '/dashboard/events',
  'bulk-metadata': '/dashboard/rankmath',
  'rankmath-bridge': '/dashboard/rankmath',
  'recipes': '/dashboard/recipes',
  'rank-pulse': '/dashboard/rank-pulse',
  'gsc-insights': '/dashboard/gsc-insights',
  'nana-banana': '/dashboard/nana-banana',
  'docs': '/dashboard/docs',
  'cron-jobs': '/dashboard/cron',
  'content-engine': '/dashboard/content-engine',
  'content-lots': '/dashboard/content-lots',
  'telegraph': '/dashboard/telegraph',
  'brands': '/dashboard/settings',
  'competitor-analysis': '/dashboard/competitor-analysis',
  'competitor-anatomy': '/dashboard/competitor-anatomy',
  'ai-writer': '/dashboard/ai-writer',
  'any-chat': '/dashboard/any-chat',
  'task-history': '/dashboard/tasks',
  'admin': '/dashboard/admin',
  'lead-factory': '/dashboard/lead-factory',
  'conversion-lab': '/dashboard/conversion-lab',
  'landing-engine': '/dashboard/landing-engine',
}

export function getRouteForView(view: string, siteId?: string): string {
  if (view === 'site-details' && siteId) {
    return `/dashboard/sites/${siteId}`
  }
  return DASHBOARD_ROUTES[view] || '/dashboard'
}
