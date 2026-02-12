// RSS Feed Parser — wraps rss-parser for normalized output

import type { FeedItem } from './types'

// Extract the first image URL from an RSS item
function extractImageUrl(item: Record<string, any>): string | null {
  // 1. <enclosure url="..." type="image/...">
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url
  }

  // 2. <media:content url="..." medium="image">
  if (item['media:content']?.$?.url) {
    return item['media:content'].$.url
  }

  // 3. <media:thumbnail url="...">
  if (item['media:thumbnail']?.$?.url) {
    return item['media:thumbnail'].$.url
  }

  // 4. <itunes:image href="...">
  if (item['itunes']?.image) {
    return item['itunes'].image
  }

  // 5. Extract first <img src="..."> from content HTML
  const html = item['content:encoded'] || item.content || ''
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
