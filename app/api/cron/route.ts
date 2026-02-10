import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getNextRun, validateCron } from '@/lib/modules/cron/parser'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/cron
 * List all cron jobs for the authenticated user.
 */
export async function GET() {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('cron_jobs')
      .select('*, recipes(id, name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ jobs: data || [] })
  } catch (error) {
    console.error('[API] GET /cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/cron
 * Create a new cron job.
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, cron_expression, recipe_id, site_id, timezone } = body

    if (!name || !cron_expression) {
      return NextResponse.json(
        { error: 'Missing required fields: name, cron_expression' },
        { status: 400 }
      )
    }

    // Validate cron expression
    const validationError = validateCron(cron_expression)
    if (validationError) {
      return NextResponse.json({ error: `Invalid cron expression: ${validationError}` }, { status: 400 })
    }

    // Calculate first next_run_at
    const next_run_at = getNextRun(cron_expression, timezone || 'UTC')

    const { data, error } = await supabase
      .from('cron_jobs')
      .insert({
        user_id: user.id,
        name,
        cron_expression,
        recipe_id: recipe_id || null,
        site_id: site_id || null,
        timezone: timezone || 'UTC',
        enabled: true,
        next_run_at: next_run_at.toISOString(),
      })
      .select('*, recipes(id, name)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[API] POST /cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
