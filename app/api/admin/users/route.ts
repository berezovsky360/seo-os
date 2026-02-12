import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function requireSuperAdmin() {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  const { data: profile } = await adminSupabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    return { error: 'Forbidden', status: 403 }
  }
  return { user }
}

export async function GET() {
  try {
    const auth = await requireSuperAdmin()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // Get all users from Supabase Auth
    const { data: { users }, error: usersError } = await adminSupabase.auth.admin.listUsers()
    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    // Get all profiles
    const { data: profiles } = await adminSupabase
      .from('user_profiles')
      .select('*')

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]))

    // Get site counts per user
    const { data: siteCounts } = await adminSupabase
      .from('sites')
      .select('user_id')

    const siteCountMap = new Map<string, number>()
    for (const s of siteCounts || []) {
      siteCountMap.set(s.user_id, (siteCountMap.get(s.user_id) || 0) + 1)
    }

    // Get last login per user
    const { data: logins } = await adminSupabase
      .from('login_history')
      .select('user_id, logged_in_at, ip_address, device_label, country, city')
      .order('logged_in_at', { ascending: false })

    const lastLoginMap = new Map<string, any>()
    for (const l of logins || []) {
      if (!lastLoginMap.has(l.user_id)) {
        lastLoginMap.set(l.user_id, l)
      }
    }

    // Merge all data
    const enrichedUsers = users.map(u => {
      const profile = profileMap.get(u.id)
      const lastLogin = lastLoginMap.get(u.id)
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        role: profile?.role || 'user',
        display_name: profile?.display_name || null,
        avatar_emoji: profile?.avatar_emoji || null,
        sites_count: siteCountMap.get(u.id) || 0,
        last_login: lastLogin ? {
          at: lastLogin.logged_in_at,
          ip: lastLogin.ip_address,
          device: lastLogin.device_label,
          location: [lastLogin.city, lastLogin.country].filter(Boolean).join(', ') || null,
        } : null,
      }
    })

    return NextResponse.json({ success: true, users: enrichedUsers })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
