import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * GET /api/rank-pulse/keywords?site_id=...
 * List all tracked keywords for a site, with latest position data.
 */
export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const site_id = searchParams.get('site_id')

    if (!site_id) {
      return NextResponse.json(
        { error: 'Missing required query param: site_id' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Query keywords with latest position history entry
    const { data: keywords, error } = await serviceClient
      .from('keywords')
      .select(`
        *,
        keyword_position_history (
          position,
          checked_at
        )
      `)
      .eq('site_id', site_id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API] rank-pulse/keywords GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Flatten: attach only the latest history entry to each keyword
    const result = (keywords || []).map((kw) => {
      const history = kw.keyword_position_history as Array<{
        position: number | null
        checked_at: string
      }> | null

      // Sort by checked_at descending and pick the first
      const latest = history
        ?.sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime())
        ?.[0] || null

      const { keyword_position_history, ...rest } = kw
      return {
        ...rest,
        latest_position: latest?.position ?? null,
        latest_checked_at: latest?.checked_at ?? null,
      }
    })

    return NextResponse.json({ keywords: result })
  } catch (error) {
    console.error('[API] rank-pulse/keywords GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/rank-pulse/keywords
 * Create a new tracked keyword.
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { site_id, keyword, language, location_code } = body

    if (!site_id || !keyword) {
      return NextResponse.json(
        { error: 'Missing required fields: site_id, keyword' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await serviceClient
      .from('keywords')
      .insert({
        user_id: user.id,
        site_id,
        keyword: keyword.trim(),
        language: language || 'ru',
        location_code: location_code || 2643,
      })
      .select()
      .single()

    if (error) {
      console.error('[API] rank-pulse/keywords POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[API] rank-pulse/keywords POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/rank-pulse/keywords?id=...
 * Delete a tracked keyword by ID.
 */
export async function DELETE(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required query param: id' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Ensure the keyword belongs to the authenticated user before deleting
    const { error } = await serviceClient
      .from('keywords')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[API] rank-pulse/keywords DELETE error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] rank-pulse/keywords DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
