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
    .from('lead_forms')
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
  const { name, form_type, landing_site_id, fields, magnet_id, button_text, success_message, popup_config } = body

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data, error } = await serviceSupabase
    .from('lead_forms')
    .insert({
      user_id: userId,
      name,
      form_type: form_type || 'inline',
      landing_site_id: landing_site_id || null,
      fields: fields || [{ name: 'email', type: 'email', required: true }],
      magnet_id: magnet_id || null,
      button_text: button_text || 'Download',
      success_message: success_message || 'Thank you!',
      popup_config: popup_config || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
