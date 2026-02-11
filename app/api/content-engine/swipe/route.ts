import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { coreDispatcher } from '@/lib/core/dispatcher'
import type { EventType } from '@/lib/core/events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/content-engine/swipe
 * Fetch scored items not yet swiped, ordered by combined_score DESC
 */
export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Get IDs of already-swiped items
    const { data: swiped } = await supabase
      .from('swipe_decisions')
      .select('item_id')
      .eq('user_id', user.id)

    const swipedIds = (swiped || []).map(s => s.item_id)

    // Fetch scored items not yet swiped
    let query = supabase
      .from('content_items')
      .select('id, title, url, content, published_at, seo_score, viral_score, combined_score, score_reasoning, extracted_keywords, feed_id, status, created_at')
      .eq('user_id', user.id)
      .in('status', ['scored', 'extracted', 'clustered'])
      .not('combined_score', 'is', null)
      .order('combined_score', { ascending: false })
      .limit(limit)

    if (swipedIds.length > 0) {
      // Filter out already swiped — use NOT IN via filter
      query = query.not('id', 'in', `(${swipedIds.join(',')})`)
    }

    const { data: items, error } = await query

    if (error) {
      console.error('Error fetching swipeable items:', error)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    // Get feed names for each item
    const feedIds = [...new Set((items || []).map(i => i.feed_id).filter(Boolean))]
    let feedMap: Record<string, string> = {}
    if (feedIds.length > 0) {
      const { data: feeds } = await supabase
        .from('content_feeds')
        .select('id, name')
        .in('id', feedIds)
      if (feeds) {
        feedMap = Object.fromEntries(feeds.map(f => [f.id, f.name]))
      }
    }

    const enriched = (items || []).map(item => ({
      ...item,
      feed_name: feedMap[item.feed_id] || null,
    }))

    return NextResponse.json({
      success: true,
      items: enriched,
      count: enriched.length,
    })
  } catch (error) {
    console.error('Error fetching swipeable items:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/content-engine/swipe
 * Record a swipe decision
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { item_id, direction } = body

    if (!item_id || !direction) {
      return NextResponse.json(
        { error: 'item_id and direction are required' },
        { status: 400 }
      )
    }

    if (!['left', 'right', 'up'].includes(direction)) {
      return NextResponse.json(
        { error: 'direction must be left, right, or up' },
        { status: 400 }
      )
    }

    // Insert swipe decision
    const { error: insertError } = await supabase
      .from('swipe_decisions')
      .insert({
        user_id: user.id,
        item_id,
        direction,
      })

    if (insertError) {
      console.error('Error recording swipe:', insertError)
      return NextResponse.json({ error: 'Failed to record swipe' }, { status: 500 })
    }

    // If rejected (left), mark item as skipped
    if (direction === 'left') {
      await supabase
        .from('content_items')
        .update({ status: 'skipped' })
        .eq('id', item_id)
    }

    // Get item details for event payload
    const { data: item } = await supabase
      .from('content_items')
      .select('title, combined_score, feed_id')
      .eq('id', item_id)
      .single()

    let feedName: string | null = null
    if (item?.feed_id) {
      const { data: feed } = await supabase
        .from('content_feeds')
        .select('name')
        .eq('id', item.feed_id)
        .single()
      feedName = feed?.name || null
    }

    // Emit event based on direction
    const eventMap: Record<string, EventType> = {
      right: 'swipe.approved',
      left: 'swipe.rejected',
      up: 'swipe.super_liked',
    }

    await coreDispatcher.dispatch({
      event_type: eventMap[direction],
      source_module: 'content-engine',
      payload: {
        item_id,
        item_title: item?.title || '',
        combined_score: item?.combined_score || 0,
        feed_name: feedName || '',
      },
    }, user.id)

    return NextResponse.json({ success: true, direction })
  } catch (error) {
    console.error('Error recording swipe:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/content-engine/swipe
 * Undo last swipe
 */
export async function DELETE(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get last swipe
    const { data: lastSwipe } = await supabase
      .from('swipe_decisions')
      .select('id, item_id, direction')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!lastSwipe) {
      return NextResponse.json({ error: 'No swipe to undo' }, { status: 404 })
    }

    // Delete the swipe
    await supabase
      .from('swipe_decisions')
      .delete()
      .eq('id', lastSwipe.id)

    // If it was a reject, revert item status
    if (lastSwipe.direction === 'left') {
      await supabase
        .from('content_items')
        .update({ status: 'scored' })
        .eq('id', lastSwipe.item_id)
        .eq('status', 'skipped')
    }

    return NextResponse.json({ success: true, undone_item_id: lastSwipe.item_id })
  } catch (error) {
    console.error('Error undoing swipe:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
