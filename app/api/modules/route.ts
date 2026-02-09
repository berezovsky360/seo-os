import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getModuleInfoList } from '@/lib/core/registry'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/modules
 * List all available modules with their enabled state for the user.
 */
export async function GET() {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's module configs from DB
    const { data: configs } = await supabase
      .from('modules_config')
      .select('*')
      .eq('user_id', user.id)

    const configMap = new Map((configs || []).map(c => [c.module_id, c]))

    // Merge registry info with user config
    const modules = getModuleInfoList().map(mod => {
      const config = configMap.get(mod.id)
      return {
        ...mod,
        enabled: config?.enabled ?? false,
        settings: config?.settings ?? {},
      }
    })

    return NextResponse.json({ modules })
  } catch (error) {
    console.error('[API] GET /modules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/modules
 * Batch enable/disable modules.
 * Body: { modules: [{ module_id: string, enabled: boolean }] }
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { modules } = await request.json()

    if (!modules || !Array.isArray(modules)) {
      return NextResponse.json(
        { error: 'Missing required field: modules (array)' },
        { status: 400 }
      )
    }

    // Upsert each module config
    const upserts = modules.map((m: { module_id: string; enabled: boolean }) => ({
      user_id: user.id,
      module_id: m.module_id,
      enabled: m.enabled,
    }))

    const { error } = await supabase
      .from('modules_config')
      .upsert(upserts, { onConflict: 'user_id,module_id' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] POST /modules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
