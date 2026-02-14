// Cloudflare Worker template for serving landing sites from R2.
// Placeholders are replaced at deploy time by deploy-r2.ts.
// The worker serves static HTML/CSS/JS from R2, injects Ghost Popup
// scripts into HTML responses, handles A/B testing, and edge customization.

export interface ABExperiment {
  pageSlug: string
  variants: { key: string; weight: number }[]
}

export interface EdgeRule {
  type: 'utm_persist' | 'geo_swap' | 'referrer_swap' | 'utm_swap'
  enabled: boolean
  rules?: { match: string; field: string; value: string }[]
}

export interface WorkerConfig {
  /** R2 key prefix (typically the site slug, e.g. "my-landing-site") */
  r2BucketBinding: string
  /** Full URL to the Silent Pulse collect endpoint */
  collectEndpoint: string
  /** The landing_site UUID */
  siteId: string
  /** Optional origin to proxy to when R2 misses (e.g. for draft previews) */
  fallbackOrigin?: string
  /** A/B experiments config */
  experiments?: ABExperiment[]
  /** Edge customization rules */
  edgeRules?: EdgeRule[]
}

/**
 * Returns a complete Cloudflare Worker script as a string.
 * The script is designed for the ES modules format (`export default { fetch }`).
 *
 * The worker:
 * 1. Resolves the request path to an R2 object key under the site prefix.
 * 2. Handles A/B test variant routing via cookie-based assignment.
 * 3. Serves the object with correct Content-Type and caching headers.
 * 4. For HTML pages, injects Ghost Popup loader, variant meta tag, and edge rules.
 * 5. Returns a custom 404 page if one exists, otherwise a plain 404.
 * 6. Optionally falls back to an origin server when R2 has no match.
 */
export function getWorkerScript(config: WorkerConfig): string {
  const {
    r2BucketBinding,
    collectEndpoint,
    siteId,
    fallbackOrigin,
    experiments = [],
    edgeRules = [],
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

  // Build A/B experiment config as JSON string
  const experimentsJson = JSON.stringify(experiments)

  // Build edge rules blocks
  const utmPersist = edgeRules.find(r => r.type === 'utm_persist' && r.enabled)
  const geoSwaps = edgeRules.find(r => r.type === 'geo_swap' && r.enabled)
  const referrerSwaps = edgeRules.find(r => r.type === 'referrer_swap' && r.enabled)
  const utmSwaps = edgeRules.find(r => r.type === 'utm_swap' && r.enabled)

  // UTM persistence block — injects hidden fields into forms
  const utmPersistBlock = utmPersist ? [
    '',
    '      // UTM Persistence — inject hidden fields into forms',
    '      var utmKeys = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"];',
    '      var utmParams = {};',
    '      utmKeys.forEach(function(k) {',
    '        var v = url.searchParams.get(k);',
    '        if (v) utmParams[k] = v;',
    '      });',
    '      if (Object.keys(utmParams).length > 0) {',
    '        var hiddenInputs = Object.entries(utmParams)',
    '          .map(function(e) { return \'<input type="hidden" name="\' + e[0] + \'" value="\' + e[1].replace(/"/g, "&quot;") + \'">\\n\'; })',
    '          .join("");',
    '        html = html.replace(/<\\/form>/gi, hiddenInputs + "</form>");',
    '      }',
  ].join('\n') : ''

  // Geo swap block
  const geoSwapBlock = geoSwaps && geoSwaps.rules && geoSwaps.rules.length > 0 ? [
    '',
    '      // Geo Swap — replace markers based on visitor country',
    '      var country = (request.cf && request.cf.country) || "";',
    '      var geoRules = ' + JSON.stringify(geoSwaps.rules) + ';',
    '      geoRules.forEach(function(rule) {',
    '        if (country === rule.match) {',
    '          var re = new RegExp("<!--EDGE:" + rule.field + "-->([\\\\s\\\\S]*?)<!--/EDGE:" + rule.field + "-->", "g");',
    '          html = html.replace(re, rule.value);',
    '        }',
    '      });',
  ].join('\n') : ''

  // Referrer swap block
  const referrerSwapBlock = referrerSwaps && referrerSwaps.rules && referrerSwaps.rules.length > 0 ? [
    '',
    '      // Referrer Swap — replace markers based on referrer domain',
    '      var refHost = "";',
    '      try { refHost = new URL(request.headers.get("Referer") || "").hostname; } catch(e) {}',
    '      var refRules = ' + JSON.stringify(referrerSwaps.rules) + ';',
    '      refRules.forEach(function(rule) {',
    '        if (refHost.indexOf(rule.match) !== -1) {',
    '          var re = new RegExp("<!--EDGE:" + rule.field + "-->([\\\\s\\\\S]*?)<!--/EDGE:" + rule.field + "-->", "g");',
    '          html = html.replace(re, rule.value);',
    '        }',
    '      });',
  ].join('\n') : ''

  // UTM swap block
  const utmSwapBlock = utmSwaps && utmSwaps.rules && utmSwaps.rules.length > 0 ? [
    '',
    '      // UTM Swap — replace markers based on utm_source',
    '      var utmSource = url.searchParams.get("utm_source") || "";',
    '      var utmRules = ' + JSON.stringify(utmSwaps.rules) + ';',
    '      utmRules.forEach(function(rule) {',
    '        if (utmSource === rule.match) {',
    '          var re = new RegExp("<!--EDGE:" + rule.field + "-->([\\\\s\\\\S]*?)<!--/EDGE:" + rule.field + "-->", "g");',
    '          html = html.replace(re, rule.value);',
    '        }',
    '      });',
  ].join('\n') : ''

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
    '    // A/B Test variant routing',
    '    var experiments = ' + experimentsJson + ';',
    '    var variantKey = null;',
    '    var slugPath = path.replace(/\\/index\\.html$/, "").replace(/^\\//, "") || "index";',
    '    var exp = experiments.find(function(e) { return e.pageSlug === slugPath; });',
    '',
    '    if (exp && exp.variants.length > 0) {',
    '      // Check for existing cookie',
    '      var cookies = (request.headers.get("Cookie") || "").split(";").map(function(c) { return c.trim(); });',
    '      var abCookie = cookies.find(function(c) { return c.startsWith("_ab_" + slugPath.replace(/[^a-z0-9]/gi, "_") + "="); });',
    '',
    '      if (abCookie) {',
    '        variantKey = abCookie.split("=")[1];',
    '      } else {',
    '        // Weighted random assignment',
    '        var totalWeight = exp.variants.reduce(function(s, v) { return s + v.weight; }, 0);',
    '        var rand = Math.random() * totalWeight;',
    '        var cumWeight = 0;',
    '        for (var i = 0; i < exp.variants.length; i++) {',
    '          cumWeight += exp.variants[i].weight;',
    '          if (rand < cumWeight) {',
    '            variantKey = exp.variants[i].key;',
    '            break;',
    '          }',
    '        }',
    '      }',
    '',
    '      // Rewrite path for non-control variants',
    '      if (variantKey && variantKey !== "a") {',
    '        var basePath = path.replace(/\\/index\\.html$/, "");',
    '        if (basePath === "" || basePath === "/") basePath = "";',
    '        path = basePath + "/__variant_" + variantKey + "/index.html";',
    '      }',
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
    '    // For HTML pages, inject popups, variant meta, and edge rules',
    '    if (ext === "html") {',
    '      var html = await object.text();',
    '',
    '      // Inject A/B variant meta tag for tracking',
    '      if (variantKey) {',
    '        html = html.replace("<head>", \'<head><meta name="x-variant" content="\' + variantKey + \'">\\n\');',
    '      }',
    utmPersistBlock,
    geoSwapBlock,
    referrerSwapBlock,
    utmSwapBlock,
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
    '      // Set A/B cookie for returning visitors',
    '      if (variantKey && exp && !abCookie) {',
    '        var cookieName = "_ab_" + slugPath.replace(/[^a-z0-9]/gi, "_");',
    '        headers["Set-Cookie"] = cookieName + "=" + variantKey + "; Path=/; Max-Age=2592000; SameSite=Lax";',
    '      }',
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
