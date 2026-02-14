import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserId(): Promise<string | null> {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  return user?.id || null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('landing_sites')
    .select('*, landing_templates(id, name, slug)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const allowed: Record<string, any> = {
    user_id: userId,
    template_id: body.template_id || null,
    name: body.name || 'My Site',
    domain: body.domain || null,
    subdomain: body.subdomain || null,
    config: body.config || {},
    nav_links: body.nav_links || [],
    footer_html: body.footer_html || null,
    analytics_id: body.analytics_id || null,
    site_id: body.site_id || null,
  }

  const { data, error } = await supabase
    .from('landing_sites')
    .insert(allowed)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
