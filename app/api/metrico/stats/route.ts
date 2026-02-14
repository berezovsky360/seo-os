import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserId(): Promise<string | null> {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  return user?.id || null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Run all queries in parallel
  const [
    articlesRes,
    publishedArticlesRes,
    draftArticlesRes,
    wpPostsRes,
    lowSeoRes,
    avgSeoRes,
    wordCountRes,
    pageViewsRes,
    leadsRes,
    newLeadsRes,
    formsRes,
    magnetsRes,
    leadsByStageRes,
    funnelsRes,
    activeFunnelsRes,
    funnelEventsRes,
    keywordsRes,
    landingSitesRes,
    landingPagesRes,
    publishedPagesRes,
    aiUsageRes,
  ] = await Promise.all([
    // Content
    supabase.from('generated_articles').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('generated_articles').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'published'),
    supabase.from('generated_articles').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'draft'),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', userId).lt('seo_score', 80).gt('seo_score', 0),
    supabase.from('posts').select('seo_score').eq('user_id', userId).gt('seo_score', 0),
    supabase.from('generated_articles').select('word_count').eq('user_id', userId),

    // Traffic (pulse_page_views — may not exist, errors handled below)
    supabase.from('pulse_page_views').select('views, visitors, date').eq('user_id', userId).gte('date', thirtyDaysAgo.slice(0, 10)).order('date', { ascending: true }),

    // Leads
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', thirtyDaysAgo),
    supabase.from('lead_forms').select('id, submission_count').eq('user_id', userId),
    supabase.from('lead_magnets').select('id, download_count').eq('user_id', userId),
    supabase.from('leads').select('stage').eq('user_id', userId),

    // Funnels
    supabase.from('funnels').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('funnels').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
    supabase.from('funnel_events').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),

    // Keywords
    supabase.from('keywords').select('id, current_position, previous_position').eq('user_id', userId),

    // Landing
    supabase.from('landing_sites').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('landing_pages').select('id', { count: 'exact', head: true }),
    supabase.from('landing_pages').select('id', { count: 'exact', head: true }).eq('status', 'published'),

    // AI Usage
    supabase.from('ai_usage_log').select('tokens_used, estimated_cost').eq('user_id', userId).gte('created_at', thirtyDaysAgo),
  ])

  // Compute content stats
  const totalArticles = articlesRes.count || 0
  const publishedArticles = publishedArticlesRes.count || 0
  const draftArticles = draftArticlesRes.count || 0
  const totalWpPosts = wpPostsRes.count || 0
  const lowSeoArticles = lowSeoRes.count || 0

  const seoScores = (avgSeoRes.data || []).map((p: any) => p.seo_score).filter(Boolean)
  const avgSeoScore = seoScores.length > 0
    ? Math.round(seoScores.reduce((a: number, b: number) => a + b, 0) / seoScores.length)
    : 0

  const totalWordCount = (wordCountRes.data || []).reduce((sum: number, a: any) => sum + (a.word_count || 0), 0)

  // Traffic
  const viewsTrend = (pageViewsRes?.data || []).map((r: any) => ({
    date: r.date,
    views: r.views || 0,
    visitors: r.visitors || 0,
  }))
  const totalPageViews = viewsTrend.reduce((s: number, r: any) => s + r.views, 0)
  const totalVisitors = viewsTrend.reduce((s: number, r: any) => s + r.visitors, 0)

  // Leads
  const totalLeads = leadsRes.count || 0
  const newLeads30d = newLeadsRes.count || 0
  const totalForms = (formsRes.data || []).length
  const totalSubmissions = (formsRes.data || []).reduce((s: number, f: any) => s + (f.submission_count || 0), 0)
  const totalMagnets = (magnetsRes.data || []).length
  const totalDownloads = (magnetsRes.data || []).reduce((s: number, m: any) => s + (m.download_count || 0), 0)

  // Leads by stage
  const stageMap: Record<string, number> = {}
  for (const lead of (leadsByStageRes.data || [])) {
    const stage = lead.stage || 'new'
    stageMap[stage] = (stageMap[stage] || 0) + 1
  }
  const leadsByStage = Object.entries(stageMap).map(([stage, count]) => ({ stage, count }))

  // Funnels
  const totalFunnels = funnelsRes.count || 0
  const activeFunnels = activeFunnelsRes.count || 0
  const totalFunnelEvents = funnelEventsRes.count || 0

  // Keywords
  const kwData = keywordsRes.data || []
  const totalKeywords = kwData.length
  const positions = kwData.map((k: any) => k.current_position).filter((p: any) => p != null && p > 0)
  const avgPosition = positions.length > 0
    ? Math.round((positions.reduce((a: number, b: number) => a + b, 0) / positions.length) * 10) / 10
    : 0
  const improved = kwData.filter((k: any) => k.current_position && k.previous_position && k.current_position < k.previous_position).length
  const declined = kwData.filter((k: any) => k.current_position && k.previous_position && k.current_position > k.previous_position).length

  // Landing
  const totalLandingSites = landingSitesRes.count || 0
  const totalLandingPages = landingPagesRes.count || 0
  const publishedLandingPages = publishedPagesRes.count || 0

  // AI Usage
  const aiData = aiUsageRes.data || []
  const totalTokens30d = aiData.reduce((s: number, r: any) => s + (r.tokens_used || 0), 0)
  const estimatedCost30d = Math.round(aiData.reduce((s: number, r: any) => s + (r.estimated_cost || 0), 0) * 100) / 100

  return NextResponse.json({
    content: {
      total_articles: totalArticles,
      published_articles: publishedArticles,
      draft_articles: draftArticles,
      total_wp_posts: totalWpPosts,
      low_seo_articles: lowSeoArticles,
      avg_seo_score: avgSeoScore,
      total_word_count: totalWordCount,
    },
    traffic: {
      total_page_views: totalPageViews,
      total_visitors: totalVisitors,
      views_trend: viewsTrend,
    },
    leads: {
      total_leads: totalLeads,
      new_leads_30d: newLeads30d,
      total_forms: totalForms,
      total_submissions: totalSubmissions,
      total_magnets: totalMagnets,
      total_downloads: totalDownloads,
      leads_by_stage: leadsByStage,
    },
    funnels: {
      total_funnels: totalFunnels,
      active_funnels: activeFunnels,
      total_funnel_events: totalFunnelEvents,
    },
    keywords: {
      total_keywords: totalKeywords,
      avg_position: avgPosition,
      improved,
      declined,
    },
    landing: {
      total_sites: totalLandingSites,
      total_pages: totalLandingPages,
      published_pages: publishedLandingPages,
    },
    ai_usage: {
      total_tokens_30d: totalTokens30d,
      estimated_cost_30d: estimatedCost30d,
    },
  })
}
