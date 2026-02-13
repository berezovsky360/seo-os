// Silent Pulse — Public analytics collection endpoint.
// Receives beacon data from the tracking script.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recordPulseEvent } from '@/lib/services/pulseService'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { s: siteId, sid: sessionId, t: eventType, p: pagePath, r: referrer, d: eventData } = body

    if (!siteId || !sessionId || !eventType) {
      return new NextResponse(null, { status: 204 })
    }

    await recordPulseEvent(supabase, {
      siteId,
      sessionId,
      eventType,
      pagePath: pagePath || '/',
      referrer: referrer || undefined,
      eventData: eventData || undefined,
    })

    return new NextResponse(null, { status: 204 })
  } catch {
    // Never fail on analytics collection
    return new NextResponse(null, { status: 204 })
  }
}
