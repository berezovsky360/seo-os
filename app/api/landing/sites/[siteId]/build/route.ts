import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildSite, type LandingTemplate, type LandingSite, type LandingPage } from '@/lib/landing-engine/builder'
import { deployToR2, prepareBuildFiles, type R2Config } from '@/lib/landing-engine/deploy-r2'
import { getTrackingScript } from '@/lib/landing-engine/tracking-script'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params

  // 1. Fetch site with template
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

  // 2. Fetch all pages
  const { data: pageRows, error: pagesErr } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('landing_site_id', siteId)

  if (pagesErr) {
    return NextResponse.json({ error: pagesErr.message }, { status: 500 })
  }

  // 3. Build
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

  // 4. Save rendered HTML back to each page
  const errors: string[] = []
  for (const built of result.pages) {
    if (!built.validation.valid) {
      errors.push(`Page "${built.slug}": ${built.validation.issues.filter(i => i.severity === 'error').map(i => i.message).join('; ')}`)
      continue
    }

    const { error: updateErr } = await supabase
      .from('landing_pages')
      .update({ rendered_html: built.html })
      .eq('id', built.pageId)

    if (updateErr) errors.push(`Failed to save ${built.slug}: ${updateErr.message}`)
  }

  // 5. Deploy to R2 (if configured)
  let deploy: { uploaded: number; skipped: number; errors: string[] } | null = null

  if (siteRow.r2_bucket && siteRow.r2_endpoint && siteRow.r2_access_key_encrypted && siteRow.r2_secret_key_encrypted) {
    const r2Config: R2Config = {
      accountId: siteRow.r2_endpoint.replace('.r2.cloudflarestorage.com', '').replace('https://', ''),
      accessKeyId: siteRow.r2_access_key_encrypted,
      secretAccessKey: siteRow.r2_secret_key_encrypted,
      bucketName: siteRow.r2_bucket,
    }

    // Build tracking script if pulse is enabled
    const trackingScript = siteRow.pulse_enabled !== false
      ? getTrackingScript(siteId)
      : undefined

    const siteSlug = siteRow.subdomain || siteRow.domain || siteId
    const files = prepareBuildFiles(result, trackingScript)

    try {
      deploy = await deployToR2(r2Config, siteSlug, files)
      if (deploy.errors.length > 0) {
        errors.push(...deploy.errors)
      }
    } catch (err: any) {
      errors.push(`R2 deploy failed: ${err.message}`)
    }
  }

  // 6. Update last_built_at
  await supabase
    .from('landing_sites')
    .update({ last_built_at: new Date().toISOString() })
    .eq('id', siteId)

  return NextResponse.json({
    built: result.pages.length,
    errors,
    validation: result.pages.map(p => ({
      slug: p.slug,
      valid: p.validation.valid,
      issues: p.validation.issues,
    })),
    sitemap_length: result.sitemap.length,
    rss_length: result.rssFeed.length,
    deploy: deploy ? { uploaded: deploy.uploaded, skipped: deploy.skipped } : null,
  })
}
