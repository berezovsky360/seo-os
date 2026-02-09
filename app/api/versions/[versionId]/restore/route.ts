import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Allowed fields for generated_articles
const ARTICLE_FIELDS = [
  'keyword', 'title', 'seo_title', 'seo_description', 'content', 'word_count',
  'status', 'additional_keywords', 'canonical_url', 'robots_meta',
  'og_title', 'og_description', 'og_image_url',
  'twitter_title', 'twitter_description', 'twitter_image_url', 'twitter_card_type',
  'readability_score', 'content_ai_score',
  'internal_links_count', 'external_links_count',
  'images_count', 'images_alt_count',
  'schema_article_type', 'schema_config',
  'seo_score', 'preliminary_seo_score',
]

// Allowed fields for posts
const POST_FIELDS = [
  'title', 'content', 'slug', 'status',
  'seo_title', 'seo_description', 'focus_keyword', 'word_count',
  'seo_score', 'is_indexable', 'schema_type',
  'additional_keywords', 'canonical_url', 'robots_meta',
  'og_title', 'og_description', 'og_image_url',
  'twitter_title', 'twitter_description', 'twitter_image_url', 'twitter_card_type',
  'readability_score', 'content_ai_score',
  'internal_links_count', 'external_links_count',
  'images_count', 'images_alt_count',
  'primary_category_id', 'schema_article_type', 'schema_config',
]

/**
 * POST /api/versions/[versionId]/restore
 * Restore article/post to a previous version
 * Creates a backup of current state before restoring
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const { versionId } = await params

    // Fetch the version to restore
    const { data: version, error: versionError } = await supabase
      .from('article_versions')
      .select('*')
      .eq('id', versionId)
      .single()

    if (versionError || !version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    const snapshot = version.snapshot as Record<string, any>
    const isArticle = !!version.article_id
    const targetId = version.article_id || version.post_id
    const tableName = isArticle ? 'generated_articles' : 'posts'
    const allowedFields = isArticle ? ARTICLE_FIELDS : POST_FIELDS

    // 1. Fetch current state to create backup before restore
    const { data: currentData } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', targetId)
      .single()

    if (!currentData) {
      return NextResponse.json(
        { error: 'Target article/post not found' },
        { status: 404 }
      )
    }

    // 2. Create backup version of current state
    const { data: lastVersion } = await supabase
      .from('article_versions')
      .select('version_number')
      .eq(isArticle ? 'article_id' : 'post_id', targetId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const nextVersionNumber = (lastVersion?.version_number || 0) + 1

    await supabase
      .from('article_versions')
      .insert({
        article_id: version.article_id,
        post_id: version.post_id,
        site_id: version.site_id,
        version_number: nextVersionNumber,
        version_label: `Before restore to v${version.version_number}`,
        snapshot: currentData,
        title: currentData.title || null,
        word_count: currentData.word_count || null,
        seo_score: currentData.seo_score || currentData.preliminary_seo_score || null,
      })

    // 3. Restore from snapshot using whitelisted fields
    const restoreData: Record<string, any> = {}
    for (const field of allowedFields) {
      if (field in snapshot) {
        restoreData[field] = snapshot[field]
      }
    }

    const { data: restored, error: restoreError } = await supabase
      .from(tableName)
      .update(restoreData)
      .eq('id', targetId)
      .select()
      .single()

    if (restoreError) {
      console.error('Error restoring version:', restoreError)
      return NextResponse.json(
        { error: 'Failed to restore version' },
        { status: 500 }
      )
    }

    console.log(`Restored ${tableName} ${targetId} to version #${version.version_number}`)

    return NextResponse.json({
      success: true,
      restoredVersion: version.version_number,
      backupVersion: nextVersionNumber,
      data: restored,
    })
  } catch (error) {
    console.error('Error in POST /api/versions/[versionId]/restore:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
