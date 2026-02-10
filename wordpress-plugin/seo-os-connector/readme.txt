=== SEO OS Connector ===
Contributors: antigravity
Tags: seo, rank-math, rest-api, seo-os, open-graph, schema, twitter-cards
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 2.0.0
License: GPLv2 or later

SEO management for WordPress — renders SEO meta tags, Open Graph, Twitter Cards, and Schema markup. Works standalone or alongside Rank Math.

== Description ==

SEO OS Connector turns your WordPress site into a fully managed SEO endpoint.
It can operate in two modes:

**SEO OS Mode** — The plugin renders all SEO tags in `<head>`:
- `<title>` tag with configurable separator
- Meta description and robots
- Canonical URL
- Open Graph tags (og:title, og:description, og:image, og:url, og:site_name, article:published_time, article:modified_time)
- Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image)
- JSON-LD Schema markup (Article, NewsArticle, BlogPosting, TechArticle, HowTo + custom)

**Rank Math Mode** — Rank Math handles `<head>` rendering. The plugin acts as an API bridge only, reading and writing Rank Math fields remotely.

In both modes the plugin exposes a REST API for the SEO OS dashboard to manage all SEO metadata remotely.

= Features =

* Own `_seo_os_*` meta fields with Rank Math fallback chain
* Native `<head>` rendering (title, meta, OG, Twitter, Schema JSON-LD)
* Dual write: saves to both `_seo_os_*` and `rank_math_*` fields simultaneously
* Admin settings page with renderer toggle
* Content analysis (internal/external links, images with alt text)
* SEO score and keyword density analysis
* Full REST API for remote management

= REST API Endpoints =

* `GET /seo-os/v1/ping` — Health check + renderer status
* `GET /seo-os/v1/info` — Plugin, site, and Rank Math info
* `GET /seo-os/v1/settings` — Read renderer settings
* `POST /seo-os/v1/settings` — Update renderer settings (admin only)
* `GET /seo-os/v1/posts` — List posts with SEO data and content analysis
* `GET /seo-os/v1/posts/{id}/meta` — Get all SEO fields (merged SEO OS + Rank Math)
* `POST /seo-os/v1/posts/{id}/meta` — Update SEO fields (writes to both systems)
* `GET /seo-os/v1/posts/{id}/score` — SEO score, keyword density, content analysis
* `GET /seo-os/v1/posts/{id}/head` — Structured head data (title, meta, OG, Twitter, Schema)

**Authentication:** WordPress Application Passwords.

== Installation ==

1. Upload `seo-os-connector` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu
3. Go to Tools > SEO OS Connector to configure renderer mode
4. Create an Application Password in Users > Profile
5. Enter your site URL, username, and app password in SEO OS dashboard

== Frequently Asked Questions ==

= Can I use this without Rank Math? =

Yes. In SEO OS mode the plugin renders all SEO tags natively. Rank Math is optional.

= What happens when both SEO OS and Rank Math are installed? =

You choose the renderer in settings. When SEO OS mode is active, Rank Math's head output is suppressed. SEO data written via the API is saved to both systems simultaneously so you can switch between renderers without data loss.

= Does it work with other SEO plugins? =

The plugin is designed to work alongside Rank Math or standalone. Compatibility with Yoast, AIOSEO, etc. has not been tested — avoid running multiple SEO plugins simultaneously.

== Changelog ==

= 2.0.0 =
* Native SEO head rendering (title, meta description, robots, canonical)
* Open Graph tags (og:title, og:description, og:image, og:url, og:site_name, article timestamps)
* Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image)
* JSON-LD Schema markup (auto-generated Article schema + custom JSON-LD support)
* Own `_seo_os_*` meta fields — plugin is no longer Rank Math dependent
* Fallback chain: reads _seo_os_* first, then rank_math_*, then defaults
* Dual write: POST /meta saves to both _seo_os_* and rank_math_* fields
* Renderer toggle: choose between SEO OS (lightweight) or Rank Math (full-featured)
* Settings API: GET/POST /seo-os/v1/settings for remote configuration
* Admin settings page redesign with renderer selection, OG/Twitter/Schema toggles
* Configurable title separator and default schema type
* Rank Math suppression when SEO OS mode is active
* Content analysis: internal/external links, images with alt text
* SEO score endpoint with keyword density calculation
* Structured head data endpoint (/head) returns parsed title, meta, OG, Twitter, Schema

= 1.0.0 =
* Initial release
* Full Rank Math meta read/write via REST API
* SEO score and analysis endpoints
* Rendered head tags endpoint
* Admin settings page with API documentation

== Upgrade Notice ==

= 2.0.0 =
Major update: SEO OS can now render SEO tags natively without Rank Math. Existing Rank Math data is preserved and used as fallback.
