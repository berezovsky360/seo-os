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

    const searchParams = request.nextUrl.searchParams
    const feedId = searchParams.get('feed_id')
    const status = searchParams.get('status')
    const minScore = searchParams.get('min_score')
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '25')

    let query = supabase
      .from('content_items')
      .select('*, content_feeds(name)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (feedId) query = query.eq('feed_id', feedId)
    if (status) query = query.eq('status', status)
    if (minScore) query = query.gte('combined_score', parseFloat(minScore))

    query = query.range((page - 1) * perPage, page * perPage - 1)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ items: data || [], total: count || 0, page, per_page: perPage })
  } catch (error) {
    console.error('[API] GET /content-engine/items error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
