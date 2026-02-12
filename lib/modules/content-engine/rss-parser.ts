// RSS Feed Parser — wraps rss-parser for normalized output

import type { FeedItem } from './types'

// Extract the first image URL from an RSS item
function extractImageUrl(item: Record<string, any>): string | null {
  // 1. <enclosure url="..." type="image/...">
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url
  }

  // 2. <enclosure url="..."> without type — check if URL looks like an image
  if (item.enclosure?.url && /\.(jpe?g|png|gif|webp|avif|svg)/i.test(item.enclosure.url)) {
    return item.enclosure.url
  }

  // 3. <media:content url="..." medium="image"> (single or array)
  const mc = item['media:content']
  if (mc) {
    if (Array.isArray(mc)) {
      const img = mc.find((m: any) => m.$?.url)
      if (img?.$?.url) return img.$.url
    } else if (mc.$?.url) {
      return mc.$.url
    }
  }

  // 4. <media:thumbnail url="...">
  const mt = item['media:thumbnail']
  if (mt) {
    if (Array.isArray(mt)) {
      if (mt[0]?.$?.url) return mt[0].$.url
    } else if (mt.$?.url) {
      return mt.$.url
    }
  }

  // 5. <itunes:image href="...">
  if (item['itunes']?.image) {
    return item['itunes'].image
  }

  // 6. Extract first <img src="..."> from content HTML
  const html = item['content:encoded'] || item.content || item.summary || ''
  if (html) {
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/)
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

export async function parseFeed(feedUrl: string): Promise<FeedItem[]> {
  const RSSParser = (await import('rss-parser')).default
  const parser = new RSSParser({
    timeout: 15000,
    headers: {
      'User-Agent': 'SEO-OS-ContentEngine/1.0',
      Accept: 'application/rss+xml, application/xml, text/xml',
    },
    customFields: {
      item: [
        ['media:content', 'media:content', { keepArray: false }],
        ['media:thumbnail', 'media:thumbnail', { keepArray: false }],
      ],
    },
  })

  const feed = await parser.parseURL(feedUrl)

  return (feed.items || []).map((rawItem) => {
    const item = rawItem as Record<string, any>
    return {
      guid: item.guid || item.link || item.title || '',
      title: item.title || '',
      link: item.link || null,
      content: item['content:encoded'] || item.contentSnippet || item.content || null,
      pubDate: item.pubDate || item.isoDate || null,
      imageUrl: extractImageUrl(item),
    }
  })
}
