import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { extractFacts } from '@/lib/modules/content-engine/extractor'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const itemIds: string[] = body.item_ids || []

    // Get Gemini key
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('encrypted_value')
      .eq('user_id', user.id)
      .eq('key_type', 'gemini')
      .single()

    if (!keyData?.encrypted_value) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 400 })
    }

    let query = supabase
      .from('content_items')
      .select('id, title, content')
      .eq('user_id', user.id)

    if (itemIds.length > 0) {
      query = query.in('id', itemIds)
    } else {
      query = query.eq('status', 'scored').order('combined_score', { ascending: false }).limit(10)
    }

    const { data: items } = await query
    if (!items?.length) return NextResponse.json({ extracted: 0 })

    let extracted = 0
    for (const item of items) {
      try {
        const result = await extractFacts(item.title, item.content || '', keyData.encrypted_value)
        await supabase
          .from('content_items')
          .update({
            extracted_facts: result.facts,
            extracted_keywords: result.keywords,
            status: 'extracted',
          })
          .eq('id', item.id)
        extracted++
      } catch {
        // Skip failures
      }
    }

    return NextResponse.json({ extracted, total: items.length })
  } catch (error) {
    console.error('[API] POST /content-engine/items/extract error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
