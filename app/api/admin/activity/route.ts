import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await adminSupabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Get login history across all users
    const { data: logins, error } = await adminSupabase
      .from('login_history')
      .select('*')
      .order('logged_in_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get profiles for all user_ids in this batch
    const userIds = [...new Set((logins || []).map(l => l.user_id))]
    let profileMap = new Map<string, any>()
    if (userIds.length > 0) {
      const { data: profiles } = await adminSupabase
        .from('user_profiles')
        .select('user_id, display_name, role')
        .in('user_id', userIds)
      for (const p of profiles || []) {
        profileMap.set(p.user_id, p)
      }
    }

    // Get emails
    const emailMap = new Map<string, string>()
    for (const uid of userIds) {
      const { data: { user: u } } = await adminSupabase.auth.admin.getUserById(uid)
      if (u?.email) emailMap.set(uid, u.email)
    }

    const enriched = (logins || []).map(l => ({
      ...l,
      user_email: emailMap.get(l.user_id) || null,
      user_display_name: profileMap.get(l.user_id)?.display_name || null,
      user_role: profileMap.get(l.user_id)?.role || 'user',
    }))

    return NextResponse.json({
      success: true,
      activity: enriched,
      offset,
      limit,
    })
  } catch (error) {
    console.error('Admin activity error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
