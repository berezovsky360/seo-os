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

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await serviceSupabase
    .from('lead_pipeline_stages')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If no stages, return defaults
  if (!data || data.length === 0) {
    const defaults = [
      { name: 'New', color: '#6366f1', sort_order: 0, is_default: true },
      { name: 'Interested', color: '#3b82f6', sort_order: 1, is_default: false },
      { name: 'Hot', color: '#ef4444', sort_order: 2, is_default: false },
      { name: 'Closed', color: '#22c55e', sort_order: 3, is_default: false },
      { name: 'Lost', color: '#6b7280', sort_order: 4, is_default: false },
    ]

    const { data: created, error: createErr } = await serviceSupabase
      .from('lead_pipeline_stages')
      .insert(defaults.map(d => ({ ...d, user_id: userId })))
      .select()

    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
    return NextResponse.json(created)
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, color, sort_order } = body

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data, error } = await serviceSupabase
    .from('lead_pipeline_stages')
    .insert({
      user_id: userId,
      name,
      color: color || '#6366f1',
      sort_order: sort_order ?? 99,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
