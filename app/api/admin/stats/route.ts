import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
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

    // Total users
    const { data: { users } } = await adminSupabase.auth.admin.listUsers()
    const totalUsers = users.length

    // Active users (7d / 30d) from login_history
    const now = new Date()
    const d7 = new Date(now.getTime() - 7 * 86400000).toISOString()
    const d30 = new Date(now.getTime() - 30 * 86400000).toISOString()

    const { data: logins7 } = await adminSupabase
      .from('login_history')
      .select('user_id')
      .gte('logged_in_at', d7)

    const { data: logins30 } = await adminSupabase
      .from('login_history')
      .select('user_id')
      .gte('logged_in_at', d30)

    const activeUsers7d = new Set((logins7 || []).map(l => l.user_id)).size
    const activeUsers30d = new Set((logins30 || []).map(l => l.user_id)).size

    // Total sites
    const { count: totalSites } = await adminSupabase
      .from('sites')
      .select('*', { count: 'exact', head: true })

    // Total articles (generated_articles)
    const { count: totalArticles } = await adminSupabase
      .from('generated_articles')
      .select('*', { count: 'exact', head: true })

    // Total WP posts
    const { count: totalPosts } = await adminSupabase
      .from('posts')
      .select('*', { count: 'exact', head: true })

    // Total content items (RSS)
    const { count: totalContentItems } = await adminSupabase
      .from('content_items')
      .select('*', { count: 'exact', head: true })

    // Total swipe decisions
    const { count: totalSwipes } = await adminSupabase
      .from('swipe_decisions')
      .select('*', { count: 'exact', head: true })

    // Signups per week (last 8 weeks)
    const signupsPerWeek: { week: string; count: number }[] = []
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86400000)
      const weekEnd = new Date(now.getTime() - i * 7 * 86400000)
      const count = users.filter(u => {
        const d = new Date(u.created_at)
        return d >= weekStart && d < weekEnd
      }).length
      signupsPerWeek.push({
        week: weekStart.toISOString().split('T')[0],
        count,
      })
    }

    return NextResponse.json({
      success: true,
      stats: {
        total_users: totalUsers,
        active_users_7d: activeUsers7d,
        active_users_30d: activeUsers30d,
        total_sites: totalSites || 0,
        total_articles: totalArticles || 0,
        total_posts: totalPosts || 0,
        total_content_items: totalContentItems || 0,
        total_swipes: totalSwipes || 0,
        avg_sites_per_user: totalUsers > 0 ? Math.round(((totalSites || 0) / totalUsers) * 10) / 10 : 0,
        signups_per_week: signupsPerWeek,
      },
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
