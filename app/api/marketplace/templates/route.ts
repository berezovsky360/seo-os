import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/marketplace/templates — list templates (public)
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const category = sp.get('category')
    const search = sp.get('search')
    const sort = sp.get('sort') || 'popular'

    let query = supabase
      .from('recipe_templates')
      .select('*')
      .eq('is_public', true)

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'featured':
        query = query.order('featured', { ascending: false }).order('install_count', { ascending: false })
        break
      default: // popular
        query = query.order('install_count', { ascending: false })
    }

    const { data, error } = await query.limit(50)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ templates: data || [] })
  } catch (error) {
    console.error('[API] GET /marketplace/templates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/marketplace/templates — publish own recipe to marketplace
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, description, category, tags, icon, trigger_event, trigger_conditions, actions, graph_layout, required_modules } = body

    if (!name || !trigger_event || !actions) {
      return NextResponse.json({ error: 'Missing required fields: name, trigger_event, actions' }, { status: 400 })
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36)

    const { data, error } = await supabase
      .from('recipe_templates')
      .insert({
        author_id: user.id,
        author_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
        slug,
        name,
        description: description || null,
        category: category || 'general',
        tags: tags || [],
        icon: icon || 'Zap',
        trigger_event,
        trigger_conditions: trigger_conditions || {},
        actions,
        graph_layout: graph_layout || null,
        required_modules: required_modules || [],
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ template: data }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /marketplace/templates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
