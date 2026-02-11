import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const siteId = request.nextUrl.searchParams.get('site_id')

    let query = supabase
      .from('content_feeds')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (siteId) query = query.eq('site_id', siteId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ feeds: data || [] })
  } catch (error) {
    console.error('[API] GET /content-engine/feeds error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, feed_url, site_id, feed_type, poll_interval_minutes } = body

    if (!name || !feed_url) {
      return NextResponse.json({ error: 'name and feed_url required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('content_feeds')
      .insert({
        user_id: user.id,
        name,
        feed_url,
        site_id: site_id || null,
        feed_type: feed_type || 'rss',
        poll_interval_minutes: poll_interval_minutes || 60,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ feed: data }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /content-engine/feeds error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
