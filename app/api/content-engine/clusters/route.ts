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
      .from('content_clusters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (siteId) query = query.eq('site_id', siteId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ clusters: data || [] })
  } catch (error) {
    console.error('[API] GET /content-engine/clusters error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
