// Landing Engine SEO Validator
// Build-time validation of rendered HTML against configurable rules.

import seoRules from './seo-rules.json'

export interface ValidationIssue {
  severity: 'error' | 'warning'
  rule: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
}

type Rules = typeof seoRules

export function validate(html: string, rules: Rules = seoRules, allowFormScripts = false): ValidationResult {
  const issues: ValidationIssue[] = []

  // Heading rules
  if (rules.heading_rules.require_h1_in_article) {
    const h1Count = (html.match(/<h1[\s>]/gi) || []).length
    if (h1Count === 0) {
      issues.push({ severity: 'error', rule: 'heading.require_h1', message: 'Page must have exactly one <h1> tag' })
    } else if (h1Count > rules.heading_rules.max_h1) {
      issues.push({ severity: 'error', rule: 'heading.max_h1', message: `Page has ${h1Count} <h1> tags, max allowed: ${rules.heading_rules.max_h1}` })
    }
  }

  if (rules.heading_rules.no_skip_levels) {
    const headings = Array.from(html.matchAll(/<h([1-6])[\s>]/gi)).map(m => Number(m[1]))
    for (let i = 1; i < headings.length; i++) {
      if (headings[i] > headings[i - 1] + 1) {
        issues.push({
          severity: 'warning',
          rule: 'heading.no_skip',
          message: `Heading level skipped: H${headings[i - 1]} → H${headings[i]}`,
        })
      }
    }
  }

  // Meta rules
  if (rules.meta_rules.require_canonical) {
    if (!/<link[^>]+rel=["']canonical["']/i.test(html)) {
      issues.push({ severity: 'error', rule: 'meta.canonical', message: 'Missing <link rel="canonical">' })
    }
  }

  if (rules.meta_rules.require_og_image) {
    if (!/<meta[^>]+property=["']og:image["']/i.test(html)) {
      issues.push({ severity: 'warning', rule: 'meta.og_image', message: 'Missing og:image meta tag' })
    }
  }

  const titleMatch = html.match(/<title>([^<]*)<\/title>/i)
  if (titleMatch && titleMatch[1].length > rules.meta_rules.title_max_length) {
    issues.push({
      severity: 'warning',
      rule: 'meta.title_length',
      message: `Title is ${titleMatch[1].length} chars, max recommended: ${rules.meta_rules.title_max_length}`,
    })
  }

  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
  if (descMatch && descMatch[1].length > rules.meta_rules.description_max_length) {
    issues.push({
      severity: 'warning',
      rule: 'meta.description_length',
      message: `Description is ${descMatch[1].length} chars, max recommended: ${rules.meta_rules.description_max_length}`,
    })
  }

  // Content rules
  if (rules.content_rules.require_alt_on_images) {
    const imgsNoAlt = html.match(/<img(?![^>]*alt=["'])[^>]*>/gi)
    if (imgsNoAlt && imgsNoAlt.length > 0) {
      issues.push({
        severity: 'error',
        rule: 'content.img_alt',
        message: `${imgsNoAlt.length} <img> tag(s) missing alt attribute`,
      })
    }
  }

  // Performance rules
  if (rules.performance_rules.max_critical_css_bytes) {
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i)
    if (styleMatch) {
      const cssBytes = new TextEncoder().encode(styleMatch[1]).length
      if (cssBytes > rules.performance_rules.max_critical_css_bytes) {
        issues.push({
          severity: 'warning',
          rule: 'perf.css_size',
          message: `Inline CSS is ${cssBytes} bytes, max: ${rules.performance_rules.max_critical_css_bytes}`,
        })
      }
    }
  }

  if (rules.performance_rules.zero_js) {
    // Allow JSON-LD scripts and Lead Factory form scripts (popup, quiz, calculator)
    const scripts = html.match(/<script[\s>][\s\S]*?<\/script>/gi) || []
    const jsScripts = scripts.filter(s => {
      if (/type=["']application\/ld\+json["']/i.test(s)) return false
      if (allowFormScripts && /lf-popup|lf-quiz|lf-calc|lfQuizNav|lfCalcUpdate/i.test(s)) return false
      return true
    })
    if (jsScripts.length > 0) {
      issues.push({
        severity: 'error',
        rule: 'perf.zero_js',
        message: `Found ${jsScripts.length} JavaScript <script> tag(s) — pages must have zero JS`,
      })
    }
  }

  if (rules.performance_rules.require_width_height_on_images) {
    const imgs = html.match(/<img[^>]*>/gi) || []
    for (const img of imgs) {
      if (!/width=/i.test(img) || !/height=/i.test(img)) {
        issues.push({
          severity: 'warning',
          rule: 'perf.img_dimensions',
          message: 'An <img> tag is missing explicit width/height attributes (causes CLS)',
        })
        break
      }
    }
  }

  // Schema rules
  if (rules.schema_rules.require_article_schema) {
    if (!/"@type"\s*:\s*"(Blog|Article|BlogPosting|NewsArticle)"/i.test(html)) {
      issues.push({ severity: 'warning', rule: 'schema.article', message: 'Missing Article/BlogPosting JSON-LD schema' })
    }
  }

  if (rules.schema_rules.require_breadcrumb_schema) {
    if (!/"@type"\s*:\s*"BreadcrumbList"/i.test(html)) {
      issues.push({ severity: 'warning', rule: 'schema.breadcrumb', message: 'Missing BreadcrumbList JSON-LD schema' })
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  }
}
