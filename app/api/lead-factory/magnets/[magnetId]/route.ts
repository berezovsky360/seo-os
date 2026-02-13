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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ magnetId: string }> }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { magnetId } = await params

  const { data, error } = await serviceSupabase
    .from('lead_magnets')
    .select('*')
    .eq('id', magnetId)
    .eq('user_id', userId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ magnetId: string }> }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { magnetId } = await params
  const body = await request.json()

  const allowed: Record<string, any> = {}
  const fields = ['name', 'file_url', 'file_type', 'description', 'landing_site_id']
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f]
  }

  const { data, error } = await serviceSupabase
    .from('lead_magnets')
    .update(allowed)
    .eq('id', magnetId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ magnetId: string }> }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { magnetId } = await params

  const { error } = await serviceSupabase
    .from('lead_magnets')
    .delete()
    .eq('id', magnetId)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
