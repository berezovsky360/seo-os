import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { decrypt, getEncryptionKey, isEncrypted } from '@/lib/utils/encryption'
import { createWordPressClient } from '@/lib/wordpress/client'

// Server-side Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Sync all enabled redirects to WordPress plugin cache.
 * Silently catches errors so sync failure never blocks CRUD operations.
 */
async function syncRedirectsToWP(siteId: string): Promise<void> {
  try {
    // Fetch all enabled redirects for this site
    const { data: redirects, error: redirectsError } = await supabase
      .from('redirects')
      .select('id, source_path, target_url, type, is_regex, enabled, auto_generated, note')
      .eq('site_id', siteId)
      .eq('enabled', true)

    if (redirectsError || !redirects) return

    // Get site credentials
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('url, wp_username, wp_app_password')
      .eq('id', siteId)
      .single()

    if (siteError || !site || !site.wp_username || !site.wp_app_password) return

    // Decrypt password if encrypted
    let appPassword = site.wp_app_password
    if (isEncrypted(appPassword)) {
      appPassword = await decrypt(appPassword, getEncryptionKey())
    }

    // Create WordPress client and sync
    const client = createWordPressClient({
      url: `https://${site.url}`,
      username: site.wp_username,
      appPassword,
    })

    await client.syncRedirects(redirects)
  } catch (error) {
    console.error('[Redirects] WP sync failed (non-blocking):', error)
  }
}

/**
 * GET /api/sites/[siteId]/redirects
 * List redirects for a site with optional filters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const type = searchParams.get('type')
    const enabled = searchParams.get('enabled')

    let query = supabase
      .from('redirects')
      .select('*', { count: 'exact' })
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })

    // Filter by search term (source_path or target_url)
    if (search) {
      query = query.or(`source_path.ilike.%${search}%,target_url.ilike.%${search}%`)
    }

    // Filter by redirect type (301/302/307)
    if (type) {
      query = query.eq('type', type)
    }

    // Filter by enabled status
    if (enabled !== null && enabled !== undefined) {
      query = query.eq('enabled', enabled === 'true')
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching redirects:', error)
      return NextResponse.json(
        { error: 'Failed to fetch redirects' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      redirects: data,
      count,
    })
  } catch (error) {
    console.error('Error fetching redirects:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sites/[siteId]/redirects
 * Create a new redirect rule
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params
    const body = await request.json()
    const { source_path, target_url, type, is_regex, note } = body

    // Validate required fields
    if (!source_path || !target_url) {
      return NextResponse.json(
        { error: 'source_path and target_url are required' },
        { status: 400 }
      )
    }

    // Validate source_path starts with /
    if (!source_path.startsWith('/')) {
      return NextResponse.json(
        { error: 'source_path must start with /' },
        { status: 400 }
      )
    }

    // Self-redirect check (source = target would cause infinite loop)
    const targetPath = target_url.startsWith('/')
      ? target_url
      : (() => { try { return new URL(target_url).pathname } catch { return '' } })()
    if (targetPath && (source_path.replace(/\/+$/, '') || '/') === (targetPath.replace(/\/+$/, '') || '/')) {
      return NextResponse.json(
        { error: 'Source and target are the same — this would cause an infinite redirect loop' },
        { status: 400 }
      )
    }

    // Loop detection: check existing redirects for chains A→B→...→A
    const { data: existingRedirects } = await supabase
      .from('redirects')
      .select('source_path, target_url, enabled')
      .eq('site_id', siteId)
      .eq('enabled', true)

    if (existingRedirects) {
      const visited = new Set([(source_path.replace(/\/+$/, '') || '/')])
      let current = target_url
      for (let i = 0; i < 10; i++) {
        const cp = current.startsWith('/')
          ? current
          : (() => { try { return new URL(current).pathname } catch { return null } })()
        if (!cp) break
        const normalized = cp.replace(/\/+$/, '') || '/'
        if (visited.has(normalized)) {
          return NextResponse.json(
            { error: 'This redirect would create a redirect loop (A → B → ... → A)' },
            { status: 400 }
          )
        }
        visited.add(normalized)
        const next = existingRedirects.find(r =>
          (r.source_path.replace(/\/+$/, '') || '/') === normalized
        )
        if (!next) break
        current = next.target_url
      }
    }

    // Get authenticated user
    const authClient = await createServerClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Insert redirect
    const { data, error } = await supabase
      .from('redirects')
      .insert({
        user_id: user.id,
        site_id: siteId,
        source_path,
        target_url,
        type: type || '301',
        is_regex: is_regex || false,
        note: note || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating redirect:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A redirect for this source path already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create redirect' },
        { status: 500 }
      )
    }

    // Sync to WordPress (non-blocking)
    await syncRedirectsToWP(siteId)

    return NextResponse.json({
      success: true,
      redirect: data,
    })
  } catch (error) {
    console.error('Error creating redirect:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/sites/[siteId]/redirects
 * Update an existing redirect rule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params
    const body = await request.json()
    const { id, source_path, target_url, type, is_regex, enabled, note } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Redirect id is required' },
        { status: 400 }
      )
    }

    // Validate source_path starts with / if provided
    if (source_path && !source_path.startsWith('/')) {
      return NextResponse.json(
        { error: 'source_path must start with /' },
        { status: 400 }
      )
    }

    // Build update object with only provided fields
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (source_path !== undefined) updates.source_path = source_path
    if (target_url !== undefined) updates.target_url = target_url
    if (type !== undefined) updates.type = type
    if (is_regex !== undefined) updates.is_regex = is_regex
    if (enabled !== undefined) updates.enabled = enabled
    if (note !== undefined) updates.note = note

    const { data, error } = await supabase
      .from('redirects')
      .update(updates)
      .eq('id', id)
      .eq('site_id', siteId)
      .select()
      .single()

    if (error) {
      console.error('Error updating redirect:', error)
      return NextResponse.json(
        { error: 'Failed to update redirect' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Redirect not found' },
        { status: 404 }
      )
    }

    // Sync to WordPress (non-blocking)
    await syncRedirectsToWP(siteId)

    return NextResponse.json({
      success: true,
      redirect: data,
    })
  } catch (error) {
    console.error('Error updating redirect:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/sites/[siteId]/redirects
 * Delete a redirect rule by id query param
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('redirects')
      .delete()
      .eq('id', id)
      .eq('site_id', siteId)

    if (error) {
      console.error('Error deleting redirect:', error)
      return NextResponse.json(
        { error: 'Failed to delete redirect' },
        { status: 500 }
      )
    }

    // Sync to WordPress (non-blocking)
    await syncRedirectsToWP(siteId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting redirect:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
