// Product Launch Template — Manifest
// High-conversion landing page template for product launches, SaaS, and digital products.

export const manifest = {
  id: 'product-launch',
  name: 'Product Launch',
  version: '1.0.0',
  description: 'High-conversion landing page — hero section, features grid, CTA blocks, testimonials',
  params: {
    colors: {
      primary: '#0f172a',
      accent: '#6366f1',
      bg: '#ffffff',
      text: '#1e293b',
      muted: '#64748b',
      surface: '#f8fafc',
    },
    fonts: {
      heading: '"Inter", system-ui, -apple-system, sans-serif',
      body: '"Inter", system-ui, -apple-system, sans-serif',
      mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace',
    },
    layout: {
      max_width: '1120px',
      header_style: 'centered',
      show_author: false,
      show_date: false,
      show_reading_time: false,
      show_toc: false,
    },
    seo: {
      twitter_card: 'summary_large_image',
    },
  },
  slots: ['header', 'footer', 'hero', 'features', 'cta'],
}
