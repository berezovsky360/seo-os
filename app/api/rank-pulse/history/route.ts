import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * GET /api/rank-pulse/history?keyword_id=...&days=30
 * Retrieve position history for a specific keyword.
 */
export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const keyword_id = searchParams.get('keyword_id')
    const days = parseInt(searchParams.get('days') || '30', 10)

    if (!keyword_id) {
      return NextResponse.json(
        { error: 'Missing required query param: keyword_id' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify the keyword belongs to the user
    const { data: keyword } = await serviceClient
      .from('keywords')
      .select('id')
      .eq('id', keyword_id)
      .eq('user_id', user.id)
      .single()

    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword not found' },
        { status: 404 }
      )
    }

    // Calculate the date cutoff
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoffISO = cutoffDate.toISOString()

    // Query position history
    const { data: history, error } = await serviceClient
      .from('keyword_position_history')
      .select('position, checked_at')
      .eq('keyword_id', keyword_id)
      .gte('checked_at', cutoffISO)
      .order('checked_at', { ascending: false })

    if (error) {
      console.error('[API] rank-pulse/history error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Map to { date, position } format
    const result = (history || []).map((entry) => ({
      date: entry.checked_at,
      position: entry.position,
    }))

    return NextResponse.json({ history: result })
  } catch (error) {
    console.error('[API] rank-pulse/history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
