import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { decrypt, getEncryptionKey, isEncrypted } from '@/lib/utils/encryption'
import { createWordPressClient } from '@/lib/wordpress/client'

// Server-side Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ParsedRedirect {
  source_path: string
  target_url: string
  type: string
  is_regex: boolean
}

/**
 * Parse CSV format: source_path,target_url,type
 * Type defaults to 301 if not provided
 */
function parseCSV(data: string): ParsedRedirect[] {
  const redirects: ParsedRedirect[] = []
  const lines = data.split('\n').map(line => line.trim()).filter(Boolean)

  for (const line of lines) {
    // Skip header row if present
    if (line.toLowerCase().startsWith('source') || line.toLowerCase().startsWith('#')) {
      continue
    }

    const parts = line.split(',').map(p => p.trim())
    if (parts.length >= 2) {
      redirects.push({
        source_path: parts[0],
        target_url: parts[1],
        type: parts[2] || '301',
        is_regex: false,
      })
    }
  }

  return redirects
}

/**
 * Parse htaccess RewriteRule patterns
 * Format: RewriteRule ^old-path$ /new-path [R=301,L]
 */
function parseHtaccess(data: string): ParsedRedirect[] {
  const redirects: ParsedRedirect[] = []
  const lines = data.split('\n').map(line => line.trim()).filter(Boolean)

  for (const line of lines) {
    // Match RewriteRule pattern
    const rewriteMatch = line.match(
      /^RewriteRule\s+\^?(.+?)\$?\s+(\S+)\s+\[.*?R=(\d{3}).*?\]/i
    )
    if (rewriteMatch) {
      const sourcePath = rewriteMatch[1].startsWith('/')
        ? rewriteMatch[1]
        : '/' + rewriteMatch[1]
      redirects.push({
        source_path: sourcePath,
        target_url: rewriteMatch[2],
        type: rewriteMatch[3],
        is_regex: sourcePath.includes('(') || sourcePath.includes('[') || sourcePath.includes('.'),
      })
      continue
    }

    // Match Redirect directive: Redirect 301 /old-path https://example.com/new-path
    const redirectMatch = line.match(
      /^Redirect\s+(\d{3})\s+(\S+)\s+(\S+)/i
    )
    if (redirectMatch) {
      redirects.push({
        source_path: redirectMatch[2],
        target_url: redirectMatch[3],
        type: redirectMatch[1],
        is_regex: false,
      })
      continue
    }

    // Match RedirectMatch directive: RedirectMatch 301 ^/old-(.*)$ https://example.com/new-$1
    const redirectMatchDirective = line.match(
      /^RedirectMatch\s+(\d{3})\s+(\S+)\s+(\S+)/i
    )
    if (redirectMatchDirective) {
      redirects.push({
        source_path: redirectMatchDirective[2],
        target_url: redirectMatchDirective[3],
        type: redirectMatchDirective[1],
        is_regex: true,
      })
    }
  }

  return redirects
}

/**
 * Parse JSON format: array of { source_path, target_url, type?, is_regex? }
 */
function parseJSON(data: string): ParsedRedirect[] {
  const parsed = JSON.parse(data)

  if (!Array.isArray(parsed)) {
    throw new Error('JSON data must be an array')
  }

  return parsed.map((item: any) => ({
    source_path: item.source_path,
    target_url: item.target_url,
    type: item.type || '301',
    is_regex: item.is_regex || false,
  }))
}

/**
 * Sync all enabled redirects to WordPress plugin cache.
 * Silently catches errors so sync failure never blocks import.
 */
async function syncRedirectsToWP(siteId: string): Promise<void> {
  try {
    const { data: redirects, error: redirectsError } = await supabase
      .from('redirects')
      .select('id, source_path, target_url, type, is_regex, enabled, auto_generated, note')
      .eq('site_id', siteId)
      .eq('enabled', true)

    if (redirectsError || !redirects) return

    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('url, wp_username, wp_app_password')
      .eq('id', siteId)
      .single()

    if (siteError || !site || !site.wp_username || !site.wp_app_password) return

    let appPassword = site.wp_app_password
    if (isEncrypted(appPassword)) {
      appPassword = await decrypt(appPassword, getEncryptionKey())
    }

    const client = createWordPressClient({
      url: `https://${site.url}`,
      username: site.wp_username,
      appPassword,
    })

    await client.syncRedirects(redirects)
  } catch (error) {
    console.error('[Redirects Import] WP sync failed (non-blocking):', error)
  }
}

/**
 * POST /api/sites/[siteId]/redirects/import
 * Bulk import redirects from CSV, htaccess, or JSON format
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params
    const body = await request.json()
    const { format, data } = body

    if (!format || !data) {
      return NextResponse.json(
        { error: 'format and data are required' },
        { status: 400 }
      )
    }

    if (!['csv', 'htaccess', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'format must be one of: csv, htaccess, json' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const authClient = await createServerClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse redirects based on format
    let parsed: ParsedRedirect[]
    try {
      switch (format) {
        case 'csv':
          parsed = parseCSV(data)
          break
        case 'htaccess':
          parsed = parseHtaccess(data)
          break
        case 'json':
          parsed = parseJSON(data)
          break
        default:
          parsed = []
      }
    } catch (parseError) {
      return NextResponse.json(
        { error: `Failed to parse ${format} data: ${parseError instanceof Error ? parseError.message : 'Invalid format'}` },
        { status: 400 }
      )
    }

    if (parsed.length === 0) {
      return NextResponse.json(
        { error: 'No valid redirect rules found in the provided data' },
        { status: 400 }
      )
    }

    // Validate all parsed redirects have valid source_path
    const valid = parsed.filter(r => r.source_path && r.target_url && r.source_path.startsWith('/'))
    if (valid.length === 0) {
      return NextResponse.json(
        { error: 'No valid redirect rules found. All source_path values must start with /' },
        { status: 400 }
      )
    }

    // Prepare rows for bulk insert
    const rows = valid.map(r => ({
      user_id: user.id,
      site_id: siteId,
      source_path: r.source_path,
      target_url: r.target_url,
      type: r.type,
      is_regex: r.is_regex,
    }))

    // Bulk insert with ON CONFLICT DO NOTHING
    const { data: inserted, error: insertError } = await supabase
      .from('redirects')
      .upsert(rows, {
        onConflict: 'site_id,source_path',
        ignoreDuplicates: true,
      })
      .select()

    if (insertError) {
      console.error('Error importing redirects:', insertError)
      return NextResponse.json(
        { error: 'Failed to import redirects' },
        { status: 500 }
      )
    }

    const importedCount = inserted?.length || 0

    // Sync to WordPress (non-blocking)
    await syncRedirectsToWP(siteId)

    return NextResponse.json({
      success: true,
      imported: importedCount,
      total_parsed: valid.length,
      skipped: valid.length - importedCount,
    })
  } catch (error) {
    console.error('Error importing redirects:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
