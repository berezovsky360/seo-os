import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildSite, type LandingTemplate, type LandingSite, type BuildPageInput } from '@/lib/landing-engine/builder'
import { deployToR2, prepareBuildFiles, type R2Config, type SiteConfig } from '@/lib/landing-engine/deploy-r2'
import { getTrackingScript } from '@/lib/landing-engine/tracking-script'
import { getWorkerScript, type ABExperiment, type EdgeRule } from '@/lib/landing-engine/worker-template'
import { generateInlineForm, generatePopupForm, type FormConfig, type PopupConfig } from '@/lib/modules/lead-factory/form-generator'

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

  // 3. Collect all form IDs referenced by pages
  const allFormIds = new Set<string>()
  for (const page of (pageRows || [])) {
    if (page.form_ids && Array.isArray(page.form_ids)) {
      page.form_ids.forEach((id: string) => allFormIds.add(id))
    }
  }

  // 4. Fetch form configs in bulk
  let formMap: Record<string, any> = {}
  if (allFormIds.size > 0) {
    const { data: forms } = await supabase
      .from('lead_forms')
      .select('*')
      .in('id', Array.from(allFormIds))

    for (const f of (forms || [])) {
      formMap[f.id] = f
    }
  }

  // 5. Fetch A/B variants for all pages
  const pageIds = (pageRows || []).map((p: any) => p.id)
  let variantMap: Record<string, any[]> = {}
  if (pageIds.length > 0) {
    const { data: variants } = await supabase
      .from('landing_page_variants')
      .select('*')
      .in('landing_page_id', pageIds)

    for (const v of (variants || [])) {
      if (!variantMap[v.landing_page_id]) variantMap[v.landing_page_id] = []
      variantMap[v.landing_page_id].push(v)
    }
  }

  // 6. Fetch running experiments
  const { data: experiments } = await supabase
    .from('landing_experiments')
    .select('*')
    .eq('landing_site_id', siteId)
    .eq('status', 'running')

  // 7. Build capture URL
  const captureUrl = '/api/leads/capture'

  // 8. Prepare build input with forms and variants
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

  const pages: BuildPageInput[] = (pageRows || []).map((page: any) => {
    // Generate form HTML for each referenced form
    const formEmbeds: BuildPageInput['forms'] = []
    const positions = page.form_positions || []

    if (page.form_ids && Array.isArray(page.form_ids)) {
      for (const formId of page.form_ids) {
        const form = formMap[formId]
        if (!form) continue

        const pos = positions.find((p: any) => p.form_id === formId) || { position: 'after_content' }
        const formCfg: FormConfig = {
          formId: form.id,
          captureUrl,
          landingSiteId: siteId,
          fields: form.fields || [{ name: 'email', type: 'email', label: 'Email', placeholder: 'Your email', required: true }],
          buttonText: form.button_text || 'Submit',
          successMessage: form.success_message || 'Thank you!',
        }

        let formHtml: string
        if (form.form_type === 'popup' && form.popup_config) {
          const popupCfg: PopupConfig = {
            trigger: form.popup_config.trigger || 'time_delay',
            value: form.popup_config.value || 5,
            showOnce: form.popup_config.show_once !== false,
            headline: form.popup_config.headline || form.name,
            description: form.popup_config.description || '',
          }
          formHtml = generatePopupForm(formCfg, popupCfg)
        } else {
          formHtml = generateInlineForm(formCfg)
        }

        formEmbeds.push({
          form_id: formId,
          position: pos.position || 'after_content',
          placeholder_id: pos.placeholder_id,
          form_html: formHtml,
        })
      }
    }

    // Map variants
    const pageVariants = variantMap[page.id] || []

    return {
      ...page,
      forms: formEmbeds.length > 0 ? formEmbeds : undefined,
      variants: pageVariants.length > 0 ? pageVariants.map((v: any) => ({
        variant_key: v.variant_key,
        content: v.content,
        title: v.title,
        seo_title: v.seo_title,
        seo_description: v.seo_description,
        weight: v.weight || 50,
        is_control: v.is_control || false,
      })) : undefined,
    }
  })

  const result = buildSite(template, site, pages)

  // 9. Save rendered HTML back to each page (control variants only)
  const errors: string[] = []
  for (const built of result.pages) {
    if (built.variantKey) continue // don't save variant HTML to pages table

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

  // 10. Build A/B + edge rules config (used by both R2 deploy and worker)
  const abExperiments: ABExperiment[] = (experiments || []).map((exp: any) => {
    const page = (pageRows || []).find((p: any) => p.id === exp.landing_page_id)
    const pageVariants = variantMap[exp.landing_page_id] || []
    return {
      pageSlug: page?.slug || '',
      variants: pageVariants.map((v: any) => ({
        key: v.variant_key.toLowerCase(),
        weight: v.weight || 50,
      })),
    }
  }).filter((e: ABExperiment) => e.pageSlug && e.variants.length > 0)

  const edgeRules: EdgeRule[] = siteRow.edge_rules || []

  // 11. Deploy to R2
  let deploy: { uploaded: number; skipped: number; errors: string[] } | null = null

  // Determine R2 config: per-site credentials or shared seo-os-sites bucket
  let r2Config: R2Config | null = null

  if (siteRow.r2_bucket && siteRow.r2_endpoint && siteRow.r2_access_key_encrypted && siteRow.r2_secret_key_encrypted) {
    // Per-site R2 credentials (custom bucket)
    r2Config = {
      accountId: siteRow.r2_endpoint.replace('.r2.cloudflarestorage.com', '').replace('https://', ''),
      accessKeyId: siteRow.r2_access_key_encrypted,
      secretAccessKey: siteRow.r2_secret_key_encrypted,
      bucketName: siteRow.r2_bucket,
    }
  } else if (siteRow.subdomain && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.CF_ACCOUNT_ID) {
    // Subdomain site → deploy to shared seo-os-sites bucket
    r2Config = {
      accountId: process.env.CF_ACCOUNT_ID,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucketName: process.env.R2_BUCKET_NAME || 'seo-os-sites',
    }
  }

  if (r2Config) {
    const trackingScript = siteRow.pulse_enabled !== false
      ? getTrackingScript(siteId)
      : undefined

    const siteSlug = siteRow.subdomain || siteRow.domain || siteId
    const siteConfig: SiteConfig = { experiments: abExperiments, edgeRules }
    const files = prepareBuildFiles(result, trackingScript, siteConfig)

    try {
      deploy = await deployToR2(r2Config, siteSlug, files)
      if (deploy.errors.length > 0) {
        errors.push(...deploy.errors)
      }
    } catch (err: any) {
      errors.push(`R2 deploy failed: ${err.message}`)
    }
  }

  const siteSlugForWorker = siteRow.subdomain || siteRow.domain || siteId
  const workerScript = getWorkerScript({
    r2BucketBinding: siteSlugForWorker,
    collectEndpoint: '/api/pulse/collect',
    siteId,
    experiments: abExperiments,
    edgeRules,
  })

  // 12. Update last_built_at + store worker script
  await supabase
    .from('landing_sites')
    .update({
      last_built_at: new Date().toISOString(),
      worker_script: workerScript,
    })
    .eq('id', siteId)

  return NextResponse.json({
    built: result.pages.length,
    errors,
    validation: result.pages.map(p => ({
      slug: p.slug,
      valid: p.validation.valid,
      issues: p.validation.issues,
      variantKey: p.variantKey,
    })),
    sitemap_length: result.sitemap.length,
    rss_length: result.rssFeed.length,
    deploy: deploy ? { uploaded: deploy.uploaded, skipped: deploy.skipped } : null,
    experiments_configured: abExperiments.length,
    edge_rules_configured: edgeRules.filter(r => r.enabled).length,
  })
}
