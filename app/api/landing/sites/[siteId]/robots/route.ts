import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildSite, type LandingTemplate, type LandingSite, type LandingPage } from '@/lib/landing-engine/builder'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params

  const { data: siteRow, error: siteErr } = await supabase
    .from('landing_sites')
    .select('*, landing_templates(id, name, slug, manifest, layouts, partials, critical_css, theme_css)')
    .eq('id', siteId)
    .single()

  if (siteErr || !siteRow) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  const templateRow = siteRow.landing_templates
  if (!templateRow) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const { data: pageRows } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('landing_site_id', siteId)

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

  return new NextResponse(result.robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
