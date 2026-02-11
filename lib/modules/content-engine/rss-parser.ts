// RSS Feed Parser — wraps rss-parser for normalized output

import type { FeedItem } from './types'

export async function parseFeed(feedUrl: string): Promise<FeedItem[]> {
  const RSSParser = (await import('rss-parser')).default
  const parser = new RSSParser({
    timeout: 15000,
    headers: {
      'User-Agent': 'SEO-OS-ContentEngine/1.0',
      Accept: 'application/rss+xml, application/xml, text/xml',
    },
  })

  const feed = await parser.parseURL(feedUrl)

  return (feed.items || []).map((item) => ({
    guid: item.guid || item.link || item.title || '',
    title: item.title || '',
    link: item.link || null,
    content: item['content:encoded'] || item.contentSnippet || item.content || null,
    pubDate: item.pubDate || item.isoDate || null,
  }))
}
