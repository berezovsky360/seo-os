// Landing Engine Template Renderer
// Mustache-like template engine — zero external dependencies.
//
// Syntax:
//   {{variable}}           — HTML-escaped interpolation
//   {{{raw_html}}}         — raw interpolation (no escape)
//   {{#if condition}}...{{/if}}
//   {{#each array}}...{{/each}}   ({{.}} for primitive, {{prop}} for object)
//   {{> partial_name}}     — include a partial

const ESC: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, ch => ESC[ch])
}

function resolve(path: string, ctx: Record<string, any>): any {
  if (path === '.') return ctx['.'] ?? ctx
  return path.split('.').reduce((o: any, k) => o?.[k], ctx)
}

export function render(
  template: string,
  data: Record<string, any>,
  partials: Record<string, string> = {},
): string {
  let out = template

  // 1. Partials: {{> name}}
  out = out.replace(/\{\{>\s*(\w+)\s*\}\}/g, (_m, name) => {
    const partial = partials[name]
    if (!partial) return ''
    return render(partial, data, partials)
  })

  // 2. #each blocks: {{#each items}}...{{/each}}
  out = processBlocks(out, 'each', (body, key) => {
    const arr = resolve(key, data)
    if (!Array.isArray(arr) || arr.length === 0) return ''
    return arr.map((item, i) => {
      const itemCtx = typeof item === 'object' && item !== null
        ? { ...data, ...item, '@index': i, '@first': i === 0, '@last': i === arr.length - 1 }
        : { ...data, '.': item, '@index': i, '@first': i === 0, '@last': i === arr.length - 1 }
      return render(body, itemCtx, partials)
    }).join('')
  })

  // 3. #if blocks: {{#if condition}}...{{else}}...{{/if}}
  out = processBlocks(out, 'if', (body, key) => {
    const val = resolve(key, data)
    const [truthy, falsy] = splitElse(body)
    return isTruthy(val) ? render(truthy, data, partials) : render(falsy, data, partials)
  })

  // 4. Raw interpolation: {{{variable}}}
  out = out.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_m, key) => {
    const val = resolve(key, data)
    return val != null ? String(val) : ''
  })

  // 5. Escaped interpolation: {{variable}}
  out = out.replace(/\{\{\s*([\w.@]+)\s*\}\}/g, (_m, key) => {
    const val = resolve(key, data)
    return val != null ? escapeHtml(String(val)) : ''
  })

  return out
}

// Processes nested block tags ({{#type key}}...{{/type}})
function processBlocks(
  tpl: string,
  type: string,
  handler: (body: string, key: string) => string,
): string {
  const open = `{{#${type} `
  let result = tpl
  let safety = 100

  while (result.includes(open) && --safety > 0) {
    const startIdx = result.indexOf(open)
    const tagEnd = result.indexOf('}}', startIdx)
    if (tagEnd === -1) break

    const key = result.substring(startIdx + open.length, tagEnd).trim()
    const closeTag = `{{/${type}}}`
    const bodyStart = tagEnd + 2

    // Find matching close tag (handles nesting)
    let depth = 1
    let searchFrom = bodyStart
    let closeIdx = -1
    while (depth > 0) {
      const nextOpen = result.indexOf(open, searchFrom)
      const nextClose = result.indexOf(closeTag, searchFrom)
      if (nextClose === -1) break
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++
        searchFrom = nextOpen + open.length
      } else {
        depth--
        if (depth === 0) closeIdx = nextClose
        searchFrom = nextClose + closeTag.length
      }
    }

    if (closeIdx === -1) break
    const body = result.substring(bodyStart, closeIdx)
    const replacement = handler(body, key)
    result = result.substring(0, startIdx) + replacement + result.substring(closeIdx + closeTag.length)
  }

  return result
}

function splitElse(body: string): [string, string] {
  const idx = body.indexOf('{{else}}')
  if (idx === -1) return [body, '']
  return [body.substring(0, idx), body.substring(idx + 8)]
}

function isTruthy(val: any): boolean {
  if (val == null) return false
  if (val === false || val === 0 || val === '') return false
  if (Array.isArray(val) && val.length === 0) return false
  return true
}

// Inject CSS variables from theme config into critical CSS
export function injectThemeVars(css: string, colors: Record<string, string>, fonts?: Record<string, string>): string {
  let result = css
  for (const [key, val] of Object.entries(colors)) {
    result = result.replace(new RegExp(`var\\(--color-${key}\\)`, 'g'), val)
    result = result.replace(new RegExp(`--color-${key}:\\s*[^;]+;`, 'g'), `--color-${key}: ${val};`)
  }
  if (fonts) {
    for (const [key, val] of Object.entries(fonts)) {
      result = result.replace(new RegExp(`--font-${key}:\\s*[^;]+;`, 'g'), `--font-${key}: ${val};`)
    }
  }
  return result
}
