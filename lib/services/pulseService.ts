// Pulse Service — Supabase queries for Silent Pulse analytics.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface PulsePageView {
  page_path: string
  date: string
  views: number
  unique_visitors: number
  avg_duration_seconds: number
  bounce_count: number
}

export interface PulseSession {
  id: string
  session_id: string
  lead_id: string | null
  first_seen: string
  last_seen: string
  page_views: number
  country: string | null
  device: string | null
  referrer: string | null
}

/**
 * Get page view stats for a date range.
 */
export async function getPageViews(
  supabase: SupabaseClient,
  siteId: string,
  dateFrom: string,
  dateTo: string,
): Promise<PulsePageView[]> {
  const { data, error } = await supabase
    .from('pulse_page_views')
    .select('*')
    .eq('landing_site_id', siteId)
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return data as PulsePageView[]
}

/**
 * Get daily visitor counts aggregated.
 */
export async function getDailyStats(
  supabase: SupabaseClient,
  siteId: string,
  days: number = 30,
): Promise<{ date: string; views: number; visitors: number }[]> {
  const dateFrom = new Date()
  dateFrom.setDate(dateFrom.getDate() - days)

  const { data, error } = await supabase
    .from('pulse_page_views')
    .select('date, views, unique_visitors')
    .eq('landing_site_id', siteId)
    .gte('date', dateFrom.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error) throw new Error(error.message)

  // Aggregate by date
  const byDate: Record<string, { views: number; visitors: number }> = {}
  for (const row of data || []) {
    if (!byDate[row.date]) byDate[row.date] = { views: 0, visitors: 0 }
    byDate[row.date].views += row.views
    byDate[row.date].visitors += row.unique_visitors
  }

  return Object.entries(byDate).map(([date, stats]) => ({
    date,
    views: stats.views,
    visitors: stats.visitors,
  }))
}

/**
 * Get top pages by views.
 */
export async function getTopPages(
  supabase: SupabaseClient,
  siteId: string,
  limit: number = 10,
): Promise<{ page_path: string; views: number }[]> {
  const { data, error } = await supabase
    .from('pulse_page_views')
    .select('page_path, views')
    .eq('landing_site_id', siteId)
    .order('views', { ascending: false })
    .limit(limit * 3) // Get extra for aggregation

  if (error) throw new Error(error.message)

  // Aggregate by page_path
  const byPath: Record<string, number> = {}
  for (const row of data || []) {
    byPath[row.page_path] = (byPath[row.page_path] || 0) + row.views
  }

  return Object.entries(byPath)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([page_path, views]) => ({ page_path, views }))
}

/**
 * Get referrer breakdown.
 */
export async function getReferrerStats(
  supabase: SupabaseClient,
  siteId: string,
): Promise<{ referrer: string; count: number }[]> {
  const { data, error } = await supabase
    .from('pulse_sessions')
    .select('referrer')
    .eq('landing_site_id', siteId)
    .not('referrer', 'is', null)

  if (error) throw new Error(error.message)

  const counts: Record<string, number> = {}
  for (const row of data || []) {
    const ref = row.referrer || 'Direct'
    counts[ref] = (counts[ref] || 0) + 1
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([referrer, count]) => ({ referrer, count }))
}

/**
 * Get device breakdown.
 */
export async function getDeviceStats(
  supabase: SupabaseClient,
  siteId: string,
): Promise<{ device: string; count: number }[]> {
  const { data, error } = await supabase
    .from('pulse_sessions')
    .select('device')
    .eq('landing_site_id', siteId)

  if (error) throw new Error(error.message)

  const counts: Record<string, number> = {}
  for (const row of data || []) {
    const device = row.device || 'Unknown'
    counts[device] = (counts[device] || 0) + 1
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([device, count]) => ({ device, count }))
}

/**
 * Record a pulse event (page view or leave).
 * Called by the /api/pulse/collect endpoint.
 */
export async function recordPulseEvent(
  supabase: SupabaseClient,
  data: {
    siteId: string
    sessionId: string
    eventType: string
    pagePath: string
    referrer?: string
    eventData?: Record<string, any>
  },
): Promise<void> {
  // 1. Upsert session
  await supabase
    .from('pulse_sessions')
    .upsert({
      landing_site_id: data.siteId,
      session_id: data.sessionId,
      last_seen: new Date().toISOString(),
      referrer: data.referrer || null,
      page_views: 1,
    }, {
      onConflict: 'landing_site_id,session_id',
    })

  // 2. Insert event
  await supabase
    .from('pulse_events')
    .insert({
      landing_site_id: data.siteId,
      session_id: data.sessionId,
      event_type: data.eventType,
      page_path: data.pagePath,
      event_data: data.eventData || null,
    })

  // 3. Upsert page view aggregate (for 'pv' events)
  if (data.eventType === 'pv') {
    const today = new Date().toISOString().split('T')[0]
    await supabase
      .from('pulse_page_views')
      .upsert({
        landing_site_id: data.siteId,
        page_path: data.pagePath,
        date: today,
        views: 1,
        unique_visitors: 1,
      }, {
        onConflict: 'landing_site_id,page_path,date',
      })
  }
}
