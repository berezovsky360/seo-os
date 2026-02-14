import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildSite, type LandingTemplate, type LandingSite, type LandingPage } from '@/lib/landing-engine/builder'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const HTML_404 = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>404 — Page Not Found</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#374151}
.c{text-align:center}h1{font-size:4rem;margin:0;color:#d1d5db}p{font-size:1.125rem;margin-top:.5rem}</style>
</head><body><div class="c"><h1>404</h1><p>Page not found</p></div></body></html>`

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ subdomain: string; path?: string[] }> }
) {
  const { subdomain, path } = await params
  const slug = path?.join('/') || ''

  // 1. Look up the site by subdomain
  const { data: siteRow } = await supabase
    .from('landing_sites')
    .select('*, landing_templates(id, name, slug, manifest, layouts, partials, critical_css, theme_css)')
    .eq('subdomain', subdomain)
    .eq('is_published', true)
    .single()

  if (!siteRow) {
    return new Response(HTML_404, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // 2. Handle special paths (sitemap, robots, feed) — need full build
  if (slug === 'sitemap.xml' || slug === 'robots.txt' || slug === 'feed.xml') {
    return serveMeta(siteRow, slug)
  }

  // 3. Find the page
  let query = supabase
    .from('landing_pages')
    .select('rendered_html, content, title, seo_title, seo_description')
    .eq('landing_site_id', siteRow.id)
    .eq('is_published', true)

  if (!slug) {
    // Index page: page_type = 'index' or slug = 'index'
    query = query.or('page_type.eq.index,slug.eq.index')
  } else {
    query = query.eq('slug', slug)
  }

  const { data: page } = await query.limit(1).single()

  if (!page) {
    return new Response(HTML_404, {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=60',
      },
    })
  }

  // 4. Return the rendered HTML (or raw content as fallback)
  const html = page.rendered_html || wrapContent(page)

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}

// Wrap raw content in a minimal HTML shell when rendered_html is not available
function wrapContent(page: { content: string; title: string; seo_title?: string; seo_description?: string }) {
  const title = page.seo_title || page.title || 'Untitled'
  const desc = page.seo_description || ''
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
${desc ? `<meta name="description" content="${escapeHtml(desc)}">` : ''}
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body>${page.content || ''}</body>
</html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Serve sitemap.xml, robots.txt, or feed.xml via the builder
async function serveMeta(siteRow: any, file: string) {
  const templateRow = siteRow.landing_templates
  if (!templateRow) {
    return new Response('Not found', { status: 404 })
  }

  const { data: pageRows } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('landing_site_id', siteRow.id)

  const template: LandingTemplate = {
    layouts: templateRow.layouts as Record<string, string>,
    partials: templateRow.partials as Record<string, string>,
    critical_css: templateRow.critical_css as string,
    theme_css: templateRow.theme_css,
    manifest: templateRow.manifest as LandingTemplate['manifest'],
  }

  const site: LandingSite = {
    id: siteRow.id,
    name: siteRow.name,
    domain: siteRow.domain,
    subdomain: siteRow.subdomain,
    config: siteRow.config || {},
    nav_links: siteRow.nav_links || [],
    analytics_id: siteRow.analytics_id,
  }

  const pages = (pageRows || []) as LandingPage[]
  const result = buildSite(template, site, pages)

  if (file === 'sitemap.xml') {
    return new Response(result.sitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600',
      },
    })
  }

  if (file === 'robots.txt') {
    return new Response(result.robotsTxt, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600',
      },
    })
  }

  // feed.xml
  return new Response(result.rssFeed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600',
    },
  })
}
