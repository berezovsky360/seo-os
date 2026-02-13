import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ siteId: string; pageId: string }> }
) {
  const { siteId, pageId } = await params

  const { data, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('id', pageId)
    .eq('landing_site_id', siteId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; pageId: string }> }
) {
  const { siteId, pageId } = await params
  const body = await request.json()

  const allowed: Record<string, any> = {}
  const fields = [
    'slug', 'page_type', 'title', 'seo_title', 'seo_description',
    'content', 'og_image', 'category', 'tags', 'author_name',
    'word_count', 'reading_time', 'featured_image_url',
    'is_published', 'sort_order', 'published_at',
  ]
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f]
  }

  // Auto-set published_at when publishing
  if (body.is_published && !body.published_at) {
    allowed.published_at = new Date().toISOString()
  }

  allowed.modified_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('landing_pages')
    .update(allowed)
    .eq('id', pageId)
    .eq('landing_site_id', siteId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ siteId: string; pageId: string }> }
) {
  const { siteId, pageId } = await params

  const { error } = await supabase
    .from('landing_pages')
    .delete()
    .eq('id', pageId)
    .eq('landing_site_id', siteId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
