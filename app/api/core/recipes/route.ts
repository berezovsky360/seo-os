import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/core/recipes
 * List all recipes for the authenticated user.
 */
export async function GET() {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ recipes: data || [] })
  } catch (error) {
    console.error('[API] GET /core/recipes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/core/recipes
 * Create a new recipe (automation chain).
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, trigger_event, trigger_conditions, actions, site_ids } = body

    if (!name || !trigger_event || !actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, trigger_event, actions (non-empty array)' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        trigger_event,
        trigger_conditions: trigger_conditions || {},
        actions,
        site_ids: site_ids || null,
        enabled: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[API] POST /core/recipes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
