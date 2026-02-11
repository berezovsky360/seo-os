import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Server-side Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/sites/[siteId]/redirects/404-log
 * List 404 entries for a site, ordered by hits descending
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params
    const { searchParams } = new URL(request.url)
    const resolved = searchParams.get('resolved')

    let query = supabase
      .from('redirect_404_log')
      .select('*', { count: 'exact' })
      .eq('site_id', siteId)
      .order('hits', { ascending: false })

    // Filter by resolved status
    if (resolved !== null && resolved !== undefined) {
      query = query.eq('resolved', resolved === 'true')
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching 404 log:', error)
      return NextResponse.json(
        { error: 'Failed to fetch 404 log' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      entries: data,
      count,
    })
  } catch (error) {
    console.error('Error fetching 404 log:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sites/[siteId]/redirects/404-log
 * Upsert a 404 entry (increment hits if path already exists)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params
    const body = await request.json()
    const { path, referer, user_agent } = body

    if (!path) {
      return NextResponse.json(
        { error: 'path is required' },
        { status: 400 }
      )
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

    // Use the RPC function for atomic upsert with hit increment
    const { error } = await supabase.rpc('upsert_404_log', {
      p_user_id: user.id,
      p_site_id: siteId,
      p_path: path,
      p_referer: referer || null,
      p_user_agent: user_agent || null,
    })

    if (error) {
      console.error('Error upserting 404 entry:', error)
      return NextResponse.json(
        { error: 'Failed to log 404 entry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error upserting 404 entry:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/sites/[siteId]/redirects/404-log
 * Mark a 404 entry as resolved by id query param
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

    const { data, error } = await supabase
      .from('redirect_404_log')
      .update({ resolved: true })
      .eq('id', id)
      .eq('site_id', siteId)
      .select()
      .single()

    if (error) {
      console.error('Error resolving 404 entry:', error)
      return NextResponse.json(
        { error: 'Failed to resolve 404 entry' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: '404 entry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      entry: data,
    })
  } catch (error) {
    console.error('Error resolving 404 entry:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
