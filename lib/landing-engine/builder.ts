// Landing Engine Builder
// Orchestrates template + page data → rendered HTML files.
// Also generates sitemap.xml, robots.txt, feed.xml.

import { render, injectThemeVars } from './renderer'
import { validate, type ValidationResult } from './validator'

export interface LandingTemplate {
  layouts: Record<string, string>
  partials: Record<string, string>
  critical_css: string
  theme_css?: string | null
  manifest: {
    params?: {
      colors?: Record<string, string>
      fonts?: Record<string, string>
      layout?: Record<string, any>
    }
  }
}

export interface LandingSite {
  id: string
  name: string
  domain?: string | null
  subdomain?: string | null
  config: Record<string, any>
  nav_links: { url: string; label: string }[]
  analytics_id?: string | null
}

export interface LandingPage {
  id: string
  slug: string
  page_type: string
  title: string
  seo_title: string | null
  seo_description: string | null
  content: string | null
  og_image: string | null
  category: string | null
  tags: string[] | null
  author_name: string | null
  word_count: number | null
  reading_time: number | null
  featured_image_url: string | null
  is_published: boolean
  published_at: string | null
  modified_at: string | null
}

export interface FormEmbed {
  form_id: string
  position: 'after_content' | 'placeholder'
  placeholder_id?: string
  form_html: string
}

export interface PageVariant {
  variant_key: string
  content: string | null
  title: string | null
  seo_title: string | null
  seo_description: string | null
  weight: number
  is_control: boolean
}

export interface BuildPageInput extends LandingPage {
  forms?: FormEmbed[]
  variants?: PageVariant[]
}

export interface BuildResultPage {
  pageId: string
  slug: string
  html: string
  validation: ValidationResult
  variantKey?: string
}

export interface BuildResult {
  pages: BuildResultPage[]
  sitemap: string
  robotsTxt: string
  rssFeed: string
}

function getSiteUrl(site: LandingSite): string {
  if (site.domain) return `https://${site.domain}`
  if (site.subdomain) return `https://${site.subdomain}.seo-os.com`
  return ''
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function toISODate(dateStr: string | null): string {
  if (!dateStr) return new Date().toISOString()
  return new Date(dateStr).toISOString()
}

function toRFC822(dateStr: string | null): string {
  if (!dateStr) return new Date().toUTCString()
  return new Date(dateStr).toUTCString()
}

function extractToc(html: string): { id: string; text: string }[] {
  const items: { id: string; text: string }[] = []
  const re = /<h2[^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/h2>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    items.push({ id: m[1], text: m[2].replace(/<[^>]*>/g, '').trim() })
  }
  return items
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function excerpt(content: string | null, maxLen = 160): string {
  if (!content) return ''
  const plain = stripHtml(content)
  return plain.length > maxLen ? plain.substring(0, maxLen) + '...' : plain
}

// Inject lead forms into page content
function injectForms(content: string, forms: FormEmbed[]): string {
  let result = content
  for (const form of forms) {
    if (form.position === 'placeholder' && form.placeholder_id) {
      result = result.replace(`{{FORM:${form.placeholder_id}}}`, form.form_html)
    }
  }
  // Append after_content forms at the end
  const afterForms = forms.filter(f => f.position === 'after_content')
  if (afterForms.length > 0) {
    result += '\n' + afterForms.map(f => f.form_html).join('\n')
  }
  return result
}

export function buildSite(
  template: LandingTemplate,
  site: LandingSite,
  pages: BuildPageInput[],
): BuildResult {
  const siteUrl = getSiteUrl(site)
  const year = new Date().getFullYear().toString()

  // Merge template params with site config overrides
  const colors = { ...template.manifest.params?.colors, ...site.config.colors }
  const fonts = { ...template.manifest.params?.fonts, ...site.config.fonts }

  // Inject theme variables into critical CSS
  const css = injectThemeVars(template.critical_css, colors, fonts)

  const publishedPages = pages.filter(p => p.is_published)
  const posts = publishedPages
    .filter(p => p.page_type === 'post')
    .sort((a, b) => new Date(b.published_at || b.modified_at || '').getTime() - new Date(a.published_at || a.modified_at || '').getTime())

  const globalData = {
    site_name: site.name,
    site_url: siteUrl,
    year,
    lang: site.config.lang || 'en',
    nav_links: site.nav_links || [],
    critical_css: css,
  }

  const results: BuildResultPage[] = []
  const hasFormScripts = pages.some(p => p.forms && p.forms.length > 0)

  // Build individual pages
  for (const page of publishedPages) {
    const pageUrl = page.page_type === 'post'
      ? `${siteUrl}/blog/${page.slug}/`
      : page.slug === 'index'
        ? `${siteUrl}/`
        : `${siteUrl}/${page.slug}/`

    const toc = page.content ? extractToc(page.content) : []

    const breadcrumbs = page.page_type === 'post'
      ? [
          { url: siteUrl || '/', label: 'Home', position: '1' },
          { url: `${siteUrl}/blog/`, label: 'Blog', position: '2' },
          { url: pageUrl, label: page.title, position: '3' },
        ]
      : [
          { url: siteUrl || '/', label: 'Home', position: '1' },
          { url: pageUrl, label: page.title, position: '2' },
        ]

    // Schema JSON-LD
    const schemaJson = page.page_type === 'post' ? JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: page.title,
      description: page.seo_description || excerpt(page.content),
      image: page.og_image || page.featured_image_url || undefined,
      author: { '@type': 'Person', name: page.author_name || site.name },
      publisher: { '@type': 'Organization', name: site.name },
      datePublished: toISODate(page.published_at),
      dateModified: toISODate(page.modified_at),
      mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
      wordCount: page.word_count || undefined,
      articleSection: page.category || undefined,
    }) : ''

    // Inject lead forms into content
    let pageContent = page.content || ''
    if (page.forms && page.forms.length > 0) {
      pageContent = injectForms(pageContent, page.forms)
    }

    const pageData = {
      ...globalData,
      title: page.title,
      seo_title: page.seo_title || `${page.title} | ${site.name}`,
      seo_description: page.seo_description || excerpt(page.content),
      canonical_url: pageUrl,
      og_title: page.seo_title || page.title,
      og_description: page.seo_description || excerpt(page.content),
      og_image: page.og_image || page.featured_image_url || '',
      content: pageContent,
      author_name: page.author_name || '',
      iso_date: toISODate(page.published_at),
      formatted_date: formatDate(page.published_at),
      modified_date: page.modified_at,
      iso_modified: toISODate(page.modified_at),
      formatted_modified: formatDate(page.modified_at),
      reading_time: page.reading_time,
      featured_image_url: page.featured_image_url,
      image_alt: page.title,
      image_width: '1200',
      image_height: '630',
      show_toc: toc.length > 0,
      toc_items: toc,
      tags: page.tags?.map(t => ({ name: t, slug: t.toLowerCase().replace(/[^a-z0-9]+/g, '-') })) || [],
      breadcrumbs,
      schema_json: schemaJson,
      // For index pages
      posts: posts.map(p => ({
        title: p.title,
        url: `${siteUrl}/blog/${p.slug}/`,
        iso_date: toISODate(p.published_at),
        formatted_date: formatDate(p.published_at),
        reading_time: p.reading_time,
        excerpt: excerpt(p.content),
      })),
    }

    const layoutKey = page.page_type === 'post' ? 'post'
      : page.page_type === 'category' ? 'category'
      : page.page_type === 'page' ? 'page'
      : 'index'

    const layoutTemplate = template.layouts[layoutKey] || template.layouts.page || ''
    const html = render(layoutTemplate, pageData, template.partials)
    const validation = validate(html, undefined, hasFormScripts)

    results.push({ pageId: page.id, slug: page.slug, html, validation })

    // Build A/B variants (separate HTML files per variant)
    if (page.variants && page.variants.length > 0) {
      for (const variant of page.variants) {
        if (variant.is_control) continue

        let variantContent = pageContent
        if (variant.content != null) {
          variantContent = variant.content
          if (page.forms && page.forms.length > 0) {
            variantContent = injectForms(variantContent, page.forms)
          }
        }

        const variantData = {
          ...pageData,
          title: variant.title || pageData.title,
          seo_title: variant.seo_title || pageData.seo_title,
          seo_description: variant.seo_description || pageData.seo_description,
          og_title: variant.seo_title || pageData.og_title,
          og_description: variant.seo_description || pageData.og_description,
          content: variantContent,
        }

        const variantHtml = render(layoutTemplate, variantData, template.partials)
        const variantValidation = validate(variantHtml, undefined, hasFormScripts)

        results.push({
          pageId: page.id,
          slug: page.slug,
          html: variantHtml,
          validation: variantValidation,
          variantKey: variant.variant_key.toLowerCase(),
        })
      }
    }
  }

  // Sitemap
  const sitemapEntries = publishedPages.map(p => {
    const loc = p.page_type === 'post'
      ? `${siteUrl}/blog/${p.slug}/`
      : p.slug === 'index' ? `${siteUrl}/` : `${siteUrl}/${p.slug}/`
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${toISODate(p.modified_at).split('T')[0]}</lastmod>\n  </url>`
  })

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.join('\n')}\n</urlset>`

  // robots.txt
  const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml`

  // RSS Feed
  const rssItems = posts.slice(0, 20).map(p => {
    const link = `${siteUrl}/blog/${p.slug}/`
    return `    <item>\n      <title>${escapeXml(p.title)}</title>\n      <link>${escapeXml(link)}</link>\n      <pubDate>${toRFC822(p.published_at)}</pubDate>\n      <guid>${escapeXml(link)}</guid>\n      <description><![CDATA[${excerpt(p.content)}]]></description>\n    </item>`
  })

  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>${escapeXml(site.name)}</title>\n    <link>${escapeXml(siteUrl)}</link>\n    <description>${escapeXml(site.name)} Blog</description>\n    <atom:link href="${escapeXml(siteUrl)}/feed.xml" rel="self" type="application/rss+xml"/>\n${rssItems.join('\n')}\n  </channel>\n</rss>`

  return { pages: results, sitemap, robotsTxt, rssFeed }
}
