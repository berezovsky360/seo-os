import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/competitor-anatomy/duplicates?crawlId=&type=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const crawlId = searchParams.get('crawlId')
    const type = searchParams.get('type') // title, description, content

    if (!crawlId) {
      return NextResponse.json({ error: 'crawlId is required' }, { status: 400 })
    }

    let query = supabase
      .from('onpage_duplicates')
      .select('*')
      .eq('crawl_id', crawlId)
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('duplicate_type', type)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ duplicates: data || [] })
  } catch (error) {
    console.error('Get duplicates error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get duplicates' },
      { status: 500 }
    )
  }
}
