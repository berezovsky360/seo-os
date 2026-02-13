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
    .from('landing_pages')
    .select('id, slug, page_type, title, seo_title, seo_description, category, tags, author_name, word_count, reading_time, is_published, published_at, modified_at, created_at')
    .eq('landing_site_id', siteId)
    .order('sort_order')
    .order('published_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params
  const body = await request.json()

  const allowed: Record<string, any> = {
    landing_site_id: siteId,
    slug: body.slug,
    title: body.title,
    page_type: body.page_type || 'post',
    seo_title: body.seo_title || null,
    seo_description: body.seo_description || null,
    content: body.content || null,
    og_image: body.og_image || null,
    category: body.category || null,
    tags: body.tags || null,
    author_name: body.author_name || null,
    word_count: body.word_count || null,
    reading_time: body.reading_time || null,
    featured_image_url: body.featured_image_url || null,
    is_published: body.is_published ?? false,
    sort_order: body.sort_order ?? 0,
    published_at: body.is_published ? (body.published_at || new Date().toISOString()) : null,
  }

  const { data, error } = await supabase
    .from('landing_pages')
    .insert(allowed)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
