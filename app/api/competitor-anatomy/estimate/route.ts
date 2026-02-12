import { NextRequest, NextResponse } from 'next/server'
import { estimateOnPageCost } from '@/lib/dataforseo/client'

// POST /api/competitor-anatomy/estimate — Calculate crawl cost estimate (pure math)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      max_crawl_pages = 100,
      enable_javascript = false,
      load_resources = false,
      enable_browser_rendering = false,
      enable_content_parsing = false,
      enable_keyword_density = false,
    } = body

    const cost = estimateOnPageCost({
      maxPages: max_crawl_pages,
      enableJavascript: enable_javascript,
      loadResources: load_resources,
      enableBrowserRendering: enable_browser_rendering,
      enableContentParsing: enable_content_parsing,
      enableKeywordDensity: enable_keyword_density,
    })

    return NextResponse.json({
      estimated_cost: cost,
      max_crawl_pages,
      cost_per_page: cost / max_crawl_pages,
    })
  } catch (error) {
    console.error('Estimate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Estimation failed' },
      { status: 500 }
    )
  }
}
