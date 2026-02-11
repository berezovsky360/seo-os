import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/marketplace/templates/import — import recipe from JSON
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, description, trigger_event, trigger_conditions, actions, graph_layout } = body

    if (!name || !trigger_event || !actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid recipe JSON: requires name, trigger_event, and actions array' },
        { status: 400 }
      )
    }

    // Validate action shape
    for (const action of actions) {
      if (!action.module || !action.action) {
        return NextResponse.json(
          { error: 'Each action must have "module" and "action" fields' },
          { status: 400 }
        )
      }
    }

    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        trigger_event,
        trigger_conditions: trigger_conditions || {},
        actions,
        graph_layout: graph_layout || null,
        enabled: false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ recipe }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /marketplace/templates/import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
