import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { coreDispatcher } from '@/lib/core/dispatcher'
import type { CoreEvent, EventType, ModuleId, EventSeverity } from '@/lib/core/events'

/**
 * POST /api/core/emit
 * Emit an event into the Core Event Bus.
 * The dispatcher persists the event and triggers matching recipes.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { event_type, source_module, payload, site_id, severity } = body

    if (!event_type || !source_module) {
      return NextResponse.json(
        { error: 'Missing required fields: event_type, source_module' },
        { status: 400 }
      )
    }

    const event: CoreEvent = {
      event_type: event_type as EventType,
      source_module: source_module as ModuleId,
      payload: payload || {},
      site_id: site_id || undefined,
      severity: (severity as EventSeverity) || 'info',
    }

    const eventId = await coreDispatcher.dispatch(event, user.id)

    return NextResponse.json({ event_id: eventId, status: 'dispatched' })
  } catch (error) {
    console.error('[API] /core/emit error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
