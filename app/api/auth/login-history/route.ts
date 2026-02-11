import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/auth/login-history
export async function GET(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || ''

    // Try to get user from cookie-based session via supabase-ssr
    const { createServerClient } = await import('@supabase/ssr')
    const cookieStore = request.cookies
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: history, error } = await supabase
      .from('login_history')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_in_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json({ history: history || [] })
  } catch (error) {
    console.error('Login history error:', error)
    return NextResponse.json({ error: 'Failed to fetch login history' }, { status: 500 })
  }
}
