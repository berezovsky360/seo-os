import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/sites/[siteId]/stats
 * Get site statistics (published posts, drafts, 404 errors, etc.)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params

    // Count published posts
    const { count: publishedCount, error: publishedError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('status', 'publish')

    // Count draft posts
    const { count: draftCount, error: draftError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('status', 'draft')

    // Count pending posts
    const { count: pendingCount, error: pendingError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('status', 'pending')

    // Count generated articles (queued)
    const { count: queuedCount, error: queuedError } = await supabase
      .from('generated_articles')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('status', 'draft')

    // Count generated articles (reviewed)
    const { count: reviewedCount, error: reviewedError } = await supabase
      .from('generated_articles')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('status', 'reviewed')

    // Count generated articles (published)
    const { count: generatedPublishedCount, error: generatedPublishedError } = await supabase
      .from('generated_articles')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('status', 'published')

    // TODO: Get 404 errors from Google Search Console
    // For now, return 0 or mock data
    const notFoundCount = 0

    if (publishedError || draftError || pendingError || queuedError || reviewedError || generatedPublishedError) {
      throw new Error('Failed to fetch statistics')
    }

    return NextResponse.json({
      success: true,
      stats: {
        live: publishedCount || 0,
        drafts: draftCount || 0,
        pending: pendingCount || 0,
        queued: queuedCount || 0,
        reviewed: reviewedCount || 0,
        articles: generatedPublishedCount || 0,
        notFoundCount: notFoundCount,
      },
    })
  } catch (error) {
    console.error('Error fetching site stats:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch statistics',
      },
      { status: 500 }
    )
  }
}
