import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/competitor-analysis/competitors?siteId=xxx
export async function GET(request: NextRequest) {
  try {
    const siteId = request.nextUrl.searchParams.get('siteId')
    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('competitors')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ competitors: data || [] })
  } catch (error) {
    console.error('Competitors GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 })
  }
}

// POST /api/competitor-analysis/competitors
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { site_id, domain, name } = body

    if (!site_id || !domain) {
      return NextResponse.json({ error: 'site_id and domain are required' }, { status: 400 })
    }

    const normalizedDomain = domain.trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')

    // Get user_id from site
    const { data: site } = await supabase
      .from('sites')
      .select('user_id')
      .eq('id', site_id)
      .single()

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('competitors')
      .insert({
        site_id,
        user_id: site.user_id,
        domain: normalizedDomain,
        name: name?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Competitor domain already exists for this site' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ competitor: data }, { status: 201 })
  } catch (error) {
    console.error('Competitors POST error:', error)
    return NextResponse.json({ error: 'Failed to add competitor' }, { status: 500 })
  }
}

// DELETE /api/competitor-analysis/competitors?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('competitors')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Competitors DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete competitor' }, { status: 500 })
  }
}
