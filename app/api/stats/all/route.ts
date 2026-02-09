import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/stats/all
 * Get statistics for all sites (published posts, drafts, generated articles, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    // Get all sites
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id')
      .eq('is_active', true)

    if (sitesError) {
      throw new Error('Failed to fetch sites')
    }

    // Get stats for each site
    const statsPromises = sites.map(async (site) => {
      const siteId = site.id

      // Count published posts
      const { count: publishedCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('site_id', siteId)
        .eq('status', 'publish')

      // Count draft posts
      const { count: draftCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('site_id', siteId)
        .eq('status', 'draft')

      // Count generated articles (queued)
      const { count: queuedCount } = await supabase
        .from('generated_articles')
        .select('*', { count: 'exact', head: true })
        .eq('site_id', siteId)
        .in('status', ['draft', 'reviewed'])

      // Count generated articles (published)
      const { count: articlesCount } = await supabase
        .from('generated_articles')
        .select('*', { count: 'exact', head: true })
        .eq('site_id', siteId)
        .eq('status', 'published')

      return {
        siteId,
        live: publishedCount || 0,
        drafts: draftCount || 0,
        queued: queuedCount || 0,
        articles: articlesCount || 0,
        notFoundCount: 0, // TODO: Get from Google Search Console
      }
    })

    const stats = await Promise.all(statsPromises)

    // Convert to map for easy lookup
    const statsMap = stats.reduce((acc, stat) => {
      acc[stat.siteId] = stat
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      success: true,
      stats: statsMap,
    })
  } catch (error) {
    console.error('Error fetching all site stats:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch statistics',
      },
      { status: 500 }
    )
  }
}
