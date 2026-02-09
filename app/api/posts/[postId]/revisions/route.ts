import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey, isEncrypted } from '@/lib/utils/encryption'
import { createWordPressClient } from '@/lib/wordpress/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/posts/[postId]/revisions
 * Fetch WordPress revisions for a synced post
 * Returns revision list with title, content snippet, date
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params

    // Get post from DB to find wp_post_id and site_id
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('wp_post_id, site_id')
      .eq('id', postId)
      .single()

    if (postError || !post || !post.wp_post_id) {
      return NextResponse.json(
        { error: 'Post not found or not synced with WordPress' },
        { status: 404 }
      )
    }

    // Get site credentials
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('url, wp_username, wp_app_password')
      .eq('id', post.site_id)
      .single()

    if (siteError || !site || !site.wp_username || !site.wp_app_password) {
      return NextResponse.json(
        { error: 'WordPress credentials not configured' },
        { status: 400 }
      )
    }

    // Decrypt password
    let appPassword = site.wp_app_password
    if (isEncrypted(appPassword)) {
      const encryptionKey = getEncryptionKey()
      appPassword = await decrypt(appPassword, encryptionKey)
    }

    // Fetch revisions from WordPress
    const wpClient = createWordPressClient({
      url: `https://${site.url}`,
      username: site.wp_username,
      appPassword,
    })

    const revisions = await wpClient.getRevisions(post.wp_post_id)

    // Map to a simpler format for the frontend
    const mapped = revisions.map((rev, index) => ({
      id: `wp-rev-${rev.id}`,
      wp_revision_id: rev.id,
      date: rev.date,
      title: rev.title?.rendered || 'Untitled',
      content_preview: stripHtml(rev.content?.rendered || '').slice(0, 200),
      word_count: stripHtml(rev.content?.rendered || '').split(/\s+/).filter(Boolean).length,
      revision_number: revisions.length - index, // newest = highest number
    }))

    return NextResponse.json({ success: true, revisions: mapped })
  } catch (error) {
    console.error('Error fetching WP revisions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch revisions' },
      { status: 500 }
    )
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}
