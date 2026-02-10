/**
 * Wraps editor HTML column divs with WordPress Gutenberg block comments.
 * Called only when publishing to WordPress, NOT when saving to Supabase.
 *
 * Our editor produces a known, controlled structure:
 *   <div class="wp-block-columns" data-columns="N">
 *     <div class="wp-block-column"><p>...</p></div>
 *     <div class="wp-block-column"><p>...</p></div>
 *   </div>
 *
 * Output:
 *   <!-- wp:columns -->
 *   <div class="wp-block-columns">
 *     <!-- wp:column --><div class="wp-block-column"><p>...</p></div><!-- /wp:column -->
 *     <!-- wp:column --><div class="wp-block-column"><p>...</p></div><!-- /wp:column -->
 *   </div>
 *   <!-- /wp:columns -->
 */
export function addGutenbergBlockMarkers(html: string): string {
  if (!html || !html.includes('wp-block-columns')) return html

  return processColumnsBlocks(html)
}

function processColumnsBlocks(html: string): string {
  const openTag = '<div class="wp-block-columns"'
  let result = ''
  let pos = 0

  while (pos < html.length) {
    const start = html.indexOf(openTag, pos)
    if (start === -1) {
      result += html.slice(pos)
      break
    }

    // Everything before this columns block
    result += html.slice(pos, start)

    // Find the matching closing </div> by counting nesting
    const tagEnd = html.indexOf('>', start)
    if (tagEnd === -1) {
      result += html.slice(start)
      break
    }

    let depth = 1
    let scanPos = tagEnd + 1

    while (depth > 0 && scanPos < html.length) {
      const nextOpen = html.indexOf('<div', scanPos)
      const nextClose = html.indexOf('</div>', scanPos)

      if (nextClose === -1) break

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++
        scanPos = html.indexOf('>', nextOpen) + 1
      } else {
        depth--
        if (depth === 0) {
          const fullBlock = html.slice(start, nextClose + 6)
          result += wrapSingleColumnsBlock(fullBlock)
          pos = nextClose + 6
          break
        }
        scanPos = nextClose + 6
      }
    }

    if (depth > 0) {
      // Couldn't match closing tag, pass through unchanged
      result += html.slice(start)
      break
    }
  }

  return result
}

function wrapSingleColumnsBlock(html: string): string {
  // Remove data-columns and contenteditable attributes
  let clean = html.replace(/\s*data-columns="\d"/g, '')
  clean = clean.replace(/\s*contenteditable="true"/g, '')

  // Find the opening tag end
  const outerTagEnd = clean.indexOf('>') + 1
  const outerOpen = clean.slice(0, outerTagEnd)
  const innerAndClose = clean.slice(outerTagEnd)
  const inner = innerAndClose.slice(0, innerAndClose.length - 6) // strip trailing </div>

  // Wrap each wp-block-column
  const wrappedInner = inner.replace(
    /<div class="wp-block-column">/g,
    '<!-- wp:column -->\n<div class="wp-block-column">'
  )

  // Add closing comments after each column's </div>
  // We need to match column closing tags specifically
  // Since columns can contain nested divs, use a sequential approach
  const processedInner = wrapColumnClosingTags(wrappedInner)

  return `<!-- wp:columns -->\n${outerOpen}${processedInner}</div>\n<!-- /wp:columns -->`
}

function wrapColumnClosingTags(html: string): string {
  // Find each <!-- wp:column --> marker and its matching </div>
  const marker = '<!-- wp:column -->'
  let result = ''
  let pos = 0

  while (pos < html.length) {
    const markerStart = html.indexOf(marker, pos)
    if (markerStart === -1) {
      result += html.slice(pos)
      break
    }

    result += html.slice(pos, markerStart)
    result += marker

    // Find the <div class="wp-block-column"> right after the marker
    const divStart = html.indexOf('<div class="wp-block-column">', markerStart + marker.length)
    if (divStart === -1) {
      result += html.slice(markerStart + marker.length)
      break
    }

    // Match the closing </div>
    const divOpen = html.indexOf('>', divStart) + 1
    let depth = 1
    let scanPos = divOpen

    while (depth > 0 && scanPos < html.length) {
      const nextOpen = html.indexOf('<div', scanPos)
      const nextClose = html.indexOf('</div>', scanPos)

      if (nextClose === -1) break

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++
        scanPos = html.indexOf('>', nextOpen) + 1
      } else {
        depth--
        if (depth === 0) {
          // Found the matching close
          result += html.slice(markerStart + marker.length, nextClose + 6)
          result += '\n<!-- /wp:column -->'
          pos = nextClose + 6
          break
        }
        scanPos = nextClose + 6
      }
    }

    if (depth > 0) {
      result += html.slice(markerStart + marker.length)
      break
    }
  }

  return result
}
