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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireSuperAdmin()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { userId } = await params

    // Get user from auth
    const { data: { user: targetUser }, error: userError } = await adminSupabase.auth.admin.getUserById(userId)
    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get profile
    const { data: profile } = await adminSupabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Get sites
    const { data: sites } = await adminSupabase
      .from('sites')
      .select('id, name, url, is_active, is_competitor, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Get login history
    const { data: loginHistory } = await adminSupabase
      .from('login_history')
      .select('*')
      .eq('user_id', userId)
      .order('logged_in_at', { ascending: false })
      .limit(20)

    // Get active sessions
    const { data: sessions } = await adminSupabase
      .from('active_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_active_at', { ascending: false })

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        created_at: targetUser.created_at,
        last_sign_in_at: targetUser.last_sign_in_at,
        email_confirmed_at: targetUser.email_confirmed_at,
        role: profile?.role || 'user',
        display_name: profile?.display_name || null,
        avatar_emoji: profile?.avatar_emoji || null,
      },
      sites: sites || [],
      login_history: loginHistory || [],
      sessions: sessions || [],
    })
  } catch (error) {
    console.error('Admin user detail error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireSuperAdmin()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { userId } = await params
    const body = await request.json()

    // Whitelist allowed fields
    const ALLOWED = ['role', 'display_name']
    const updates: Record<string, any> = {}
    for (const key of ALLOWED) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Validate role
    if (updates.role && !['super_admin', 'admin', 'user'].includes(updates.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Prevent self-downgrade
    if (updates.role && userId === auth.user.id && updates.role !== 'super_admin') {
      return NextResponse.json({ error: 'Cannot downgrade your own role' }, { status: 400 })
    }

    const { data, error } = await adminSupabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: data })
  } catch (error) {
    console.error('Admin user update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
