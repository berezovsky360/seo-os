=== SEO OS Connector ===
Contributors: antigravity
Tags: seo, rank-math, rest-api, seo-os
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

REST API bridge between SEO OS dashboard and WordPress + Rank Math.

== Description ==

SEO OS Connector exposes Rank Math SEO data through custom REST API endpoints,
allowing the SEO OS dashboard to read and write all SEO metadata remotely.

**Endpoints:**
- `GET /seo-os/v1/ping` - Health check
- `GET /seo-os/v1/info` - Plugin & site info
- `GET /seo-os/v1/posts` - List posts with SEO data
- `GET /seo-os/v1/posts/{id}/meta` - Get all Rank Math fields
- `POST /seo-os/v1/posts/{id}/meta` - Update Rank Math fields
- `GET /seo-os/v1/posts/{id}/score` - Get SEO score + analysis
- `GET /seo-os/v1/posts/{id}/head` - Get rendered SEO head tags

**Authentication:** WordPress Application Passwords.

== Installation ==

1. Upload `seo-os-connector` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu
3. Go to Tools > SEO OS Connector to verify connection
4. Create an Application Password in Users > Profile

== Changelog ==

= 1.0.0 =
* Initial release
* Full Rank Math meta read/write via REST API
* SEO score and analysis endpoints
* Rendered head tags endpoint
* Admin settings page with API documentation
