import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserId(): Promise<string | null> {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  return user?.id || null
}

export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const siteId = request.nextUrl.searchParams.get('site_id')
  const stage = request.nextUrl.searchParams.get('stage')
  const search = request.nextUrl.searchParams.get('search')
  const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
  const perPage = parseInt(request.nextUrl.searchParams.get('per_page') || '50')

  let query = serviceSupabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (siteId) query = query.eq('landing_site_id', siteId)
  if (stage) query = query.eq('pipeline_stage', stage)
  if (search) query = query.ilike('email', `%${search}%`)

  query = query.range((page - 1) * perPage, page * perPage - 1)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ leads: data, total: count || 0, page, per_page: perPage })
}
