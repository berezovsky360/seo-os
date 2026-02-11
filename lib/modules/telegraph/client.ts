// Telegraph API Client — wrapper around https://api.telegra.ph/

const API_BASE = 'https://api.telegra.ph'

// ====== Types ======

export interface TelegraphAccount {
  short_name: string
  author_name: string
  author_url: string
  access_token: string
  auth_url: string
  page_count: number
}

export interface TelegraphPage {
  path: string
  url: string
  title: string
  description: string
  views: number
  content?: TelegraphNode[]
  author_name?: string
  author_url?: string
  image_url?: string
}

export interface TelegraphPageList {
  total_count: number
  pages: TelegraphPage[]
}

export type TelegraphNode = string | {
  tag: string
  attrs?: Record<string, string>
  children?: TelegraphNode[]
}

// ====== API Methods ======

export async function createAccount(
  shortName: string,
  authorName?: string,
  authorUrl?: string
): Promise<TelegraphAccount> {
  const params: Record<string, string> = { short_name: shortName }
  if (authorName) params.author_name = authorName
  if (authorUrl) params.author_url = authorUrl

  const res = await fetch(`${API_BASE}/createAccount`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Failed to create Telegraph account')
  return data.result
}

export async function createPage(
  accessToken: string,
  title: string,
  htmlContent: string,
  authorName?: string,
  authorUrl?: string,
  returnContent = false
): Promise<TelegraphPage> {
  const content = htmlToNodes(htmlContent)
  const params: Record<string, any> = {
    access_token: accessToken,
    title,
    content: JSON.stringify(content),
    return_content: returnContent,
  }
  if (authorName) params.author_name = authorName
  if (authorUrl) params.author_url = authorUrl

  const res = await fetch(`${API_BASE}/createPage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Failed to create Telegraph page')
  return data.result
}

export async function editPage(
  accessToken: string,
  path: string,
  title: string,
  htmlContent: string,
  authorName?: string,
  authorUrl?: string
): Promise<TelegraphPage> {
  const content = htmlToNodes(htmlContent)
  const params: Record<string, any> = {
    access_token: accessToken,
    path,
    title,
    content: JSON.stringify(content),
  }
  if (authorName) params.author_name = authorName
  if (authorUrl) params.author_url = authorUrl

  const res = await fetch(`${API_BASE}/editPage/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Failed to edit Telegraph page')
  return data.result
}

export async function getPageViews(
  path: string,
  year?: number,
  month?: number,
  day?: number
): Promise<{ views: number }> {
  const params: Record<string, string> = { path }
  if (year) params.year = String(year)
  if (month) params.month = String(month)
  if (day) params.day = String(day)

  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${API_BASE}/getViews/${path}?${qs}`)
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Failed to get page views')
  return data.result
}

export async function getAccountInfo(
  accessToken: string
): Promise<{ short_name: string; author_name: string; author_url: string; page_count: number }> {
  const res = await fetch(`${API_BASE}/getAccountInfo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: accessToken,
      fields: ['short_name', 'author_name', 'author_url', 'page_count'],
    }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Failed to get account info')
  return data.result
}

export async function getPageList(
  accessToken: string,
  offset = 0,
  limit = 50
): Promise<TelegraphPageList> {
  const res = await fetch(`${API_BASE}/getPageList`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken, offset, limit }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Failed to get page list')
  return data.result
}

// ====== HTML → Telegraph Node Conversion ======

const ALLOWED_TAGS = new Set([
  'p', 'a', 'img', 'h3', 'h4', 'blockquote',
  'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 's',
  'code', 'pre', 'br', 'hr', 'figure', 'figcaption',
])

const SELF_CLOSING = new Set(['br', 'hr', 'img'])

export function htmlToNodes(html: string): TelegraphNode[] {
  // Lightweight HTML → TelegraphNode[] converter
  // Handles common HTML tags used in article content
  const nodes: TelegraphNode[] = []
  let pos = 0
  const len = html.length

  function parseChildren(stopTag?: string): TelegraphNode[] {
    const children: TelegraphNode[] = []
    let text = ''

    while (pos < len) {
      if (html[pos] === '<') {
        // Flush pending text
        if (text) {
          children.push(text)
          text = ''
        }

        // Check for closing tag
        if (html[pos + 1] === '/') {
          const closeEnd = html.indexOf('>', pos)
          if (closeEnd === -1) break
          const closeTag = html.slice(pos + 2, closeEnd).trim().toLowerCase()
          pos = closeEnd + 1
          if (closeTag === stopTag) return children
          continue
        }

        // Parse opening tag
        const tagMatch = html.slice(pos).match(/^<([a-zA-Z][a-zA-Z0-9]*)([\s\S]*?)(\/?)\s*>/)
        if (!tagMatch) {
          text += html[pos]
          pos++
          continue
        }

        const [fullMatch, tagName, attrStr, selfClose] = tagMatch
        const tag = tagName.toLowerCase()
        pos += fullMatch.length

        // Skip non-allowed tags but keep their content
        if (!ALLOWED_TAGS.has(tag)) {
          if (SELF_CLOSING.has(tag) || selfClose === '/') continue
          const inner = parseChildren(tag)
          children.push(...inner)
          continue
        }

        // Parse attributes
        const attrs: Record<string, string> = {}
        const attrRe = /([a-zA-Z_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g
        let am: RegExpExecArray | null
        while ((am = attrRe.exec(attrStr)) !== null) {
          attrs[am[1].toLowerCase()] = am[2] ?? am[3] ?? am[4]
        }

        if (SELF_CLOSING.has(tag) || selfClose === '/') {
          const node: TelegraphNode = { tag }
          if (Object.keys(attrs).length > 0) node.attrs = filterAttrs(tag, attrs)
          children.push(node)
          continue
        }

        // Parse tag children
        const tagChildren = parseChildren(tag)
        const node: TelegraphNode = { tag }
        if (Object.keys(attrs).length > 0) node.attrs = filterAttrs(tag, attrs)
        if (tagChildren.length > 0) node.children = tagChildren
        children.push(node)
      } else {
        text += html[pos]
        pos++
      }
    }

    if (text) children.push(text)
    return children
  }

  function filterAttrs(tag: string, attrs: Record<string, string>): Record<string, string> {
    const filtered: Record<string, string> = {}
    if (tag === 'a' && attrs.href) filtered.href = attrs.href
    if (tag === 'img') {
      if (attrs.src) filtered.src = attrs.src
      if (attrs.alt) filtered.alt = attrs.alt
    }
    return Object.keys(filtered).length > 0 ? filtered : attrs
  }

  const result = parseChildren()

  // Wrap bare text nodes in <p>
  const wrapped: TelegraphNode[] = []
  for (const node of result) {
    if (typeof node === 'string') {
      const trimmed = node.trim()
      if (trimmed) wrapped.push({ tag: 'p', children: [trimmed] })
    } else {
      wrapped.push(node)
    }
  }

  return wrapped.length > 0 ? wrapped : [{ tag: 'p', children: [''] }]
}
