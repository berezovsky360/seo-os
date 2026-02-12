import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/competitor-anatomy/redirects?crawlId=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const crawlId = searchParams.get('crawlId')

    if (!crawlId) {
      return NextResponse.json({ error: 'crawlId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('onpage_redirects')
      .select('*')
      .eq('crawl_id', crawlId)
      .order('chain_length', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ redirects: data || [] })
  } catch (error) {
    console.error('Get redirects error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get redirects' },
      { status: 500 }
    )
  }
}
