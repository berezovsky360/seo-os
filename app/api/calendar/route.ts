import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/calendar?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const endDateTime = endDate + 'T23:59:59'

    // WordPress posts with published_at in range
    const { data: wpPosts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, status, seo_score, published_at, created_at, site_id, sites(name, favicon)')
      .gte('published_at', startDate)
      .lte('published_at', endDateTime)
      .order('published_at', { ascending: true })

    if (postsError) throw postsError

    // Published generated articles (use published_at)
    const { data: articlesPublished, error: artPubError } = await supabase
      .from('generated_articles')
      .select('id, title, keyword, status, seo_score, preliminary_seo_score, published_at, created_at, site_id, sites(name, favicon)')
      .eq('status', 'published')
      .gte('published_at', startDate)
      .lte('published_at', endDateTime)

    if (artPubError) throw artPubError

    // Draft/reviewed generated articles (use created_at)
    const { data: articlesDraft, error: artDraftError } = await supabase
      .from('generated_articles')
      .select('id, title, keyword, status, seo_score, preliminary_seo_score, published_at, created_at, site_id, sites(name, favicon)')
      .in('status', ['draft', 'reviewed'])
      .gte('created_at', startDate)
      .lte('created_at', endDateTime)

    if (artDraftError) throw artDraftError

    const calendarPosts = [
      ...(wpPosts || []).map(p => ({
        id: `wp-${p.id}`,
        rawId: p.id,
        siteId: p.site_id,
        title: p.title || 'Untitled',
        site: (p.sites as any)?.name || 'Unknown',
        favicon: (p.sites as any)?.favicon || null,
        status: p.status as string,
        seoScore: p.seo_score || 0,
        date: ((p.published_at || p.created_at) as string).split('T')[0],
        source: 'posts' as const,
      })),
      ...(articlesPublished || []).map(a => ({
        id: `art-${a.id}`,
        rawId: a.id,
        siteId: a.site_id,
        title: a.title || a.keyword || 'Untitled',
        site: (a.sites as any)?.name || 'Unknown',
        favicon: (a.sites as any)?.favicon || null,
        status: a.status as string,
        seoScore: a.seo_score || a.preliminary_seo_score || 0,
        date: ((a.published_at || a.created_at) as string).split('T')[0],
        source: 'articles' as const,
      })),
      ...(articlesDraft || []).map(a => ({
        id: `art-${a.id}`,
        rawId: a.id,
        siteId: a.site_id,
        title: a.title || a.keyword || 'Untitled',
        site: (a.sites as any)?.name || 'Unknown',
        favicon: (a.sites as any)?.favicon || null,
        status: a.status as string,
        seoScore: a.seo_score || a.preliminary_seo_score || 0,
        date: (a.created_at as string).split('T')[0],
        source: 'articles' as const,
      })),
    ]

    return NextResponse.json({ posts: calendarPosts })
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    )
  }
}
