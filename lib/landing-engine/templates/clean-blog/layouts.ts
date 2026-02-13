// Clean Blog — HTML Layouts
// Each layout is a Mustache-like template string.

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
{{#if cdn_origin}}<link rel="preconnect" href="{{cdn_origin}}" crossorigin>{{/if}}
<script type="application/ld+json">{{{schema_json}}}</script>
</head>
<body>
<a href="#main" class="skip-link">Skip to content</a>
{{> header}}
{{> breadcrumbs}}
<main id="main">
<article itemscope itemtype="https://schema.org/BlogPosting">
<meta itemprop="mainEntityOfPage" content="{{canonical_url}}">
<header>
<h1 itemprop="headline">{{title}}</h1>
<div class="meta">
<time itemprop="datePublished" datetime="{{iso_date}}">{{formatted_date}}</time>
{{#if modified_date}}<time itemprop="dateModified" datetime="{{iso_modified}}">Updated {{formatted_modified}}</time>{{/if}}
{{#if author_name}}<span itemprop="author" itemscope itemtype="https://schema.org/Person"><span itemprop="name">{{author_name}}</span></span>{{/if}}
{{#if reading_time}}<span>{{reading_time}} min read</span>{{/if}}
</div>
</header>
{{#if featured_image_url}}
<figure>
<img itemprop="image" src="{{featured_image_url}}" alt="{{image_alt}}" width="{{image_width}}" height="{{image_height}}" fetchpriority="high" decoding="async">
</figure>
{{/if}}
{{#if show_toc}}
<nav aria-label="Table of contents" class="toc">
<h2>Contents</h2>
<ol>
{{#each toc_items}}<li><a href="#{{id}}">{{text}}</a></li>
{{/each}}</ol>
</nav>
{{/if}}
<div itemprop="articleBody" class="content">
{{{content}}}
</div>
{{#if tags}}
<footer>
<ul class="tags" aria-label="Tags">
{{#each tags}}<li><a href="/tag/{{slug}}" rel="tag">{{name}}</a></li>
{{/each}}</ul>
</footer>
{{/if}}
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
<meta property="og:url" content="{{canonical_url}}">
<style>{{{critical_css}}}</style>
</head>
<body>
<a href="#main" class="skip-link">Skip to content</a>
{{> header}}
<main id="main">
<h1>{{title}}</h1>
{{#each posts}}
<div class="card">
<h2><a href="{{url}}">{{title}}</a></h2>
<div class="meta">
<time datetime="{{iso_date}}">{{formatted_date}}</time>
{{#if reading_time}}<span>{{reading_time}} min read</span>{{/if}}
</div>
{{#if excerpt}}<p class="excerpt">{{excerpt}}</p>{{/if}}
</div>
{{/each}}
{{#if has_pagination}}
<div class="pagination">
{{#if prev_url}}<a href="{{prev_url}}">&larr; Newer</a>{{/if}}
{{#if next_url}}<a href="{{next_url}}">Older &rarr;</a>{{/if}}
</div>
{{/if}}
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
<h1>{{title}}</h1>
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
<h1>{{title}}</h1>
{{#each posts}}
<div class="card">
<h2><a href="{{url}}">{{title}}</a></h2>
<div class="meta">
<time datetime="{{iso_date}}">{{formatted_date}}</time>
</div>
{{#if excerpt}}<p class="excerpt">{{excerpt}}</p>{{/if}}
</div>
{{/each}}
</main>
{{> footer}}
</body>
</html>`
