import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// POST /api/core/recipes/import-url — fetch recipe JSON from a URL
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are supported' }, { status: 400 })
    }

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.status}` }, { status: 400 })
    }

    const text = await response.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'URL did not return valid JSON' }, { status: 400 })
    }

    // Validate required fields
    if (!data.name || !data.trigger_event || !Array.isArray(data.actions) || data.actions.length === 0) {
      return NextResponse.json({ error: 'Invalid recipe: missing name, trigger_event, or actions' }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] import-url error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import from URL' },
      { status: 500 }
    )
  }
}
