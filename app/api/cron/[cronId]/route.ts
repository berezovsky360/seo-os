import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getNextRun, validateCron } from '@/lib/modules/cron/parser'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_FIELDS = [
  'name', 'cron_expression', 'recipe_id', 'site_id',
  'enabled', 'timezone',
]

/**
 * PUT /api/cron/[cronId]
 * Update a cron job.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ cronId: string }> }
) {
  try {
    const { cronId } = await params
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Whitelist fields
    const updates: Record<string, any> = {}
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Validate cron expression if being updated
    if (updates.cron_expression) {
      const validationError = validateCron(updates.cron_expression)
      if (validationError) {
        return NextResponse.json({ error: `Invalid cron expression: ${validationError}` }, { status: 400 })
      }
      // Recalculate next_run_at
      updates.next_run_at = getNextRun(updates.cron_expression, updates.timezone || body.timezone || 'UTC').toISOString()
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('cron_jobs')
      .update(updates)
      .eq('id', cronId)
      .eq('user_id', user.id)
      .select('*, recipes(id, name)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] PUT /cron/[cronId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/cron/[cronId]
 * Delete a cron job.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ cronId: string }> }
) {
  try {
    const { cronId } = await params
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('cron_jobs')
      .delete()
      .eq('id', cronId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /cron/[cronId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
