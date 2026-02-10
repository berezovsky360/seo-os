import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/articles/[articleId]/analysis
 * Fetch SEO analysis history for an article
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params

    const { data, error } = await supabase
      .from('seo_analysis_history')
      .select('*')
      .eq('article_id', articleId)
      .order('analyzed_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/articles/[articleId]/analysis
 * Save a new SEO analysis result
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params
    const body = await request.json()

    const { score, results } = body
    if (typeof score !== 'number' || !results) {
      return NextResponse.json(
        { error: 'score (number) and results (object) are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('seo_analysis_history')
      .insert({
        article_id: articleId,
        score,
        results,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
