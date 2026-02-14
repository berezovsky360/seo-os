import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params

  const { data, error } = await supabase
    .from('landing_experiments')
    .select('*')
    .eq('landing_site_id', siteId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params
  const body = await request.json()

  // Get user_id from the landing_sites table
  const { data: site, error: siteError } = await supabase
    .from('landing_sites')
    .select('user_id')
    .eq('id', siteId)
    .single()

  if (siteError || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  const allowed: Record<string, any> = {
    landing_site_id: siteId,
    user_id: site.user_id,
    status: 'draft',
  }

  const fields = ['name', 'landing_page_id', 'status', 'goal_type', 'goal_selector']
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f]
  }

  const { data, error } = await supabase
    .from('landing_experiments')
    .insert(allowed)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
