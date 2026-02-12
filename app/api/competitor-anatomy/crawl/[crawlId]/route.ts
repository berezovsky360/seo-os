import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/competitor-anatomy/crawl/[crawlId] — Get crawl detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ crawlId: string }> }
) {
  try {
    const { crawlId } = await params

    const { data: crawl, error } = await supabase
      .from('onpage_crawls')
      .select('*')
      .eq('id', crawlId)
      .single()

    if (error || !crawl) {
      return NextResponse.json({ error: 'Crawl not found' }, { status: 404 })
    }

    return NextResponse.json({ crawl })
  } catch (error) {
    console.error('Get crawl error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get crawl' },
      { status: 500 }
    )
  }
}

// DELETE /api/competitor-anatomy/crawl/[crawlId] — Delete a crawl and its data
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ crawlId: string }> }
) {
  try {
    const { crawlId } = await params

    // Cascading delete handles pages, duplicates, redirects
    const { error } = await supabase
      .from('onpage_crawls')
      .delete()
      .eq('id', crawlId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Delete crawl error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete crawl' },
      { status: 500 }
    )
  }
}
