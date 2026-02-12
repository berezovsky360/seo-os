import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { parseFeed } from '@/lib/modules/content-engine/rss-parser'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> }
) {
  try {
    const { feedId } = await params
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: feed } = await supabase
      .from('content_feeds')
      .select('*')
      .eq('id', feedId)
      .eq('user_id', user.id)
      .single()

    if (!feed) return NextResponse.json({ error: 'Feed not found' }, { status: 404 })

    const items = await parseFeed(feed.feed_url)
    let newCount = 0

    for (const item of items) {
      const { error } = await supabase
        .from('content_items')
        .upsert(
          {
            user_id: user.id,
            feed_id: feed.id,
            guid: item.guid,
            title: item.title,
            url: item.link,
            content: item.content,
            published_at: item.pubDate,
            image_url: item.imageUrl,
            status: 'ingested',
          },
          { onConflict: 'feed_id,guid', ignoreDuplicates: true }
        )
      if (!error) newCount++

      // Backfill image_url for existing items that were ingested before image extraction
      if (item.imageUrl) {
        await supabase
          .from('content_items')
          .update({ image_url: item.imageUrl })
          .eq('feed_id', feed.id)
          .eq('guid', item.guid)
          .is('image_url', null)
      }
    }

    await supabase
      .from('content_feeds')
      .update({ last_polled_at: new Date().toISOString(), last_item_count: items.length })
      .eq('id', feed.id)

    return NextResponse.json({ total_items: items.length, new_items: newCount })
  } catch (error) {
    console.error('[API] POST /content-engine/feeds/[feedId]/poll error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
