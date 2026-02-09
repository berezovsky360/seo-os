import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Service role client for querying events_log
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/core/events
 * Read the event log with optional filters.
 * Query params: site_id, event_type, severity, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const site_id = searchParams.get('site_id')
    const event_type = searchParams.get('event_type')
    const severity = searchParams.get('severity')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('events_log')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (site_id) query = query.eq('site_id', site_id)
    if (event_type) query = query.like('event_type', `${event_type}%`)
    if (severity) query = query.eq('severity', severity)

    const { data, error, count } = await query

    if (error) {
      console.error('[API] /core/events error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ events: data || [], total: count || 0 })
  } catch (error) {
    console.error('[API] /core/events error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
