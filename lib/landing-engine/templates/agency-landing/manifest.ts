// Agency Landing Template — Manifest
// Dark-themed, bold layout for agencies, portfolios, and service businesses.

export const manifest = {
  id: 'agency-landing',
  name: 'Agency Landing',
  version: '1.0.0',
  description: 'Dark, bold template for agencies and portfolios — wide layout, dramatic typography',
  params: {
    colors: {
      primary: '#ffffff',
      accent: '#f59e0b',
      bg: '#0a0a0a',
      text: '#e5e5e5',
      muted: '#a3a3a3',
      surface: '#171717',
    },
    fonts: {
      heading: '"Inter", system-ui, -apple-system, sans-serif',
      body: '"Inter", system-ui, -apple-system, sans-serif',
      mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace',
    },
    layout: {
      max_width: '1200px',
      header_style: 'dark',
      show_author: false,
      show_date: true,
      show_reading_time: true,
      show_toc: false,
    },
    seo: {
      twitter_card: 'summary_large_image',
    },
  },
  slots: ['header', 'footer', 'hero', 'services', 'cta'],
}
