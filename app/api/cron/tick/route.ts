import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { coreDispatcher } from '@/lib/core/dispatcher'
import { getNextRun } from '@/lib/modules/cron/parser'
import type { CoreEvent, Recipe } from '@/lib/core/events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/cron/tick
 * Called by Vercel Cron every minute.
 * Finds due jobs and dispatches their linked recipes.
 * Protected by CRON_SECRET env var.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Find all enabled jobs where next_run_at <= now
    const { data: dueJobs, error } = await supabase
      .from('cron_jobs')
      .select('*, recipes(*)')
      .eq('enabled', true)
      .lte('next_run_at', now.toISOString())

    if (error) {
      console.error('[Cron Tick] Failed to fetch due jobs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!dueJobs || dueJobs.length === 0) {
      return NextResponse.json({ executed: 0 })
    }

    let executed = 0
    let failed = 0

    for (const job of dueJobs) {
      const recipe = job.recipes as Recipe | null

      try {
        if (recipe && recipe.enabled) {
          // Dispatch the recipe's trigger event to run the recipe chain
          const event: CoreEvent = {
            event_type: recipe.trigger_event,
            source_module: 'cron',
            payload: {
              cron_job_id: job.id,
              cron_job_name: job.name,
              scheduled: true,
            },
            site_id: job.site_id || undefined,
          }

          await coreDispatcher.dispatch(event, job.user_id)
        }

        // Calculate next run
        const nextRun = getNextRun(job.cron_expression, job.timezone || 'UTC', now)

        // Update job stats
        await supabase
          .from('cron_jobs')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRun.toISOString(),
            run_count: (job.run_count || 0) + 1,
            last_run_status: 'success',
            last_run_error: null,
            updated_at: now.toISOString(),
          })
          .eq('id', job.id)

        executed++
      } catch (err) {
        console.error(`[Cron Tick] Job "${job.name}" failed:`, err)

        // Calculate next run even on failure
        const nextRun = getNextRun(job.cron_expression, job.timezone || 'UTC', now)

        await supabase
          .from('cron_jobs')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRun.toISOString(),
            run_count: (job.run_count || 0) + 1,
            last_run_status: 'failed',
            last_run_error: err instanceof Error ? err.message : 'Unknown error',
            updated_at: now.toISOString(),
          })
          .eq('id', job.id)

        failed++
      }
    }

    return NextResponse.json({ executed, failed, total: dueJobs.length })
  } catch (error) {
    console.error('[Cron Tick] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/cron/tick
 * Vercel Cron uses GET by default.
 */
export async function GET(request: NextRequest) {
  return POST(request)
}
