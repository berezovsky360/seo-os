import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await serviceClient
      .from('personas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ personas: data || [] })
  } catch (error) {
    console.error('[API] personas GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, role, avatar_url, system_prompt, writing_style, active, is_default } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // If setting as default, unset others first
    if (is_default) {
      await serviceClient
        .from('personas')
        .update({ is_default: false })
        .eq('user_id', user.id)
    }

    const { data, error } = await serviceClient
      .from('personas')
      .insert({
        user_id: user.id,
        name,
        role: role || '',
        avatar_url: avatar_url || null,
        system_prompt: system_prompt || '',
        writing_style: writing_style || 'balanced',
        active: active !== false,
        is_default: is_default || false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ persona: data })
  } catch (error) {
    console.error('[API] personas POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
