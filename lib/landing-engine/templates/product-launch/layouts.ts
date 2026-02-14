// Product Launch — HTML Layouts

export const postLayout = `<!DOCTYPE html>
<html lang="{{lang}}" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{seo_title}}</title>
<meta name="description" content="{{seo_description}}">
<link rel="canonical" href="{{canonical_url}}">
<meta property="og:type" content="article">
<meta property="og:title" content="{{og_title}}">
<meta property="og:description" content="{{og_description}}">
{{#if og_image}}<meta property="og:image" content="{{og_image}}">{{/if}}
<meta property="og:url" content="{{canonical_url}}">
<meta name="twitter:card" content="summary_large_image">
<style>{{{critical_css}}}</style>
{{#if schema_json}}<script type="application/ld+json">{{{schema_json}}}</script>{{/if}}
</head>
<body>
<a href="#main" class="skip-link">Skip to content</a>
{{> header}}
<main id="main">
<article class="content">
<h1>{{title}}</h1>
<div class="meta">
<time datetime="{{iso_date}}">{{formatted_date}}</time>
{{#if author_name}}<span>{{author_name}}</span>{{/if}}
{{#if reading_time}}<span>{{reading_time}} min read</span>{{/if}}
</div>
{{#if featured_image_url}}
<figure class="hero-image">
<img src="{{featured_image_url}}" alt="{{image_alt}}" width="{{image_width}}" height="{{image_height}}" fetchpriority="high" decoding="async">
</figure>
{{/if}}
{{{content}}}
</article>
</main>
{{> footer}}
</body>
</html>`

export const indexLayout = `<!DOCTYPE html>
<html lang="{{lang}}" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{seo_title}}</title>
<meta name="description" content="{{seo_description}}">
<link rel="canonical" href="{{canonical_url}}">
{{#if og_image}}<meta property="og:image" content="{{og_image}}">{{/if}}
<style>{{{critical_css}}}</style>
</head>
<body>
<a href="#main" class="skip-link">Skip to content</a>
{{> header}}
<main id="main">
<section class="hero">
<div class="wrap">
<h1>{{title}}</h1>
{{#if seo_description}}<p class="subtitle">{{seo_description}}</p>{{/if}}
</div>
</section>
<div class="content">
{{{content}}}
</div>
</main>
{{> footer}}
</body>
</html>`

export const pageLayout = `<!DOCTYPE html>
<html lang="{{lang}}" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{seo_title}}</title>
<meta name="description" content="{{seo_description}}">
<link rel="canonical" href="{{canonical_url}}">
<style>{{{critical_css}}}</style>
</head>
<body>
<a href="#main" class="skip-link">Skip to content</a>
{{> header}}
<main id="main">
<section class="hero">
<div class="wrap">
<h1>{{title}}</h1>
{{#if seo_description}}<p class="subtitle">{{seo_description}}</p>{{/if}}
</div>
</section>
<div class="content">
{{{content}}}
</div>
</main>
{{> footer}}
</body>
</html>`

export const categoryLayout = `<!DOCTYPE html>
<html lang="{{lang}}" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{seo_title}}</title>
<meta name="description" content="{{seo_description}}">
<link rel="canonical" href="{{canonical_url}}">
<style>{{{critical_css}}}</style>
</head>
<body>
<a href="#main" class="skip-link">Skip to content</a>
{{> header}}
<main id="main">
<div class="wrap" style="padding:3rem 1.5rem">
<h1>{{title}}</h1>
{{#each posts}}
<div class="feature-card" style="margin-bottom:1.5rem">
<h3><a href="{{url}}">{{title}}</a></h3>
<div class="meta"><time datetime="{{iso_date}}">{{formatted_date}}</time></div>
{{#if excerpt}}<p>{{excerpt}}</p>{{/if}}
</div>
{{/each}}
</div>
</main>
{{> footer}}
</body>
</html>`
