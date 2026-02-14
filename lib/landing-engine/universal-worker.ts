// Universal Cloudflare Worker for *.seo-os.com
// Deployed ONCE — routes ALL subdomains to their R2 prefixed files.
// Each landing site's files are stored under {subdomain}/ in R2.

/**
 * Returns the Worker script as a string for Cloudflare Workers.
 * Deploy via `wrangler deploy` with the R2 bucket bound as `R2`.
 */
export function getUniversalWorkerScript(): string {
  return `// ANTIGRAVITY Landing Engine — Universal Worker
// Routes *.seo-os.com subdomains to R2 prefixed files.
// Auto-generated. Deploy once with wrangler.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname;

    // Extract subdomain from host: "mysite.seo-os.com" → "mysite"
    const parts = host.split(".");
    if (parts.length < 3) {
      return new Response("Not Found", { status: 404 });
    }
    const subdomain = parts[0];

    // Normalize path
    let path = url.pathname;
    if (path === "/" || path === "") {
      path = "/index.html";
    } else if (!path.includes(".")) {
      path = path.replace(/\\/$/, "") + "/index.html";
    }

    // Build R2 key: {subdomain}/{path}
    const key = subdomain + "/" + path.replace(/^\\//, "");

    // Load site config for A/B testing (cached per request)
    let config = null;
    let variantKey = null;
    let abCookie = null;
    let exp = null;
    let slugPath = path.replace(/\\/index\\.html$/, "").replace(/^\\//, "") || "index";

    try {
      const configObj = await env.R2.get(subdomain + "/_config.json");
      if (configObj) {
        config = JSON.parse(await configObj.text());
      }
    } catch {}

    // A/B test routing
    if (config && config.experiments && config.experiments.length > 0) {
      exp = config.experiments.find(function(e) { return e.pageSlug === slugPath; });

      if (exp && exp.variants.length > 0) {
        var cookies = (request.headers.get("Cookie") || "").split(";").map(function(c) { return c.trim(); });
        var cookieName = "_ab_" + slugPath.replace(/[^a-z0-9]/gi, "_");
        abCookie = cookies.find(function(c) { return c.startsWith(cookieName + "="); });

        if (abCookie) {
          variantKey = abCookie.split("=")[1];
        } else {
          var totalWeight = exp.variants.reduce(function(s, v) { return s + v.weight; }, 0);
          var rand = Math.random() * totalWeight;
          var cumWeight = 0;
          for (var i = 0; i < exp.variants.length; i++) {
            cumWeight += exp.variants[i].weight;
            if (rand < cumWeight) {
              variantKey = exp.variants[i].key;
              break;
            }
          }
        }

        if (variantKey && variantKey !== "a") {
          var basePath = path.replace(/\\/index\\.html$/, "");
          if (basePath === "" || basePath === "/") basePath = "";
          path = basePath + "/__variant_" + variantKey + "/index.html";
        }
      }
    }

    // Fetch from R2
    const finalKey = (variantKey && variantKey !== "a")
      ? subdomain + "/" + path.replace(/^\\//, "")
      : key;

    const object = await env.R2.get(finalKey);

    if (!object) {
      // Try custom 404
      const notFound = await env.R2.get(subdomain + "/404.html");
      if (notFound) {
        return new Response(notFound.body, {
          status: 404,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Powered-By": "Antigravity",
          },
        });
      }
      return new Response("Not Found", { status: 404 });
    }

    // Content-Type from extension
    var ext = path.split(".").pop();
    if (ext) ext = ext.toLowerCase();
    var contentTypes = {
      "html": "text/html; charset=utf-8",
      "css": "text/css; charset=utf-8",
      "js": "application/javascript; charset=utf-8",
      "json": "application/json",
      "xml": "application/xml",
      "txt": "text/plain; charset=utf-8",
      "svg": "image/svg+xml",
      "png": "image/png",
      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "webp": "image/webp",
      "ico": "image/x-icon",
      "woff2": "font/woff2",
      "woff": "font/woff",
      "pdf": "application/pdf",
    };
    var contentType = contentTypes[ext] || "application/octet-stream";

    var cacheControl = ext === "html"
      ? "public, max-age=300, s-maxage=3600"
      : "public, max-age=31536000, immutable";

    var headers = {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "X-Powered-By": "Antigravity",
      "X-Subdomain": subdomain,
    };

    // HTML post-processing: inject variant meta, edge rules
    if (ext === "html") {
      var html = await object.text();

      if (variantKey) {
        html = html.replace("<head>", '<head><meta name="x-variant" content="' + variantKey + '">\\n');
      }

      // Edge rules from config
      if (config && config.edgeRules) {
        // UTM persistence
        var utmPersist = config.edgeRules.find(function(r) { return r.type === "utm_persist" && r.enabled; });
        if (utmPersist) {
          var utmKeys = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"];
          var utmParams = {};
          utmKeys.forEach(function(k) {
            var v = url.searchParams.get(k);
            if (v) utmParams[k] = v;
          });
          if (Object.keys(utmParams).length > 0) {
            var hiddenInputs = Object.entries(utmParams)
              .map(function(e) { return '<input type="hidden" name="' + e[0] + '" value="' + e[1].replace(/"/g, "&quot;") + '">\\n'; })
              .join("");
            html = html.replace(/<\\/form>/gi, hiddenInputs + "</form>");
          }
        }

        // Geo swap
        var geoSwap = config.edgeRules.find(function(r) { return r.type === "geo_swap" && r.enabled; });
        if (geoSwap && geoSwap.rules) {
          var country = (request.cf && request.cf.country) || "";
          geoSwap.rules.forEach(function(rule) {
            if (country === rule.match) {
              var re = new RegExp("<!--EDGE:" + rule.field + "-->([\\\\s\\\\S]*?)<!--/EDGE:" + rule.field + "-->", "g");
              html = html.replace(re, rule.value);
            }
          });
        }
      }

      // Set A/B cookie
      if (variantKey && exp && !abCookie) {
        var cn = "_ab_" + slugPath.replace(/[^a-z0-9]/gi, "_");
        headers["Set-Cookie"] = cn + "=" + variantKey + "; Path=/; Max-Age=2592000; SameSite=Lax";
      }

      return new Response(html, { headers: headers });
    }

    return new Response(object.body, { headers: headers });
  },
};`
}
