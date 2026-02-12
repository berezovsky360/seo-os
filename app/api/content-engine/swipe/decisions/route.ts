import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/content-engine/swipe/decisions
// Fetch all swipe decisions with item + feed details, grouped by feed
export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const direction = searchParams.get('direction') // 'left' | 'right' | 'up' | null (all)

    // Fetch decisions with item details
    let query = supabase
      .from('swipe_decisions')
      .select('id, item_id, direction, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (direction) {
      query = query.eq('direction', direction)
    }

    const { data: decisions, error } = await query

    if (error) {
      console.error('Error fetching decisions:', error)
      return NextResponse.json({ error: 'Failed to fetch decisions' }, { status: 500 })
    }

    if (!decisions || decisions.length === 0) {
      return NextResponse.json({ decisions: [], feeds: [] })
    }

    // Fetch items for these decisions
    const itemIds = decisions.map(d => d.item_id)
    const { data: items } = await supabase
      .from('content_items')
      .select('id, title, url, content, image_url, published_at, combined_score, feed_id, status')
      .in('id', itemIds)

    const itemMap = new Map((items || []).map(i => [i.id, i]))

    // Fetch feed names
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

    // Enrich decisions with item + feed data
    const enriched = decisions.map(d => {
      const item = itemMap.get(d.item_id)
      return {
        ...d,
        item_title: item?.title || 'Unknown',
        item_url: item?.url || null,
        item_content: item?.content || null,
        item_image_url: item?.image_url || null,
        item_score: item?.combined_score || null,
        item_published_at: item?.published_at || null,
        item_status: item?.status || null,
        feed_id: item?.feed_id || null,
        feed_name: item?.feed_id ? feedMap[item.feed_id] || 'Unknown Feed' : 'Unknown Feed',
      }
    })

    // Group by feed for the UI
    const byFeed: Record<string, { feed_id: string; feed_name: string; decisions: typeof enriched }> = {}
    for (const d of enriched) {
      const fid = d.feed_id || 'unknown'
      if (!byFeed[fid]) {
        byFeed[fid] = { feed_id: fid, feed_name: d.feed_name, decisions: [] }
      }
      byFeed[fid].decisions.push(d)
    }

    return NextResponse.json({
      decisions: enriched,
      feeds: Object.values(byFeed),
      total: enriched.length,
    })
  } catch (error) {
    console.error('Error fetching swipe decisions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/content-engine/swipe/decisions
// Change the direction of a swipe decision (re-categorize)
export async function PATCH(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { decision_id, new_direction } = body

    if (!decision_id || !new_direction) {
      return NextResponse.json({ error: 'decision_id and new_direction required' }, { status: 400 })
    }

    if (!['left', 'right', 'up'].includes(new_direction)) {
      return NextResponse.json({ error: 'new_direction must be left, right, or up' }, { status: 400 })
    }

    // Get the decision to verify ownership and get old direction
    const { data: decision } = await supabase
      .from('swipe_decisions')
      .select('id, item_id, direction')
      .eq('id', decision_id)
      .eq('user_id', user.id)
      .single()

    if (!decision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 })
    }

    const oldDirection = decision.direction

    // Update the direction
    const { error } = await supabase
      .from('swipe_decisions')
      .update({ direction: new_direction })
      .eq('id', decision_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update item status based on new direction
    if (oldDirection === 'left' && new_direction !== 'left') {
      // Was rejected, now approved — revert from skipped
      await supabase
        .from('content_items')
        .update({ status: 'scored' })
        .eq('id', decision.item_id)
        .eq('status', 'skipped')
    } else if (new_direction === 'left' && oldDirection !== 'left') {
      // Now rejected — mark as skipped
      await supabase
        .from('content_items')
        .update({ status: 'skipped' })
        .eq('id', decision.item_id)
    }

    return NextResponse.json({ success: true, old_direction: oldDirection, new_direction })
  } catch (error) {
    console.error('Error updating swipe decision:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
