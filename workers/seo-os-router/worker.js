// ANTIGRAVITY Landing Engine — Universal Worker
// Routes *.seo-os.com subdomains to R2 prefixed files.
// Deploy once: cd workers/seo-os-router && npx wrangler deploy

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname;

    // Extract subdomain: "mysite.seo-os.com" → "mysite"
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
      path = path.replace(/\/$/, "") + "/index.html";
    }

    // Build R2 key: {subdomain}/{path}
    const key = subdomain + "/" + path.replace(/^\//, "");

    // Load site config for A/B testing
    let config = null;
    let variantKey = null;
    let abCookie = null;
    let exp = null;
    const slugPath = path.replace(/\/index\.html$/, "").replace(/^\//, "") || "index";

    try {
      const configObj = await env.R2.get(subdomain + "/_config.json");
      if (configObj) {
        config = JSON.parse(await configObj.text());
      }
    } catch {}

    // A/B test routing
    if (config && config.experiments && config.experiments.length > 0) {
      exp = config.experiments.find((e) => e.pageSlug === slugPath);

      if (exp && exp.variants.length > 0) {
        const cookies = (request.headers.get("Cookie") || "").split(";").map((c) => c.trim());
        const cookieName = "_ab_" + slugPath.replace(/[^a-z0-9]/gi, "_");
        abCookie = cookies.find((c) => c.startsWith(cookieName + "="));

        if (abCookie) {
          variantKey = abCookie.split("=")[1];
        } else {
          const totalWeight = exp.variants.reduce((s, v) => s + v.weight, 0);
          const rand = Math.random() * totalWeight;
          let cumWeight = 0;
          for (let i = 0; i < exp.variants.length; i++) {
            cumWeight += exp.variants[i].weight;
            if (rand < cumWeight) {
              variantKey = exp.variants[i].key;
              break;
            }
          }
        }

        if (variantKey && variantKey !== "a") {
          let basePath = path.replace(/\/index\.html$/, "");
          if (basePath === "" || basePath === "/") basePath = "";
          path = basePath + "/__variant_" + variantKey + "/index.html";
        }
      }
    }

    // Fetch from R2
    const finalKey = (variantKey && variantKey !== "a")
      ? subdomain + "/" + path.replace(/^\//, "")
      : key;

    const object = await env.R2.get(finalKey);

    if (!object) {
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
    const ext = (path.split(".").pop() || "").toLowerCase();
    const contentTypes = {
      html: "text/html; charset=utf-8",
      css: "text/css; charset=utf-8",
      js: "application/javascript; charset=utf-8",
      json: "application/json",
      xml: "application/xml",
      txt: "text/plain; charset=utf-8",
      svg: "image/svg+xml",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      ico: "image/x-icon",
      woff2: "font/woff2",
      woff: "font/woff",
      pdf: "application/pdf",
    };
    const contentType = contentTypes[ext] || "application/octet-stream";

    const cacheControl = ext === "html"
      ? "public, max-age=300, s-maxage=3600"
      : "public, max-age=31536000, immutable";

    const headers = {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "X-Powered-By": "Antigravity",
      "X-Subdomain": subdomain,
    };

    // HTML post-processing
    if (ext === "html") {
      let html = await object.text();

      // A/B variant meta
      if (variantKey) {
        html = html.replace("<head>", '<head><meta name="x-variant" content="' + variantKey + '">\n');
      }

      // Edge rules from config
      if (config && config.edgeRules) {
        const utmPersist = config.edgeRules.find((r) => r.type === "utm_persist" && r.enabled);
        if (utmPersist) {
          const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
          const utmParams = {};
          utmKeys.forEach((k) => {
            const v = url.searchParams.get(k);
            if (v) utmParams[k] = v;
          });
          if (Object.keys(utmParams).length > 0) {
            const hiddenInputs = Object.entries(utmParams)
              .map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v).replace(/"/g, "&quot;")}">\n`)
              .join("");
            html = html.replace(/<\/form>/gi, hiddenInputs + "</form>");
          }
        }

        const geoSwap = config.edgeRules.find((r) => r.type === "geo_swap" && r.enabled);
        if (geoSwap && geoSwap.rules) {
          const country = (request.cf && request.cf.country) || "";
          geoSwap.rules.forEach((rule) => {
            if (country === rule.match) {
              const re = new RegExp("<!--EDGE:" + rule.field + "-->([\\s\\S]*?)<!--/EDGE:" + rule.field + "-->", "g");
              html = html.replace(re, rule.value);
            }
          });
        }
      }

      // Set A/B cookie
      if (variantKey && exp && !abCookie) {
        const cn = "_ab_" + slugPath.replace(/[^a-z0-9]/gi, "_");
        headers["Set-Cookie"] = cn + "=" + variantKey + "; Path=/; Max-Age=2592000; SameSite=Lax";
      }

      return new Response(html, { headers });
    }

    return new Response(object.body, { headers });
  },
};
