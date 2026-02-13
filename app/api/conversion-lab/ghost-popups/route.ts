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

  let query = serviceSupabase
    .from('ghost_popups')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (siteId) query = query.eq('landing_site_id', siteId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { landing_site_id, name, trigger_rules, popup_html, popup_css } = body

  if (!landing_site_id || !name) {
    return NextResponse.json({ error: 'landing_site_id and name are required' }, { status: 400 })
  }

  const { data, error } = await serviceSupabase
    .from('ghost_popups')
    .insert({
      user_id: userId,
      landing_site_id,
      name,
      trigger_rules: trigger_rules || { trigger: 'time_delay', value: 30, show_once: true },
      popup_html: popup_html || '<div><h2>Special Offer</h2></div>',
      popup_css: popup_css || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
