import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/versions?articleId=xxx or ?postId=xxx
 * List versions for an article or post, sorted by newest first
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const articleId = searchParams.get('articleId')
    const postId = searchParams.get('postId')

    if (!articleId && !postId) {
      return NextResponse.json(
        { error: 'articleId or postId query parameter required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('article_versions')
      .select('id, version_number, version_label, created_at, title, word_count, seo_score')
      .order('created_at', { ascending: false })
      .limit(50)

    if (articleId) {
      query = query.eq('article_id', articleId)
    } else {
      query = query.eq('post_id', postId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching versions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch versions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, versions: data || [] })
  } catch (error) {
    console.error('Error in GET /api/versions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/versions
 * Create a new version (snapshot) of an article or post
 * Body: { articleId?, postId?, siteId, label? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { articleId, postId, siteId, label } = body

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId is required' },
        { status: 400 }
      )
    }

    if (!articleId && !postId) {
      return NextResponse.json(
        { error: 'articleId or postId is required' },
        { status: 400 }
      )
    }

    // Fetch current state from the correct table
    let currentData: any = null

    if (articleId) {
      const { data } = await supabase
        .from('generated_articles')
        .select('*')
        .eq('id', articleId)
        .single()
      currentData = data
    } else {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single()
      currentData = data
    }

    if (!currentData) {
      return NextResponse.json(
        { error: 'Source article/post not found' },
        { status: 404 }
      )
    }

    // Calculate next version number
    const filterCol = articleId ? 'article_id' : 'post_id'
    const filterId = articleId || postId

    const { data: lastVersion } = await supabase
      .from('article_versions')
      .select('version_number')
      .eq(filterCol, filterId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const nextVersionNumber = (lastVersion?.version_number || 0) + 1

    // Insert version
    const { data: version, error } = await supabase
      .from('article_versions')
      .insert({
        article_id: articleId || null,
        post_id: postId || null,
        site_id: siteId,
        version_number: nextVersionNumber,
        version_label: label || 'Auto-backup',
        snapshot: currentData,
        title: currentData.title || null,
        word_count: currentData.word_count || null,
        seo_score: currentData.seo_score || currentData.preliminary_seo_score || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating version:', error)
      return NextResponse.json(
        { error: 'Failed to create version' },
        { status: 500 }
      )
    }

    console.log(`Version #${nextVersionNumber} created for ${articleId ? 'article' : 'post'} ${filterId}`)

    // Retention policy: keep max 50 versions per article, delete versions older than 30 days
    try {
      // 1. Delete versions older than 30 days (keep labeled "Before publish" ones longer)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      await supabase
        .from('article_versions')
        .delete()
        .eq(filterCol, filterId)
        .lt('created_at', thirtyDaysAgo)
        .eq('version_label', 'Auto-backup') // only auto-backups, keep manual & pre-publish

      // 2. If more than 50 versions remain, delete oldest auto-backups
      const { data: allVersions } = await supabase
        .from('article_versions')
        .select('id, version_label')
        .eq(filterCol, filterId)
        .order('created_at', { ascending: true })

      if (allVersions && allVersions.length > 50) {
        const autoBackups = allVersions.filter(v => v.version_label === 'Auto-backup')
        const toDelete = autoBackups.slice(0, allVersions.length - 50)
        if (toDelete.length > 0) {
          await supabase
            .from('article_versions')
            .delete()
            .in('id', toDelete.map(v => v.id))
        }
      }
    } catch (cleanupError) {
      // Non-blocking - don't fail the version creation
      console.error('Version cleanup error (non-blocking):', cleanupError)
    }

    return NextResponse.json({ success: true, version })
  } catch (error) {
    console.error('Error in POST /api/versions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
