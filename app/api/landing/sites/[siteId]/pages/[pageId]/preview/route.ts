import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildSite, type LandingTemplate, type LandingSite, type LandingPage } from '@/lib/landing-engine/builder'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ siteId: string; pageId: string }> }
) {
  const { siteId, pageId } = await params

  // 1. Fetch site with template
  const { data: siteRow, error: siteErr } = await supabase
    .from('landing_sites')
    .select('*, landing_templates(id, name, slug, manifest, layouts, partials, critical_css, theme_css)')
    .eq('id', siteId)
    .single()

  if (siteErr || !siteRow) {
    return new NextResponse('<h1>Site not found</h1>', {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const templateRow = siteRow.landing_templates
  if (!templateRow) {
    return new NextResponse('<h1>Template not found</h1>', {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // 2. Fetch the specific page
  const { data: pageRow, error: pageErr } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('id', pageId)
    .eq('landing_site_id', siteId)
    .single()

  if (pageErr || !pageRow) {
    return new NextResponse('<h1>Page not found</h1>', {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // 3. Build just this page (force is_published for preview)
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

  // Force published for preview
  const previewPage: LandingPage = { ...pageRow, is_published: true }
  const result = buildSite(template, site, [previewPage])

  if (result.pages.length === 0) {
    return new NextResponse('<h1>Build produced no output</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // Add preview banner
  const previewBanner = `<div style="position:fixed;top:0;left:0;right:0;z-index:99999;background:#f59e0b;color:#000;text-align:center;padding:8px 16px;font-family:system-ui;font-size:13px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.15)">
  Preview Mode &mdash; This page has not been published
  <button onclick="this.parentElement.remove()" style="margin-left:16px;background:none;border:1px solid #000;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:12px">Dismiss</button>
</div>
<div style="height:40px"></div>`

  const html = result.pages[0].html.replace('<body>', `<body>\n${previewBanner}`)

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
