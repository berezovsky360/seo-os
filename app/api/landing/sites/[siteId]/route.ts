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
    .from('landing_sites')
    .select('*, landing_templates(id, name, slug, manifest, layouts, partials, critical_css, theme_css)')
    .eq('id', siteId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params
  const body = await request.json()

  const allowed: Record<string, any> = {}
  const fields = ['name', 'template_id', 'domain', 'subdomain', 'config', 'nav_links', 'footer_html', 'analytics_id', 'is_published']
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f]
  }

  const { data, error } = await supabase
    .from('landing_sites')
    .update(allowed)
    .eq('id', siteId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params

  const { error } = await supabase
    .from('landing_sites')
    .delete()
    .eq('id', siteId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
