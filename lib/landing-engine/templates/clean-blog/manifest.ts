// Clean Blog Template — Manifest
// Minimal blog template optimized for 100/100 PageSpeed.

export const manifest = {
  id: 'clean-blog',
  name: 'Clean Blog',
  version: '1.0.0',
  description: 'Minimal, fast blog template — zero JS, inline CSS, 100/100 PageSpeed',
  params: {
    colors: {
      primary: '#1a1a2e',
      accent: '#e94560',
      bg: '#ffffff',
      text: '#1a1a2e',
      muted: '#6b7280',
    },
    fonts: {
      heading: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      body: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
    },
    layout: {
      max_width: '720px',
      header_style: 'minimal',
      show_author: true,
      show_date: true,
      show_reading_time: true,
      show_toc: true,
    },
    seo: {
      twitter_card: 'summary_large_image',
    },
  },
  slots: ['header', 'footer', 'before_content', 'after_content'],
}
