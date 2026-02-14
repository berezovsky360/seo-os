import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; experimentId: string; variantId: string }> }
) {
  const { siteId, experimentId, variantId } = await params
  const body = await request.json()

  // Verify the experiment belongs to this site
  const { data: experiment, error: expError } = await supabase
    .from('landing_experiments')
    .select('landing_page_id')
    .eq('id', experimentId)
    .eq('landing_site_id', siteId)
    .single()

  if (expError || !experiment) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  const allowed: Record<string, any> = {}
  const fields = ['variant_key', 'content', 'title', 'seo_title', 'seo_description', 'weight', 'is_control']
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f]
  }

  const { data, error } = await supabase
    .from('landing_page_variants')
    .update(allowed)
    .eq('id', variantId)
    .eq('landing_page_id', experiment.landing_page_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ siteId: string; experimentId: string; variantId: string }> }
) {
  const { siteId, experimentId, variantId } = await params

  // Verify the experiment belongs to this site
  const { data: experiment, error: expError } = await supabase
    .from('landing_experiments')
    .select('landing_page_id')
    .eq('id', experimentId)
    .eq('landing_site_id', siteId)
    .single()

  if (expError || !experiment) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('landing_page_variants')
    .delete()
    .eq('id', variantId)
    .eq('landing_page_id', experiment.landing_page_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
