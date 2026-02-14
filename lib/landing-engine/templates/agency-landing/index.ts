// Agency Landing Template — Main export

import { manifest } from './manifest'
import { postLayout, indexLayout, pageLayout, categoryLayout } from './layouts'
import { headerPartial, footerPartial, breadcrumbsPartial, articleCardPartial } from './partials'
import { criticalCss as criticalCssRaw } from './critical-css'

export const agencyLandingTemplate = {
  ...manifest,
  layouts: {
    post: postLayout,
    index: indexLayout,
    page: pageLayout,
    category: categoryLayout,
  },
  partials: {
    header: headerPartial,
    footer: footerPartial,
    breadcrumbs: breadcrumbsPartial,
    'article-card': articleCardPartial,
  },
  critical_css: criticalCssRaw,
}

// For DB seeding
export function toDbRecord() {
  return {
    name: manifest.name,
    slug: manifest.id,
    description: manifest.description,
    version: manifest.version,
    manifest: manifest,
    layouts: agencyLandingTemplate.layouts,
    partials: agencyLandingTemplate.partials,
    critical_css: agencyLandingTemplate.critical_css,
    theme_css: null,
    is_builtin: true,
  }
}
