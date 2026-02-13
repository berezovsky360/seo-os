// Cloudflare Worker template for serving landing sites from R2.
// Placeholders are replaced at deploy time by deploy-r2.ts.
// The worker serves static HTML/CSS/JS from R2, injects Ghost Popup
// scripts into HTML responses, and forwards analytics via Silent Pulse.

export interface WorkerConfig {
  /** R2 key prefix (typically the site slug, e.g. "my-landing-site") */
  r2BucketBinding: string
  /** Full URL to the Silent Pulse collect endpoint */
  collectEndpoint: string
  /** The landing_site UUID */
  siteId: string
  /** Optional origin to proxy to when R2 misses (e.g. for draft previews) */
  fallbackOrigin?: string
}

/**
 * Returns a complete Cloudflare Worker script as a string.
 * The script is designed for the ES modules format (`export default { fetch }`).
 *
 * The worker:
 * 1. Resolves the request path to an R2 object key under the site prefix.
 * 2. Serves the object with correct Content-Type and caching headers.
 * 3. For HTML pages, injects a Ghost Popup loader before </body>.
 * 4. Returns a custom 404 page if one exists, otherwise a plain 404.
 * 5. Optionally falls back to an origin server when R2 has no match.
 */
export function getWorkerScript(config: WorkerConfig): string {
  const {
    r2BucketBinding,
    collectEndpoint,
    siteId,
    fallbackOrigin,
  } = config

  // Derive the popup endpoint from the collect endpoint
  const popupEndpoint = collectEndpoint.replace('/collect', '/popups')

  // Build the fallback block only if an origin is configured
  const fallbackBlock = fallbackOrigin
    ? [
        '',
        '    // Fallback to origin if R2 miss and origin is configured',
        '    if (!object) {',
        '      try {',
        '        const originUrl = new URL(url.pathname + url.search, "' + fallbackOrigin + '");',
        '        return await fetch(originUrl.toString(), {',
        '          headers: request.headers,',
        '          redirect: "follow",',
        '        });',
        '      } catch (e) {',
        '        // Origin also failed — fall through to 404',
        '      }',
        '    }',
      ].join('\n')
    : ''

  // Build the worker script using single-quoted strings inside to avoid
  // template literal nesting issues. The outer function returns one big
  // string via array join for readability.
  const lines = [
    '// ANTIGRAVITY Landing Engine -- CF Worker',
    '// Auto-generated. Do not edit manually.',
    '//',
    '// Site ID:  ' + siteId,
    '// R2 prefix: ' + r2BucketBinding,
    '',
    'export default {',
    '  async fetch(request, env) {',
    '    const url = new URL(request.url);',
    '    let path = url.pathname;',
    '',
    '    // Normalize path: bare paths resolve to index.html',
    '    if (path === "/" || path === "") {',
    '      path = "/index.html";',
    '    } else if (!path.includes(".")) {',
    '      path = path.replace(/\\/$/, "") + "/index.html";',
    '    }',
    '',
    '    // Build R2 key from site prefix + path',
    '    const key = "' + r2BucketBinding + '/" + path.replace(/^\\//, "");',
    '    const object = await env.R2.get(key);',
    fallbackBlock,
    '',
    '    if (!object) {',
    '      // Attempt to serve a custom 404 page',
    '      const notFoundKey = "' + r2BucketBinding + '/404.html";',
    '      const notFound = await env.R2.get(notFoundKey);',
    '      if (notFound) {',
    '        return new Response(notFound.body, {',
    '          status: 404,',
    '          headers: {',
    '            "Content-Type": "text/html; charset=utf-8",',
    '            "Cache-Control": "no-cache",',
    '            "X-Powered-By": "Antigravity",',
    '          },',
    '        });',
    '      }',
    '      return new Response("Not Found", { status: 404 });',
    '    }',
    '',
    '    // Determine Content-Type from file extension',
    '    var ext = path.split(".").pop();',
    '    if (ext) ext = ext.toLowerCase();',
    '    var contentTypes = {',
    '      "html":  "text/html; charset=utf-8",',
    '      "css":   "text/css; charset=utf-8",',
    '      "js":    "application/javascript; charset=utf-8",',
    '      "mjs":   "application/javascript; charset=utf-8",',
    '      "json":  "application/json",',
    '      "xml":   "application/xml",',
    '      "txt":   "text/plain; charset=utf-8",',
    '      "svg":   "image/svg+xml",',
    '      "png":   "image/png",',
    '      "jpg":   "image/jpeg",',
    '      "jpeg":  "image/jpeg",',
    '      "webp":  "image/webp",',
    '      "avif":  "image/avif",',
    '      "gif":   "image/gif",',
    '      "ico":   "image/x-icon",',
    '      "woff2": "font/woff2",',
    '      "woff":  "font/woff",',
    '      "ttf":   "font/ttf",',
    '      "eot":   "application/vnd.ms-fontobject",',
    '      "mp4":   "video/mp4",',
    '      "webm":  "video/webm",',
    '      "pdf":   "application/pdf",',
    '    };',
    '    var contentType = contentTypes[ext] || "application/octet-stream";',
    '',
    '    // Caching: short for HTML (5 min edge / 5 min browser), immutable for assets',
    '    var cacheControl = ext === "html"',
    '      ? "public, max-age=300, s-maxage=3600"',
    '      : "public, max-age=31536000, immutable";',
    '',
    '    var headers = {',
    '      "Content-Type": contentType,',
    '      "Cache-Control": cacheControl,',
    '      "X-Powered-By": "Antigravity",',
    '      "X-Site-Id": "' + siteId + '",',
    '    };',
    '',
    '    // For HTML pages, inject Ghost Popup loader before </body>',
    '    if (ext === "html") {',
    '      var html = await object.text();',
    '',
    '      // Ghost Popup injection — fetches active popups for this path',
    '      var popupScript = "<script>"',
    '        + "(function(){"',
    '        + "var ep=\'' + popupEndpoint + '\';"',
    '        + "var sid=\'' + siteId + '\';"',
    '        + "fetch(ep+\'?site_id=\'+sid+\'&path=\'+encodeURIComponent(location.pathname))"',
    '        + ".then(function(r){return r.json()})"',
    '        + ".then(function(popups){"',
    '        + "if(!popups||!popups.length)return;"',
    '        + "popups.forEach(function(p){"',
    '        + "var d=document.createElement(\'div\');"',
    '        + "d.innerHTML=p.popup_html;"',
    '        + "if(p.popup_css){"',
    '        + "var s=document.createElement(\'style\');"',
    '        + "s.textContent=p.popup_css;"',
    '        + "document.head.appendChild(s)"',
    '        + "}"',
    '        + "document.body.appendChild(d);"',
    '        + "})"',
    '        + "}).catch(function(){});"',
    '        + "})();"',
    '        + "</script>";',
    '',
    '      html = html.replace("</body>", popupScript + "\\n</body>");',
    '',
    '      return new Response(html, { headers: headers });',
    '    }',
    '',
    '    return new Response(object.body, { headers: headers });',
    '  },',
    '};',
  ]

  return lines.join('\n')
}
