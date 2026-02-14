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

// GET — list funnels, optionally filtered by site_id
export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const siteId = request.nextUrl.searchParams.get('site_id')

  let query = supabase
    .from('funnels')
    .select('id, name, description, status, site_id, graph, config, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (siteId) {
    query = query.eq('site_id', siteId)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create a new funnel
export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, site_id, description } = body

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('funnels')
    .insert({
      user_id: userId,
      name,
      site_id: site_id || null,
      description: description || null,
      status: 'draft',
      graph: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
