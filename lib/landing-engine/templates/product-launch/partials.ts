// Product Launch — Partials

export const headerPartial = `<header role="banner">
<nav aria-label="Main navigation">
<a href="/" class="logo">{{site_name}}</a>
<ul>
{{#each nav_links}}<li><a href="{{url}}"{{#if current}} aria-current="page"{{/if}}>{{label}}</a></li>
{{/each}}</ul>
</nav>
</header>`

export const footerPartial = `<footer role="contentinfo">
<div class="wrap">
<p>&copy; {{year}} {{site_name}}. All rights reserved.</p>
</div>
</footer>`

export const breadcrumbsPartial = `{{#if breadcrumbs}}
<nav aria-label="Breadcrumb" style="max-width:var(--max-width);margin:0 auto;padding:.75rem 1.5rem">
<ol itemscope itemtype="https://schema.org/BreadcrumbList" style="list-style:none;display:flex;gap:.25rem;font-size:.8rem;color:var(--color-muted)">
{{#each breadcrumbs}}<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
<a itemprop="item" href="{{url}}"><span itemprop="name">{{label}}</span></a>
<meta itemprop="position" content="{{position}}">
</li>
{{/each}}</ol>
</nav>
{{/if}}`

export const articleCardPartial = `<div class="feature-card">
<h3><a href="{{url}}">{{title}}</a></h3>
<div class="meta">
<time datetime="{{iso_date}}">{{formatted_date}}</time>
{{#if reading_time}}<span>{{reading_time}} min read</span>{{/if}}
</div>
{{#if excerpt}}<p>{{excerpt}}</p>{{/if}}
</div>`
