<?php
/**
 * Plugin Name: SEO OS Connector
 * Plugin URI: https://github.com/antigravity/seo-os-connector
 * Description: SEO management for WordPress — renders SEO meta tags, Open Graph, Twitter Cards, and Schema markup. Works standalone or alongside Rank Math.
 * Version: 2.0.0
 * Author: ANTIGRAVITY
 * Author URI: https://antigravity.ua
 * License: GPL v2 or later
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain: seo-os-connector
 */

if (!defined('ABSPATH')) {
    exit;
}

define('SEO_OS_CONNECTOR_VERSION', '2.0.0');
define('SEO_OS_CONNECTOR_NAMESPACE', 'seo-os/v1');

// ═══════════════════════════════════════════════════════════
// 1. Meta Fields Definition
// ═══════════════════════════════════════════════════════════

/**
 * SEO OS own meta fields (stored as _seo_os_* in post_meta).
 * These are the source of truth when SEO OS rendering mode is active.
 */
function seo_os_get_fields(): array {
    return [
        '_seo_os_title'               => ['type' => 'string',  'label' => 'SEO Title'],
        '_seo_os_description'         => ['type' => 'string',  'label' => 'Meta Description'],
        '_seo_os_focus_keyword'       => ['type' => 'string',  'label' => 'Focus Keyword'],
        '_seo_os_additional_keywords' => ['type' => 'string',  'label' => 'Additional Keywords'],
        '_seo_os_canonical_url'       => ['type' => 'string',  'label' => 'Canonical URL'],
        '_seo_os_robots'              => ['type' => 'string',  'label' => 'Robots Meta'],
        '_seo_os_og_title'            => ['type' => 'string',  'label' => 'OG Title'],
        '_seo_os_og_description'      => ['type' => 'string',  'label' => 'OG Description'],
        '_seo_os_og_image'            => ['type' => 'string',  'label' => 'OG Image URL'],
        '_seo_os_twitter_title'       => ['type' => 'string',  'label' => 'Twitter Title'],
        '_seo_os_twitter_description' => ['type' => 'string',  'label' => 'Twitter Description'],
        '_seo_os_twitter_image'       => ['type' => 'string',  'label' => 'Twitter Image URL'],
        '_seo_os_twitter_card_type'   => ['type' => 'string',  'label' => 'Twitter Card Type'],
        '_seo_os_schema_type'         => ['type' => 'string',  'label' => 'Schema Article Type'],
        '_seo_os_schema_json'         => ['type' => 'string',  'label' => 'Custom Schema JSON-LD'],
        '_seo_os_seo_score'           => ['type' => 'integer', 'label' => 'SEO Score'],
        '_seo_os_readability_score'   => ['type' => 'integer', 'label' => 'Readability Score'],
    ];
}

/**
 * Rank Math meta fields (for reading when RM is the active renderer).
 */
function seo_os_get_rank_math_fields(): array {
    return [
        'rank_math_title'              => ['type' => 'string',  'label' => 'SEO Title'],
        'rank_math_description'        => ['type' => 'string',  'label' => 'Meta Description'],
        'rank_math_focus_keyword'      => ['type' => 'string',  'label' => 'Focus Keyword'],
        'rank_math_seo_score'          => ['type' => 'integer', 'label' => 'SEO Score'],
        'rank_math_focus_keywords'     => ['type' => 'string',  'label' => 'Additional Keywords'],
        'rank_math_canonical_url'      => ['type' => 'string',  'label' => 'Canonical URL'],
        'rank_math_robots'             => ['type' => 'string',  'label' => 'Robots Meta'],
        'rank_math_facebook_title'     => ['type' => 'string',  'label' => 'OG Title'],
        'rank_math_facebook_description' => ['type' => 'string', 'label' => 'OG Description'],
        'rank_math_facebook_image'     => ['type' => 'string',  'label' => 'OG Image URL'],
        'rank_math_twitter_title'      => ['type' => 'string',  'label' => 'Twitter Title'],
        'rank_math_twitter_description' => ['type' => 'string', 'label' => 'Twitter Description'],
        'rank_math_twitter_image'      => ['type' => 'string',  'label' => 'Twitter Image URL'],
        'rank_math_twitter_card_type'  => ['type' => 'string',  'label' => 'Twitter Card Type'],
        'rank_math_twitter_use_facebook' => ['type' => 'string', 'label' => 'Twitter Use Facebook'],
        'rank_math_readability_score'  => ['type' => 'integer', 'label' => 'Readability Score'],
        'rank_math_contentai_score'    => ['type' => 'integer', 'label' => 'Content AI Score'],
        'rank_math_primary_category'   => ['type' => 'integer', 'label' => 'Primary Category ID'],
        'rank_math_pillar_content'     => ['type' => 'string',  'label' => 'Pillar Content'],
        'rank_math_breadcrumb_title'   => ['type' => 'string',  'label' => 'Breadcrumb Title'],
    ];
}

// ═══════════════════════════════════════════════════════════
// 2. Settings
// ═══════════════════════════════════════════════════════════

/**
 * Get plugin settings with defaults.
 */
function seo_os_get_settings(): array {
    $defaults = [
        'seo_renderer'       => seo_os_is_rank_math_active() ? 'rankmath' : 'seo-os',
        'render_schema'      => true,
        'render_og'          => true,
        'render_twitter'     => true,
        'schema_default_type' => 'Article',
        'separator'          => '—',
    ];
    $saved = get_option('seo_os_settings', []);
    return wp_parse_args($saved, $defaults);
}

/**
 * Check if SEO OS is the active renderer.
 */
function seo_os_is_renderer(): bool {
    $settings = seo_os_get_settings();
    return $settings['seo_renderer'] === 'seo-os';
}

/**
 * Check if Rank Math is active.
 */
function seo_os_is_rank_math_active(): bool {
    return defined('RANK_MATH_VERSION') || class_exists('\\RankMath\\RankMath');
}

// ═══════════════════════════════════════════════════════════
// 3. SEO Head Rendering (when SEO OS mode is active)
// ═══════════════════════════════════════════════════════════

/**
 * Get an SEO field value with fallback chain:
 * 1. _seo_os_* field
 * 2. rank_math_* field (if RM installed)
 * 3. Default value
 */
function seo_os_get_seo_value(int $post_id, string $field, string $default = ''): string {
    // SEO OS own field
    $seo_os_key = '_seo_os_' . $field;
    $value = get_post_meta($post_id, $seo_os_key, true);
    if (!empty($value)) {
        return is_array($value) ? implode(', ', $value) : (string) $value;
    }

    // Rank Math fallback mapping
    $rm_map = [
        'title'              => 'rank_math_title',
        'description'        => 'rank_math_description',
        'focus_keyword'      => 'rank_math_focus_keyword',
        'canonical_url'      => 'rank_math_canonical_url',
        'robots'             => 'rank_math_robots',
        'og_title'           => 'rank_math_facebook_title',
        'og_description'     => 'rank_math_facebook_description',
        'og_image'           => 'rank_math_facebook_image',
        'twitter_title'      => 'rank_math_twitter_title',
        'twitter_description' => 'rank_math_twitter_description',
        'twitter_image'      => 'rank_math_twitter_image',
        'twitter_card_type'  => 'rank_math_twitter_card_type',
        'seo_score'          => 'rank_math_seo_score',
        'readability_score'  => 'rank_math_readability_score',
    ];

    if (isset($rm_map[$field]) && seo_os_is_rank_math_active()) {
        $rm_value = get_post_meta($post_id, $rm_map[$field], true);
        if (!empty($rm_value)) {
            return is_array($rm_value) ? implode(', ', $rm_value) : (string) $rm_value;
        }
    }

    return $default;
}

/**
 * Disable Rank Math's head output when SEO OS is the active renderer.
 */
add_action('template_redirect', function () {
    if (!seo_os_is_renderer()) return;

    // Remove Rank Math's head actions if it's active
    if (seo_os_is_rank_math_active()) {
        // Rank Math uses priority 1 for its head output
        remove_all_actions('rank_math/head');
        // Also try to remove the wp_head hooks Rank Math adds
        add_filter('rank_math/frontend/title', '__return_false');
        add_filter('rank_math/frontend/description', '__return_false');
        add_filter('rank_math/json_ld', '__return_empty_array', 999);
    }

    // Also prevent default WP from outputting a title tag
    // (we'll render our own)
    remove_theme_support('title-tag');
}, 1);

/**
 * Render <title> tag.
 */
add_filter('pre_get_document_title', function ($title) {
    if (!seo_os_is_renderer() || !is_singular()) return $title;

    $post_id = get_queried_object_id();
    if (!$post_id) return $title;

    $seo_title = seo_os_get_seo_value($post_id, 'title');
    if (!empty($seo_title)) {
        return $seo_title;
    }

    // Default: "Post Title — Site Name"
    $settings = seo_os_get_settings();
    $post = get_post($post_id);
    return $post->post_title . ' ' . $settings['separator'] . ' ' . get_bloginfo('name');
}, 1);

/**
 * Render SEO meta tags in <head>.
 */
add_action('wp_head', function () {
    if (!seo_os_is_renderer()) return;
    if (!is_singular()) return;

    $post_id = get_queried_object_id();
    if (!$post_id) return;

    $post = get_post($post_id);
    $settings = seo_os_get_settings();
    $site_name = get_bloginfo('name');
    $permalink = get_permalink($post_id);

    echo "\n<!-- SEO OS Connector v" . SEO_OS_CONNECTOR_VERSION . " -->\n";

    // Meta description
    $description = seo_os_get_seo_value($post_id, 'description');
    if (!empty($description)) {
        echo '<meta name="description" content="' . esc_attr($description) . '" />' . "\n";
    }

    // Robots
    $robots = seo_os_get_seo_value($post_id, 'robots', 'index, follow');
    echo '<meta name="robots" content="' . esc_attr($robots) . '" />' . "\n";

    // Canonical
    $canonical = seo_os_get_seo_value($post_id, 'canonical_url');
    $canonical = !empty($canonical) ? $canonical : $permalink;
    echo '<link rel="canonical" href="' . esc_url($canonical) . '" />' . "\n";

    // Open Graph
    if ($settings['render_og']) {
        $og_title = seo_os_get_seo_value($post_id, 'og_title');
        $og_title = !empty($og_title) ? $og_title : seo_os_get_seo_value($post_id, 'title', $post->post_title);
        $og_desc = seo_os_get_seo_value($post_id, 'og_description');
        $og_desc = !empty($og_desc) ? $og_desc : $description;
        $og_image = seo_os_get_seo_value($post_id, 'og_image');
        $og_image = !empty($og_image) ? $og_image : get_the_post_thumbnail_url($post_id, 'full');

        echo '<meta property="og:type" content="article" />' . "\n";
        echo '<meta property="og:title" content="' . esc_attr($og_title) . '" />' . "\n";
        if (!empty($og_desc)) {
            echo '<meta property="og:description" content="' . esc_attr($og_desc) . '" />' . "\n";
        }
        echo '<meta property="og:url" content="' . esc_url($permalink) . '" />' . "\n";
        echo '<meta property="og:site_name" content="' . esc_attr($site_name) . '" />' . "\n";
        if (!empty($og_image)) {
            echo '<meta property="og:image" content="' . esc_url($og_image) . '" />' . "\n";
        }
        echo '<meta property="article:published_time" content="' . esc_attr(get_the_date('c', $post_id)) . '" />' . "\n";
        echo '<meta property="article:modified_time" content="' . esc_attr(get_the_modified_date('c', $post_id)) . '" />' . "\n";
    }

    // Twitter Card
    if ($settings['render_twitter']) {
        $tw_card = seo_os_get_seo_value($post_id, 'twitter_card_type', 'summary_large_image');
        $tw_title = seo_os_get_seo_value($post_id, 'twitter_title');
        $tw_title = !empty($tw_title) ? $tw_title : seo_os_get_seo_value($post_id, 'og_title', $post->post_title);
        $tw_desc = seo_os_get_seo_value($post_id, 'twitter_description');
        $tw_desc = !empty($tw_desc) ? $tw_desc : seo_os_get_seo_value($post_id, 'og_description', $description);
        $tw_image = seo_os_get_seo_value($post_id, 'twitter_image');
        $tw_image = !empty($tw_image) ? $tw_image : seo_os_get_seo_value($post_id, 'og_image');
        if (empty($tw_image)) $tw_image = get_the_post_thumbnail_url($post_id, 'full');

        echo '<meta name="twitter:card" content="' . esc_attr($tw_card) . '" />' . "\n";
        echo '<meta name="twitter:title" content="' . esc_attr($tw_title) . '" />' . "\n";
        if (!empty($tw_desc)) {
            echo '<meta name="twitter:description" content="' . esc_attr($tw_desc) . '" />' . "\n";
        }
        if (!empty($tw_image)) {
            echo '<meta name="twitter:image" content="' . esc_url($tw_image) . '" />' . "\n";
        }
    }

    // Schema JSON-LD
    if ($settings['render_schema']) {
        $custom_schema = seo_os_get_seo_value($post_id, 'schema_json');
        if (!empty($custom_schema)) {
            // Custom schema from SEO OS
            echo '<script type="application/ld+json">' . "\n";
            echo $custom_schema . "\n";
            echo '</script>' . "\n";
        } else {
            // Auto-generate Article schema
            $schema_type = seo_os_get_seo_value($post_id, 'schema_type', $settings['schema_default_type']);
            $seo_title = seo_os_get_seo_value($post_id, 'title', $post->post_title);
            $featured_img = get_the_post_thumbnail_url($post_id, 'full');
            $author_name = get_the_author_meta('display_name', $post->post_author);

            $schema = [
                '@context'       => 'https://schema.org',
                '@type'          => $schema_type,
                'headline'       => $seo_title,
                'url'            => $permalink,
                'datePublished'  => get_the_date('c', $post_id),
                'dateModified'   => get_the_modified_date('c', $post_id),
                'author'         => [
                    '@type' => 'Person',
                    'name'  => $author_name,
                ],
                'publisher'      => [
                    '@type' => 'Organization',
                    'name'  => $site_name,
                ],
                'mainEntityOfPage' => [
                    '@type' => 'WebPage',
                    '@id'   => $permalink,
                ],
            ];

            if (!empty($description)) {
                $schema['description'] = $description;
            }

            if (!empty($featured_img)) {
                $schema['image'] = [
                    '@type' => 'ImageObject',
                    'url'   => $featured_img,
                ];
            }

            // Add word count
            $word_count = str_word_count(wp_strip_all_tags($post->post_content));
            if ($word_count > 0) {
                $schema['wordCount'] = $word_count;
            }

            echo '<script type="application/ld+json">' . "\n";
            echo wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            echo "\n</script>\n";
        }
    }

    echo "<!-- / SEO OS Connector -->\n";
}, 1);

/**
 * Remove default WordPress canonical to avoid duplicates.
 */
add_action('wp', function () {
    if (seo_os_is_renderer() && is_singular()) {
        remove_action('wp_head', 'rel_canonical');
    }
});

// ═══════════════════════════════════════════════════════════
// 4. REST API Routes
// ═══════════════════════════════════════════════════════════

add_action('rest_api_init', function () {

    // GET /seo-os/v1/ping
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/ping', [
        'methods'             => 'GET',
        'callback'            => 'seo_os_ping',
        'permission_callback' => 'seo_os_check_permissions',
    ]);

    // GET /seo-os/v1/info
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/info', [
        'methods'             => 'GET',
        'callback'            => 'seo_os_get_info',
        'permission_callback' => 'seo_os_check_permissions',
    ]);

    // GET/POST /seo-os/v1/settings
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/settings', [
        [
            'methods'             => 'GET',
            'callback'            => 'seo_os_get_settings_api',
            'permission_callback' => 'seo_os_check_permissions',
        ],
        [
            'methods'             => 'POST',
            'callback'            => 'seo_os_update_settings_api',
            'permission_callback' => 'seo_os_check_admin_permissions',
        ],
    ]);

    // GET /seo-os/v1/posts
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/posts', [
        'methods'             => 'GET',
        'callback'            => 'seo_os_get_posts',
        'permission_callback' => 'seo_os_check_permissions',
        'args'                => [
            'per_page' => ['default' => 100, 'type' => 'integer', 'maximum' => 200],
            'page'     => ['default' => 1, 'type' => 'integer'],
            'status'   => ['default' => 'any', 'type' => 'string'],
            'orderby'  => ['default' => 'date', 'type' => 'string'],
            'order'    => ['default' => 'desc', 'type' => 'string'],
        ],
    ]);

    // GET /seo-os/v1/posts/{id}/meta
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/posts/(?P<id>\d+)/meta', [
        'methods'             => 'GET',
        'callback'            => 'seo_os_get_post_meta',
        'permission_callback' => 'seo_os_check_permissions',
        'args'                => ['id' => ['required' => true, 'type' => 'integer']],
    ]);

    // POST /seo-os/v1/posts/{id}/meta
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/posts/(?P<id>\d+)/meta', [
        'methods'             => 'POST',
        'callback'            => 'seo_os_update_post_meta',
        'permission_callback' => 'seo_os_check_edit_permissions',
        'args'                => ['id' => ['required' => true, 'type' => 'integer']],
    ]);

    // GET /seo-os/v1/posts/{id}/score
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/posts/(?P<id>\d+)/score', [
        'methods'             => 'GET',
        'callback'            => 'seo_os_get_post_score',
        'permission_callback' => 'seo_os_check_permissions',
        'args'                => ['id' => ['required' => true, 'type' => 'integer']],
    ]);

    // GET /seo-os/v1/posts/{id}/head
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/posts/(?P<id>\d+)/head', [
        'methods'             => 'GET',
        'callback'            => 'seo_os_get_post_head',
        'permission_callback' => 'seo_os_check_permissions',
        'args'                => ['id' => ['required' => true, 'type' => 'integer']],
    ]);
});

// ═══════════════════════════════════════════════════════════
// 5. Permission Checks
// ═══════════════════════════════════════════════════════════

function seo_os_check_permissions(): bool {
    return current_user_can('edit_posts');
}

function seo_os_check_edit_permissions(): bool {
    return current_user_can('edit_posts');
}

function seo_os_check_admin_permissions(): bool {
    return current_user_can('manage_options');
}

// ═══════════════════════════════════════════════════════════
// 6. REST API Callbacks
// ═══════════════════════════════════════════════════════════

/** GET /ping */
function seo_os_ping(): WP_REST_Response {
    return new WP_REST_Response([
        'status'       => 'ok',
        'plugin'       => 'seo-os-connector',
        'version'      => SEO_OS_CONNECTOR_VERSION,
        'wp'           => get_bloginfo('version'),
        'rank_math'    => seo_os_is_rank_math_active(),
        'seo_renderer' => seo_os_get_settings()['seo_renderer'],
    ], 200);
}

/** GET /info */
function seo_os_get_info(WP_REST_Request $request): WP_REST_Response {
    $settings = seo_os_get_settings();
    return new WP_REST_Response([
        'connector_version' => SEO_OS_CONNECTOR_VERSION,
        'wordpress_version' => get_bloginfo('version'),
        'php_version'       => PHP_VERSION,
        'site_url'          => get_site_url(),
        'site_name'         => get_bloginfo('name'),
        'timezone'          => wp_timezone_string(),
        'total_posts'       => wp_count_posts()->publish,
        'total_drafts'      => wp_count_posts()->draft,
        'rank_math' => [
            'active'  => seo_os_is_rank_math_active(),
            'version' => seo_os_is_rank_math_active() && defined('RANK_MATH_VERSION') ? RANK_MATH_VERSION : null,
        ],
        'seo_renderer'    => $settings['seo_renderer'],
        'render_schema'   => $settings['render_schema'],
        'render_og'       => $settings['render_og'],
        'render_twitter'  => $settings['render_twitter'],
        'available_fields' => array_merge(
            array_keys(seo_os_get_fields()),
            array_keys(seo_os_get_rank_math_fields())
        ),
    ], 200);
}

/** GET /settings */
function seo_os_get_settings_api(): WP_REST_Response {
    return new WP_REST_Response([
        'success'  => true,
        'settings' => seo_os_get_settings(),
    ], 200);
}

/** POST /settings */
function seo_os_update_settings_api(WP_REST_Request $request): WP_REST_Response {
    $body = $request->get_json_params();
    $current = seo_os_get_settings();

    $allowed_keys = ['seo_renderer', 'render_schema', 'render_og', 'render_twitter', 'schema_default_type', 'separator'];
    foreach ($allowed_keys as $key) {
        if (isset($body[$key])) {
            $current[$key] = $body[$key];
        }
    }

    // Validate seo_renderer
    if (!in_array($current['seo_renderer'], ['seo-os', 'rankmath'], true)) {
        $current['seo_renderer'] = 'seo-os';
    }

    update_option('seo_os_settings', $current);

    return new WP_REST_Response([
        'success'  => true,
        'settings' => $current,
    ], 200);
}

/** GET /posts */
function seo_os_get_posts(WP_REST_Request $request): WP_REST_Response {
    $args = [
        'post_type'      => 'post',
        'posts_per_page' => $request->get_param('per_page'),
        'paged'          => $request->get_param('page'),
        'post_status'    => $request->get_param('status'),
        'orderby'        => $request->get_param('orderby'),
        'order'          => strtoupper($request->get_param('order')),
    ];

    $query = new WP_Query($args);
    $posts = [];

    foreach ($query->posts as $post) {
        $seo_meta = seo_os_extract_all_seo_data($post->ID);
        $content = $post->post_content;
        $analysis = seo_os_analyze_content($content, $post->ID);

        $posts[] = [
            'id'              => $post->ID,
            'title'           => $post->post_title,
            'slug'            => $post->post_name,
            'status'          => $post->post_status,
            'url'             => get_permalink($post->ID),
            'date'            => $post->post_date,
            'modified'        => $post->post_modified,
            'content'         => $content,
            'excerpt'         => $post->post_excerpt,
            'author_id'       => (int) $post->post_author,
            'author_name'     => get_the_author_meta('display_name', $post->post_author),
            'word_count'      => str_word_count(wp_strip_all_tags($content)),
            'categories'      => wp_get_post_categories($post->ID, ['fields' => 'all']),
            'tags'            => wp_get_post_tags($post->ID, ['fields' => 'all']),
            'featured_image'  => get_the_post_thumbnail_url($post->ID, 'full'),
            'seo'             => $seo_meta,
            'content_analysis' => $analysis,
        ];
    }

    return new WP_REST_Response([
        'success'  => true,
        'posts'    => $posts,
        'total'    => (int) $query->found_posts,
        'pages'    => (int) $query->max_num_pages,
        'page'     => (int) $request->get_param('page'),
        'per_page' => (int) $request->get_param('per_page'),
    ], 200);
}

/** GET /posts/{id}/meta */
function seo_os_get_post_meta(WP_REST_Request $request): WP_REST_Response {
    $post_id = (int) $request->get_param('id');
    $post = get_post($post_id);
    if (!$post) return new WP_REST_Response(['error' => 'Post not found'], 404);

    $seo_data = seo_os_extract_all_seo_data($post_id);
    $analysis = seo_os_analyze_content($post->post_content, $post_id);

    $seo_data['post_id']     = $post_id;
    $seo_data['post_title']  = $post->post_title;
    $seo_data['post_url']    = get_permalink($post_id);
    $seo_data['post_status'] = $post->post_status;
    $seo_data['word_count']  = str_word_count(wp_strip_all_tags($post->post_content));
    $seo_data = array_merge($seo_data, $analysis);

    return new WP_REST_Response(['success' => true, 'meta' => $seo_data], 200);
}

/** POST /posts/{id}/meta — writes to _seo_os_* fields AND rank_math_* fields */
function seo_os_update_post_meta(WP_REST_Request $request): WP_REST_Response {
    $post_id = (int) $request->get_param('id');
    $post = get_post($post_id);
    if (!$post) return new WP_REST_Response(['error' => 'Post not found'], 404);

    $body = $request->get_json_params();
    if (empty($body)) return new WP_REST_Response(['error' => 'No data provided'], 400);

    $seo_os_fields = seo_os_get_fields();
    $rm_fields = seo_os_get_rank_math_fields();
    $updated = [];
    $errors = [];

    // Field name mapping: API key → (_seo_os_* key, rank_math_* key)
    $field_map = [
        'title'              => ['_seo_os_title',              'rank_math_title'],
        'description'        => ['_seo_os_description',        'rank_math_description'],
        'focus_keyword'      => ['_seo_os_focus_keyword',      'rank_math_focus_keyword'],
        'additional_keywords' => ['_seo_os_additional_keywords', 'rank_math_focus_keywords'],
        'canonical_url'      => ['_seo_os_canonical_url',      'rank_math_canonical_url'],
        'robots'             => ['_seo_os_robots',             'rank_math_robots'],
        'og_title'           => ['_seo_os_og_title',           'rank_math_facebook_title'],
        'og_description'     => ['_seo_os_og_description',     'rank_math_facebook_description'],
        'og_image'           => ['_seo_os_og_image',           'rank_math_facebook_image'],
        'twitter_title'      => ['_seo_os_twitter_title',      'rank_math_twitter_title'],
        'twitter_description' => ['_seo_os_twitter_description', 'rank_math_twitter_description'],
        'twitter_image'      => ['_seo_os_twitter_image',      'rank_math_twitter_image'],
        'twitter_card_type'  => ['_seo_os_twitter_card_type',  'rank_math_twitter_card_type'],
        'schema_type'        => ['_seo_os_schema_type',        null],
        'schema_json'        => ['_seo_os_schema_json',        null],
        'seo_score'          => ['_seo_os_seo_score',          'rank_math_seo_score'],
        'readability_score'  => ['_seo_os_readability_score',  'rank_math_readability_score'],
    ];

    foreach ($body as $key => $value) {
        // Strip common prefixes
        $clean_key = str_replace(['rank_math_', '_seo_os_', 'facebook_'], '', $key);
        // Map facebook_* → og_*
        if (strpos($key, 'facebook_') !== false) {
            $clean_key = 'og_' . str_replace('facebook_', '', $clean_key);
        }

        if (isset($field_map[$clean_key])) {
            [$seo_os_key, $rm_key] = $field_map[$clean_key];

            // Sanitize
            $sanitized = is_numeric($value) ? intval($value) : sanitize_text_field($value);

            // Always write to SEO OS own field
            update_post_meta($post_id, $seo_os_key, $sanitized);
            $updated[$seo_os_key] = $sanitized;

            // Also write to Rank Math field (keeps RM in sync)
            if ($rm_key && seo_os_is_rank_math_active()) {
                update_post_meta($post_id, $rm_key, $sanitized);
                $updated[$rm_key] = $sanitized;
            }
        } elseif (isset($rm_fields[$key])) {
            // Direct Rank Math key (backwards compat)
            $sanitized = is_numeric($value) ? intval($value) : sanitize_text_field($value);
            update_post_meta($post_id, $key, $sanitized);
            $updated[$key] = $sanitized;
        } else {
            $errors[] = "Unknown field: {$key}";
        }
    }

    $seo_data = seo_os_extract_all_seo_data($post_id);

    return new WP_REST_Response([
        'success' => true,
        'updated' => $updated,
        'errors'  => $errors,
        'meta'    => $seo_data,
    ], 200);
}

/** GET /posts/{id}/score */
function seo_os_get_post_score(WP_REST_Request $request): WP_REST_Response {
    $post_id = (int) $request->get_param('id');
    $post = get_post($post_id);
    if (!$post) return new WP_REST_Response(['error' => 'Post not found'], 404);

    $content = $post->post_content;
    $keyword = seo_os_get_seo_value($post_id, 'focus_keyword');
    $title = seo_os_get_seo_value($post_id, 'title', $post->post_title);
    $description = seo_os_get_seo_value($post_id, 'description');

    $word_count = str_word_count(wp_strip_all_tags($content));
    $keyword_count = $keyword ? substr_count(strtolower(wp_strip_all_tags($content)), strtolower($keyword)) : 0;
    $keyword_density = $word_count > 0 ? round(($keyword_count / $word_count) * 100, 2) : 0;

    $score_data = [
        'post_id'           => $post_id,
        'seo_score'         => (int) seo_os_get_seo_value($post_id, 'seo_score') ?: null,
        'readability_score' => (int) seo_os_get_seo_value($post_id, 'readability_score') ?: null,
        'focus_keyword'     => $keyword ?: null,
        'source'            => seo_os_is_renderer() ? 'seo-os' : 'rankmath',
        'analysis'          => [
            'title_length'             => mb_strlen($title),
            'description_length'       => mb_strlen($description),
            'word_count'               => $word_count,
            'keyword_count'            => $keyword_count,
            'keyword_density'          => $keyword_density,
            'keyword_in_title'         => $keyword ? (stripos($title, $keyword) !== false) : false,
            'keyword_in_description'   => $keyword ? (stripos($description, $keyword) !== false) : false,
        ],
    ];

    return new WP_REST_Response(['success' => true, 'score' => $score_data], 200);
}

/** GET /posts/{id}/head — returns structured head data */
function seo_os_get_post_head(WP_REST_Request $request): WP_REST_Response {
    $post_id = (int) $request->get_param('id');
    $post = get_post($post_id);
    if (!$post) return new WP_REST_Response(['error' => 'Post not found'], 404);

    $settings = seo_os_get_settings();
    $permalink = get_permalink($post_id);

    $title = seo_os_get_seo_value($post_id, 'title', $post->post_title);
    $description = seo_os_get_seo_value($post_id, 'description');
    $canonical = seo_os_get_seo_value($post_id, 'canonical_url');
    $robots = seo_os_get_seo_value($post_id, 'robots', 'index, follow');

    $og_title = seo_os_get_seo_value($post_id, 'og_title');
    $og_desc = seo_os_get_seo_value($post_id, 'og_description');
    $og_image = seo_os_get_seo_value($post_id, 'og_image');

    $tw_title = seo_os_get_seo_value($post_id, 'twitter_title');
    $tw_desc = seo_os_get_seo_value($post_id, 'twitter_description');
    $tw_image = seo_os_get_seo_value($post_id, 'twitter_image');
    $tw_card = seo_os_get_seo_value($post_id, 'twitter_card_type', 'summary_large_image');

    $featured_img = get_the_post_thumbnail_url($post_id, 'full');

    $head_data = [
        'post_id'   => $post_id,
        'renderer'  => $settings['seo_renderer'],
        'title'     => $title,
        'meta'      => [
            'description' => $description ?: null,
            'robots'      => $robots,
            'canonical'   => !empty($canonical) ? $canonical : $permalink,
        ],
        'og' => [
            'title'       => $og_title ?: $title,
            'description' => $og_desc ?: ($description ?: ''),
            'image'       => $og_image ?: $featured_img,
            'url'         => $permalink,
            'type'        => 'article',
            'site_name'   => get_bloginfo('name'),
        ],
        'twitter' => [
            'card'        => $tw_card,
            'title'       => $tw_title ?: ($og_title ?: $title),
            'description' => $tw_desc ?: ($og_desc ?: ($description ?: '')),
            'image'       => $tw_image ?: ($og_image ?: $featured_img),
        ],
        'schema' => seo_os_get_seo_value($post_id, 'schema_json') ?: null,
    ];

    return new WP_REST_Response(['success' => true, 'head' => $head_data], 200);
}

// ═══════════════════════════════════════════════════════════
// 7. Helpers
// ═══════════════════════════════════════════════════════════

/**
 * Extract all SEO data for a post (merged SEO OS + Rank Math).
 */
function seo_os_extract_all_seo_data(int $post_id): array {
    $data = [];

    // Read SEO OS own fields first
    $seo_os_fields = seo_os_get_fields();
    foreach ($seo_os_fields as $meta_key => $config) {
        $value = get_post_meta($post_id, $meta_key, true);
        $clean_key = str_replace('_seo_os_', '', $meta_key);
        $data[$clean_key] = ($config['type'] === 'integer' && $value) ? intval($value) : ($value ?: null);
    }

    // Read Rank Math fields (prefix with rm_ to distinguish)
    if (seo_os_is_rank_math_active()) {
        $rm_fields = seo_os_get_rank_math_fields();
        foreach ($rm_fields as $meta_key => $config) {
            $value = get_post_meta($post_id, $meta_key, true);
            $clean_key = str_replace('rank_math_', '', $meta_key);

            // Only fill in if SEO OS field is empty (RM as fallback)
            if (empty($data[$clean_key]) || $data[$clean_key] === null) {
                if ($config['type'] === 'integer' && $value) {
                    $data[$clean_key] = intval($value);
                } else {
                    $data[$clean_key] = $value ?: null;
                }
            }

            // Also expose raw RM value under rm_ prefix
            $rm_clean = 'rm_' . $clean_key;
            $data[$rm_clean] = ($config['type'] === 'integer' && $value) ? intval($value) : ($value ?: null);
        }
    }

    // Parse robots array
    if (isset($data['robots']) && is_array($data['robots'])) {
        $data['robots'] = implode(',', $data['robots']);
    }

    // Parse additional keywords
    if (!empty($data['additional_keywords'])) {
        $data['additional_keywords_list'] = array_map('trim', explode(',', $data['additional_keywords']));
    } else if (!empty($data['focus_keywords'])) {
        $data['additional_keywords_list'] = array_map('trim', explode(',', $data['focus_keywords']));
    } else {
        $data['additional_keywords_list'] = [];
    }

    // Source indicator
    $data['_renderer'] = seo_os_get_settings()['seo_renderer'];

    return $data;
}

/**
 * Analyze content: count links, images, etc.
 */
function seo_os_analyze_content(string $content, int $post_id): array {
    $site_url = get_site_url();

    preg_match_all('/<a\s[^>]*href=["\']([^"\']+)["\'][^>]*>/i', $content, $link_matches);
    $all_links = $link_matches[1] ?? [];
    $internal = 0;
    $external = 0;
    foreach ($all_links as $link) {
        if (strpos($link, $site_url) === 0 || strpos($link, '/') === 0) {
            $internal++;
        } else {
            $external++;
        }
    }

    preg_match_all('/<img\s[^>]*>/i', $content, $img_matches);
    $images_total = count($img_matches[0] ?? []);
    $images_with_alt = 0;
    foreach (($img_matches[0] ?? []) as $img_tag) {
        if (preg_match('/alt=["\'][^"\']+["\']/', $img_tag)) {
            $images_with_alt++;
        }
    }

    return [
        'internal_links_count' => $internal,
        'external_links_count' => $external,
        'images_count'         => $images_total,
        'images_alt_count'     => $images_with_alt,
    ];
}

// ═══════════════════════════════════════════════════════════
// 8. Register Meta Fields in WP REST API
// ═══════════════════════════════════════════════════════════

add_action('init', function () {
    // Register SEO OS own fields
    foreach (seo_os_get_fields() as $meta_key => $config) {
        register_post_meta('post', $meta_key, [
            'type'          => $config['type'],
            'single'        => true,
            'show_in_rest'  => true,
            'auth_callback' => function () { return current_user_can('edit_posts'); },
        ]);
    }

    // Register Rank Math fields too (for standard WP REST API access)
    foreach (seo_os_get_rank_math_fields() as $meta_key => $config) {
        register_post_meta('post', $meta_key, [
            'type'          => $config['type'],
            'single'        => true,
            'show_in_rest'  => true,
            'auth_callback' => function () { return current_user_can('edit_posts'); },
        ]);
    }
});

// ═══════════════════════════════════════════════════════════
// 9. Admin Settings Page
// ═══════════════════════════════════════════════════════════

add_action('admin_menu', function () {
    add_management_page(
        'SEO OS Connector',
        'SEO OS Connector',
        'manage_options',
        'seo-os-connector',
        'seo_os_settings_page'
    );
});

/** Handle settings form submission */
add_action('admin_init', function () {
    if (!isset($_POST['seo_os_save_settings']) || !check_admin_referer('seo_os_settings_nonce')) {
        return;
    }

    $settings = seo_os_get_settings();
    $settings['seo_renderer'] = sanitize_text_field($_POST['seo_renderer'] ?? 'seo-os');
    $settings['render_og'] = !empty($_POST['render_og']);
    $settings['render_twitter'] = !empty($_POST['render_twitter']);
    $settings['render_schema'] = !empty($_POST['render_schema']);
    $settings['schema_default_type'] = sanitize_text_field($_POST['schema_default_type'] ?? 'Article');
    $settings['separator'] = sanitize_text_field($_POST['separator'] ?? '—');

    update_option('seo_os_settings', $settings);
    add_settings_error('seo_os', 'settings_updated', 'Settings saved.', 'updated');
});

/** Render settings page */
function seo_os_settings_page(): void {
    $settings = seo_os_get_settings();
    $api_base = rest_url(SEO_OS_CONNECTOR_NAMESPACE);
    $rm_active = seo_os_is_rank_math_active();
    $rm_version = $rm_active && defined('RANK_MATH_VERSION') ? RANK_MATH_VERSION : 'N/A';
    settings_errors('seo_os');
    ?>
    <div class="wrap">
        <h1 style="display:flex;align-items:center;gap:8px;">
            <span style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;font-weight:bold;font-size:16px;">R</span>
            SEO OS Connector
            <span style="background:#e0e7ff;color:#4f46e5;font-size:11px;padding:2px 8px;border-radius:4px;font-weight:600;">v<?php echo SEO_OS_CONNECTOR_VERSION; ?></span>
        </h1>

        <!-- Status Card -->
        <div class="card" style="max-width:860px;padding:24px;margin-top:16px;">
            <h2 style="margin-top:0;">Status</h2>
            <table class="form-table" style="margin:0;">
                <tr>
                    <th style="width:180px;">SEO Renderer</th>
                    <td>
                        <?php if ($settings['seo_renderer'] === 'seo-os'): ?>
                            <span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:4px;font-weight:600;font-size:12px;">SEO OS</span>
                            <span style="color:#6b7280;font-size:12px;margin-left:8px;">Plugin renders &lt;head&gt; tags</span>
                        <?php else: ?>
                            <span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:4px;font-weight:600;font-size:12px;">Rank Math</span>
                            <span style="color:#6b7280;font-size:12px;margin-left:8px;">Rank Math renders &lt;head&gt; tags</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <tr>
                    <th>Rank Math</th>
                    <td>
                        <?php if ($rm_active): ?>
                            <span style="color:#166534;font-weight:600;">Active</span> (v<?php echo esc_html($rm_version); ?>)
                        <?php else: ?>
                            <span style="color:#6b7280;">Not installed</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <tr>
                    <th>API Base</th>
                    <td><code style="font-size:12px;"><?php echo esc_html($api_base); ?></code></td>
                </tr>
            </table>
        </div>

        <!-- Settings Card -->
        <form method="post">
            <?php wp_nonce_field('seo_os_settings_nonce'); ?>
            <div class="card" style="max-width:860px;padding:24px;margin-top:16px;">
                <h2 style="margin-top:0;">SEO Rendering Mode</h2>
                <p style="color:#6b7280;margin-top:0;">Choose who renders SEO meta tags in the &lt;head&gt; of your pages.</p>

                <table class="form-table" style="margin:0;">
                    <tr>
                        <th style="width:180px;">Renderer</th>
                        <td>
                            <fieldset>
                                <label style="display:block;padding:12px 16px;border:2px solid <?php echo $settings['seo_renderer'] === 'seo-os' ? '#6366f1' : '#e5e7eb'; ?>;border-radius:8px;margin-bottom:8px;cursor:pointer;background:<?php echo $settings['seo_renderer'] === 'seo-os' ? '#eef2ff' : '#fff'; ?>;">
                                    <input type="radio" name="seo_renderer" value="seo-os" <?php checked($settings['seo_renderer'], 'seo-os'); ?> style="margin-right:8px;" />
                                    <strong>SEO OS</strong> — Simple, lightweight. Plugin renders title, meta, OG, Twitter, Schema.
                                    <?php if (!$rm_active): ?>
                                        <span style="background:#dcfce7;color:#166534;font-size:10px;padding:1px 6px;border-radius:3px;margin-left:4px;">Recommended</span>
                                    <?php endif; ?>
                                </label>
                                <label style="display:block;padding:12px 16px;border:2px solid <?php echo $settings['seo_renderer'] === 'rankmath' ? '#6366f1' : '#e5e7eb'; ?>;border-radius:8px;cursor:pointer;background:<?php echo $settings['seo_renderer'] === 'rankmath' ? '#eef2ff' : '#fff'; ?>;<?php if (!$rm_active) echo 'opacity:0.5;'; ?>">
                                    <input type="radio" name="seo_renderer" value="rankmath" <?php checked($settings['seo_renderer'], 'rankmath'); ?> <?php if (!$rm_active) echo 'disabled'; ?> style="margin-right:8px;" />
                                    <strong>Rank Math</strong> — Full-featured SEO plugin. Connector acts as API bridge only.
                                    <?php if (!$rm_active): ?>
                                        <span style="color:#ef4444;font-size:11px;margin-left:4px;">Requires Rank Math plugin</span>
                                    <?php endif; ?>
                                </label>
                            </fieldset>
                        </td>
                    </tr>
                </table>

                <h3 style="margin-top:24px;">SEO OS Renderer Options</h3>
                <p style="color:#6b7280;margin-top:0;font-size:13px;">These options only apply when "SEO OS" is the active renderer.</p>
                <table class="form-table" style="margin:0;">
                    <tr>
                        <th style="width:180px;">Open Graph</th>
                        <td>
                            <label>
                                <input type="checkbox" name="render_og" value="1" <?php checked($settings['render_og']); ?> />
                                Render OG tags (og:title, og:description, og:image, etc.)
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th>Twitter Cards</th>
                        <td>
                            <label>
                                <input type="checkbox" name="render_twitter" value="1" <?php checked($settings['render_twitter']); ?> />
                                Render Twitter Card tags (twitter:card, twitter:title, etc.)
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th>Schema Markup</th>
                        <td>
                            <label>
                                <input type="checkbox" name="render_schema" value="1" <?php checked($settings['render_schema']); ?> />
                                Render JSON-LD Schema markup (Article, etc.)
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th>Default Schema Type</th>
                        <td>
                            <select name="schema_default_type">
                                <?php foreach (['Article', 'NewsArticle', 'BlogPosting', 'TechArticle', 'HowTo'] as $type): ?>
                                    <option value="<?php echo $type; ?>" <?php selected($settings['schema_default_type'], $type); ?>><?php echo $type; ?></option>
                                <?php endforeach; ?>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>Title Separator</th>
                        <td>
                            <select name="separator">
                                <?php foreach (['—', '-', '|', '·', '»', '•'] as $sep): ?>
                                    <option value="<?php echo esc_attr($sep); ?>" <?php selected($settings['separator'], $sep); ?>><?php echo esc_html($sep); ?></option>
                                <?php endforeach; ?>
                            </select>
                            <span style="color:#9ca3af;font-size:12px;margin-left:8px;">Used in: "Post Title <?php echo esc_html($settings['separator']); ?> Site Name"</span>
                        </td>
                    </tr>
                </table>

                <p style="margin-top:20px;">
                    <input type="submit" name="seo_os_save_settings" class="button-primary" value="Save Settings" />
                </p>
            </div>
        </form>

        <!-- API Endpoints Card -->
        <div class="card" style="max-width:860px;padding:24px;margin-top:16px;">
            <h2 style="margin-top:0;">API Endpoints</h2>
            <table class="widefat striped" style="margin-top:8px;">
                <thead>
                    <tr><th>Method</th><th>Endpoint</th><th>Description</th></tr>
                </thead>
                <tbody>
                    <tr><td><code>GET</code></td><td><code>/seo-os/v1/ping</code></td><td>Health check</td></tr>
                    <tr><td><code>GET</code></td><td><code>/seo-os/v1/info</code></td><td>Plugin & site info</td></tr>
                    <tr><td><code>GET/POST</code></td><td><code>/seo-os/v1/settings</code></td><td>Read/update renderer settings</td></tr>
                    <tr><td><code>GET</code></td><td><code>/seo-os/v1/posts</code></td><td>List posts with SEO data</td></tr>
                    <tr><td><code>GET</code></td><td><code>/seo-os/v1/posts/{id}/meta</code></td><td>Get all SEO fields</td></tr>
                    <tr><td><code>POST</code></td><td><code>/seo-os/v1/posts/{id}/meta</code></td><td>Update SEO fields</td></tr>
                    <tr><td><code>GET</code></td><td><code>/seo-os/v1/posts/{id}/score</code></td><td>Get SEO score + analysis</td></tr>
                    <tr><td><code>GET</code></td><td><code>/seo-os/v1/posts/{id}/head</code></td><td>Get rendered SEO head tags</td></tr>
                </tbody>
            </table>
            <p style="margin-top:12px;">
                <a href="<?php echo esc_url($api_base . '/ping'); ?>" target="_blank" class="button">Test Ping</a>
                <a href="<?php echo esc_url($api_base . '/info'); ?>" target="_blank" class="button">View Info</a>
                <a href="<?php echo esc_url($api_base . '/settings'); ?>" target="_blank" class="button">View Settings</a>
            </p>
        </div>

        <!-- Setup Card -->
        <div class="card" style="max-width:860px;padding:24px;margin-top:16px;">
            <h2 style="margin-top:0;">Connect to SEO OS</h2>
            <table class="form-table" style="margin:0;">
                <tr>
                    <th style="width:180px;">Site URL</th>
                    <td><code><?php echo esc_html(str_replace(['https://', 'http://'], '', get_site_url())); ?></code></td>
                </tr>
                <tr>
                    <th>Authentication</th>
                    <td>WordPress Application Passwords (Users &rarr; Profile &rarr; Application Passwords)</td>
                </tr>
            </table>
        </div>
    </div>
    <?php
}

/** Show admin notice if using SEO OS mode without Rank Math (informational) */
add_action('admin_notices', function () {
    $screen = get_current_screen();
    if (!$screen || $screen->id !== 'tools_page_seo-os-connector') return;

    $settings = seo_os_get_settings();
    if ($settings['seo_renderer'] === 'seo-os' && seo_os_is_rank_math_active()) {
        echo '<div class="notice notice-info"><p>';
        echo '<strong>SEO OS Connector:</strong> SEO OS mode is active. Rank Math\'s &lt;head&gt; output is disabled. ';
        echo 'SEO data from Rank Math is still used as fallback when SEO OS fields are empty.';
        echo '</p></div>';
    }
});

// ═══════════════════════════════════════════════════════════
// 10. Redirect Management (Safe Layer — never overwrites other plugins)
// ═══════════════════════════════════════════════════════════

/**
 * Check if another redirect plugin already handles a given source path.
 * Supports: Redirection plugin, RankMath, Yoast SEO Premium, Safe Redirect Manager.
 * Returns ['handled' => true, 'plugin' => 'name'] if another plugin owns this path.
 */
function seo_os_check_redirect_conflict(string $source_path): array {
    // 1. Check Redirection plugin (redirection table)
    global $wpdb;
    if ($wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}redirection_items'") !== null) {
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT id, url FROM {$wpdb->prefix}redirection_items WHERE url = %s AND status = 'enabled' LIMIT 1",
            $source_path
        ));
        if ($existing) {
            return ['handled' => true, 'plugin' => 'Redirection'];
        }
    }

    // 2. Check RankMath redirections
    if ($wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}rank_math_redirections'") !== null) {
        $rm_source = ltrim($source_path, '/');
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}rank_math_redirections WHERE sources LIKE %s AND status = 'active' LIMIT 1",
            '%' . $wpdb->esc_like($rm_source) . '%'
        ));
        if ($existing) {
            return ['handled' => true, 'plugin' => 'RankMath'];
        }
    }

    // 3. Check Safe Redirect Manager (post type)
    if (post_type_exists('redirect_rule')) {
        $args = [
            'post_type'      => 'redirect_rule',
            'post_status'    => 'publish',
            'posts_per_page' => 1,
            'meta_query'     => [
                ['key' => '_redirect_rule_from', 'value' => $source_path, 'compare' => '='],
            ],
        ];
        $q = new WP_Query($args);
        if ($q->have_posts()) {
            return ['handled' => true, 'plugin' => 'Safe Redirect Manager'];
        }
    }

    return ['handled' => false, 'plugin' => null];
}

/**
 * Detect redirect loops: A → B → A or A → B → C → A (max 10 hops).
 * Returns true if a loop is detected.
 */
function seo_os_detect_redirect_loop(string $source_path, string $target_url, array $redirects): bool {
    $visited = [$source_path];
    $current = $target_url;
    $max_hops = 10;

    for ($i = 0; $i < $max_hops; $i++) {
        // Normalize current to path only
        $current_path = parse_url($current, PHP_URL_PATH);
        if (empty($current_path)) break;

        // Check if we've been here before
        if (in_array($current_path, $visited, true)) {
            return true; // Loop detected
        }
        $visited[] = $current_path;

        // Find if this path has a redirect too
        $found = false;
        foreach ($redirects as $rule) {
            if (!($rule['enabled'] ?? true)) continue;
            $rule_source = $rule['source_path'] ?? '';
            if (rtrim($rule_source, '/') === rtrim($current_path, '/')) {
                $current = $rule['target_url'];
                $found = true;
                break;
            }
        }
        if (!$found) break;
    }

    return false;
}

// Handle redirects on every page load (priority 1 = before everything)
add_action('template_redirect', 'seo_os_handle_redirects', 1);

function seo_os_handle_redirects(): void {
    $request_uri = $_SERVER['REQUEST_URI'] ?? '';
    $path = parse_url($request_uri, PHP_URL_PATH);
    if (empty($path)) return;

    // Normalize: ensure leading slash, strip trailing slash (except root)
    $path = '/' . ltrim($path, '/');
    if ($path !== '/' && substr($path, -1) === '/') {
        $path_trimmed = rtrim($path, '/');
    } else {
        $path_trimmed = $path;
    }

    $redirects = get_option('seo_os_redirects', []);
    if (empty($redirects) || !is_array($redirects)) return;

    // 1. Exact match (fast lookup)
    foreach ($redirects as $rule) {
        if (!empty($rule['is_regex'])) continue;
        if (!($rule['enabled'] ?? true)) continue;

        $source = $rule['source_path'] ?? '';
        $source_trimmed = rtrim($source, '/');
        if ($source_trimmed === '') $source_trimmed = '/';

        if ($path === $source || $path_trimmed === $source_trimmed) {
            $type = intval($rule['type'] ?? 301);
            wp_redirect($rule['target_url'], $type);
            exit;
        }
    }

    // 2. Regex match (slower, checked second)
    foreach ($redirects as $rule) {
        if (empty($rule['is_regex'])) continue;
        if (!($rule['enabled'] ?? true)) continue;

        $pattern = $rule['source_path'] ?? '';
        if (empty($pattern)) continue;

        // Convert wildcard * to regex .* if not already regex
        $regex_pattern = str_replace('*', '(.*)', $pattern);
        $regex_pattern = '#^' . $regex_pattern . '$#i';

        if (preg_match($regex_pattern, $path, $matches)) {
            $target = $rule['target_url'];
            // Replace $1, $2, etc. with captured groups
            for ($i = 1; $i < count($matches); $i++) {
                $target = str_replace('$' . $i, $matches[$i], $target);
            }
            $type = intval($rule['type'] ?? 301);
            wp_redirect($target, $type);
            exit;
        }
    }
}

// Log 404 errors (priority 10, after redirect check)
add_action('template_redirect', 'seo_os_log_404', 10);

function seo_os_log_404(): void {
    if (!is_404()) return;

    $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if (empty($path)) return;

    // Throttle: don't log same path more than once per 5 minutes
    $transient_key = 'seo_os_404_' . md5($path);
    if (get_transient($transient_key)) return;
    set_transient($transient_key, 1, 300); // 5 minutes

    // Store in local buffer (wp_options)
    $buffer = get_option('seo_os_404_buffer', []);
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';

    // Find existing entry or create new
    $found = false;
    foreach ($buffer as &$entry) {
        if ($entry['path'] === $path) {
            $entry['hits'] = ($entry['hits'] ?? 1) + 1;
            $entry['last_seen'] = current_time('mysql', true);
            $entry['referer'] = $referer ?: $entry['referer'];
            $entry['user_agent'] = $user_agent ?: $entry['user_agent'];
            $found = true;
            break;
        }
    }
    unset($entry);

    if (!$found) {
        $buffer[] = [
            'path'       => $path,
            'referer'    => $referer,
            'user_agent' => $user_agent,
            'hits'       => 1,
            'first_seen' => current_time('mysql', true),
            'last_seen'  => current_time('mysql', true),
        ];
    }

    // Keep buffer at max 500 entries (oldest removed)
    if (count($buffer) > 500) {
        $buffer = array_slice($buffer, -500);
    }

    update_option('seo_os_404_buffer', $buffer, false); // no autoload
}

// Detect slug changes and auto-create redirects
add_action('post_updated', 'seo_os_detect_slug_change', 10, 3);

function seo_os_detect_slug_change(int $post_id, WP_Post $post_after, WP_Post $post_before): void {
    // Only track published posts
    if ($post_after->post_status !== 'publish') return;
    if ($post_before->post_name === $post_after->post_name) return;
    if (empty($post_before->post_name)) return;

    $old_path = '/' . $post_before->post_name . '/';
    $new_url = get_permalink($post_id);

    // Store in slug change buffer for SEO OS to pick up
    $changes = get_option('seo_os_slug_changes', []);
    $changes[] = [
        'post_id'  => $post_id,
        'old_path' => $old_path,
        'new_url'  => $new_url,
        'old_slug' => $post_before->post_name,
        'new_slug' => $post_after->post_name,
        'time'     => current_time('mysql', true),
    ];

    // Keep max 100 entries
    if (count($changes) > 100) {
        $changes = array_slice($changes, -100);
    }

    update_option('seo_os_slug_changes', $changes, false);

    // Check if another plugin already handles this path — if so, skip
    $conflict = seo_os_check_redirect_conflict($old_path);
    if ($conflict['handled']) {
        // Another plugin owns this redirect — we just log it, don't override
        $changes[count($changes) - 1]['skipped'] = true;
        $changes[count($changes) - 1]['conflict_plugin'] = $conflict['plugin'];
        update_option('seo_os_slug_changes', $changes, false);
        return;
    }

    // Also add to local redirect cache immediately
    $redirects = get_option('seo_os_redirects', []);
    // Check if already exists in our own rules
    foreach ($redirects as $r) {
        if (($r['source_path'] ?? '') === $old_path) return;
    }

    // Check for loops before creating
    if (seo_os_detect_redirect_loop($old_path, $new_url, $redirects)) {
        return; // Would create a loop — skip
    }

    $redirects[] = [
        'source_path'    => $old_path,
        'target_url'     => $new_url,
        'type'           => '301',
        'is_regex'       => false,
        'enabled'        => true,
        'auto_generated' => true,
        'note'           => "Slug changed: {$post_before->post_name} → {$post_after->post_name}",
    ];

    update_option('seo_os_redirects', $redirects);
}

// ═══════════════════════════════════════════════════════════
// 11. Redirect REST API Endpoints
// ═══════════════════════════════════════════════════════════

add_action('rest_api_init', function () {
    // GET /seo-os/v1/redirects — get cached redirect rules
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/redirects', [
        'methods'             => 'GET',
        'callback'            => 'seo_os_get_redirects',
        'permission_callback' => 'seo_os_check_permissions',
    ]);

    // POST /seo-os/v1/redirects/sync — receive full redirect list from SEO OS
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/redirects/sync', [
        'methods'             => 'POST',
        'callback'            => 'seo_os_sync_redirects',
        'permission_callback' => 'seo_os_check_admin_permissions',
    ]);

    // GET /seo-os/v1/redirects/404-log — get 404 buffer
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/redirects/404-log', [
        'methods'             => 'GET',
        'callback'            => 'seo_os_get_404_log',
        'permission_callback' => 'seo_os_check_permissions',
    ]);

    // DELETE /seo-os/v1/redirects/404-log — clear 404 buffer
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/redirects/404-log', [
        'methods'             => 'DELETE',
        'callback'            => 'seo_os_clear_404_log',
        'permission_callback' => 'seo_os_check_admin_permissions',
    ]);

    // GET /seo-os/v1/redirects/slug-changes — get slug change log
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/redirects/slug-changes', [
        'methods'             => 'GET',
        'callback'            => 'seo_os_get_slug_changes',
        'permission_callback' => 'seo_os_check_permissions',
    ]);

    // DELETE /seo-os/v1/redirects/slug-changes — clear slug changes after sync
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/redirects/slug-changes', [
        'methods'             => 'DELETE',
        'callback'            => 'seo_os_clear_slug_changes',
        'permission_callback' => 'seo_os_check_admin_permissions',
    ]);

    // POST /seo-os/v1/redirects/test — test a URL against redirect rules
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/redirects/test', [
        'methods'             => 'POST',
        'callback'            => 'seo_os_test_redirect',
        'permission_callback' => 'seo_os_check_permissions',
    ]);

    // POST /seo-os/v1/redirects/validate — check for conflicts + loops before creating
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/redirects/validate', [
        'methods'             => 'POST',
        'callback'            => 'seo_os_validate_redirect',
        'permission_callback' => 'seo_os_check_permissions',
    ]);
});

function seo_os_get_redirects(): WP_REST_Response {
    $redirects = get_option('seo_os_redirects', []);
    return new WP_REST_Response([
        'success'   => true,
        'redirects' => $redirects,
        'count'     => count($redirects),
    ], 200);
}

function seo_os_sync_redirects(WP_REST_Request $request): WP_REST_Response {
    $body = $request->get_json_params();
    $redirects = $body['redirects'] ?? [];

    if (!is_array($redirects)) {
        return new WP_REST_Response(['error' => 'Invalid redirects data'], 400);
    }

    // Validate and sanitize each rule
    $clean = [];
    foreach ($redirects as $rule) {
        $clean[] = [
            'id'             => sanitize_text_field($rule['id'] ?? ''),
            'source_path'    => sanitize_text_field($rule['source_path'] ?? ''),
            'target_url'     => esc_url_raw($rule['target_url'] ?? ''),
            'type'           => in_array($rule['type'] ?? '301', ['301', '302', '307']) ? $rule['type'] : '301',
            'is_regex'       => !empty($rule['is_regex']),
            'enabled'        => $rule['enabled'] ?? true,
            'auto_generated' => $rule['auto_generated'] ?? false,
            'note'           => sanitize_text_field($rule['note'] ?? ''),
        ];
    }

    update_option('seo_os_redirects', $clean);

    return new WP_REST_Response([
        'success' => true,
        'synced'  => count($clean),
    ], 200);
}

function seo_os_get_404_log(): WP_REST_Response {
    $buffer = get_option('seo_os_404_buffer', []);
    // Sort by hits desc
    usort($buffer, function ($a, $b) {
        return ($b['hits'] ?? 0) - ($a['hits'] ?? 0);
    });
    return new WP_REST_Response([
        'success' => true,
        'entries' => $buffer,
        'count'   => count($buffer),
    ], 200);
}

function seo_os_clear_404_log(): WP_REST_Response {
    update_option('seo_os_404_buffer', []);
    return new WP_REST_Response(['success' => true], 200);
}

function seo_os_get_slug_changes(): WP_REST_Response {
    $changes = get_option('seo_os_slug_changes', []);
    return new WP_REST_Response([
        'success' => true,
        'changes' => $changes,
        'count'   => count($changes),
    ], 200);
}

function seo_os_clear_slug_changes(): WP_REST_Response {
    update_option('seo_os_slug_changes', []);
    return new WP_REST_Response(['success' => true], 200);
}

function seo_os_test_redirect(WP_REST_Request $request): WP_REST_Response {
    $body = $request->get_json_params();
    $test_url = $body['url'] ?? '';
    if (empty($test_url)) {
        return new WP_REST_Response(['error' => 'URL is required'], 400);
    }

    $path = parse_url($test_url, PHP_URL_PATH);
    if (empty($path)) $path = '/';

    $redirects = get_option('seo_os_redirects', []);

    // Test exact matches
    foreach ($redirects as $rule) {
        if (!empty($rule['is_regex'])) continue;
        if (!($rule['enabled'] ?? true)) continue;

        $source = rtrim($rule['source_path'] ?? '', '/');
        $test_path = rtrim($path, '/');
        if ($source === '' || $test_path === '') {
            if ($path === ($rule['source_path'] ?? '')) {
                return new WP_REST_Response([
                    'success' => true,
                    'match'   => true,
                    'rule'    => $rule,
                    'target'  => $rule['target_url'],
                    'type'    => $rule['type'] ?? '301',
                ], 200);
            }
        } elseif ($source === $test_path) {
            return new WP_REST_Response([
                'success' => true,
                'match'   => true,
                'rule'    => $rule,
                'target'  => $rule['target_url'],
                'type'    => $rule['type'] ?? '301',
            ], 200);
        }
    }

    // Test regex matches
    foreach ($redirects as $rule) {
        if (empty($rule['is_regex'])) continue;
        if (!($rule['enabled'] ?? true)) continue;

        $pattern = $rule['source_path'] ?? '';
        $regex = '#^' . str_replace('*', '(.*)', $pattern) . '$#i';
        if (preg_match($regex, $path, $matches)) {
            $target = $rule['target_url'];
            for ($i = 1; $i < count($matches); $i++) {
                $target = str_replace('$' . $i, $matches[$i], $target);
            }
            return new WP_REST_Response([
                'success' => true,
                'match'   => true,
                'rule'    => $rule,
                'target'  => $target,
                'type'    => $rule['type'] ?? '301',
            ], 200);
        }
    }

    return new WP_REST_Response([
        'success' => true,
        'match'   => false,
        'message' => 'No redirect rule matches this URL',
    ], 200);
}

/**
 * Validate a redirect before creation — checks conflicts with other plugins,
 * redirect loops, and whether the target URL returns 200.
 */
function seo_os_validate_redirect(WP_REST_Request $request): WP_REST_Response {
    $body = $request->get_json_params();
    $source_path = $body['source_path'] ?? '';
    $target_url  = $body['target_url'] ?? '';

    if (empty($source_path)) {
        return new WP_REST_Response(['error' => 'source_path is required'], 400);
    }

    $warnings = [];
    $errors   = [];

    // 1. Check conflict with other redirect plugins
    $conflict = seo_os_check_redirect_conflict($source_path);
    if ($conflict['handled']) {
        $warnings[] = [
            'type'    => 'conflict',
            'message' => "This path is already handled by {$conflict['plugin']}. SEO OS will NOT override it.",
            'plugin'  => $conflict['plugin'],
        ];
    }

    // 2. Check redirect loop
    if (!empty($target_url)) {
        $redirects = get_option('seo_os_redirects', []);
        if (seo_os_detect_redirect_loop($source_path, $target_url, $redirects)) {
            $errors[] = [
                'type'    => 'loop',
                'message' => 'This redirect would create a redirect loop (A → B → ... → A).',
            ];
        }

        // 3. Check if source = target (self-redirect)
        $target_path = parse_url($target_url, PHP_URL_PATH);
        if ($target_path && rtrim($source_path, '/') === rtrim($target_path, '/')) {
            $errors[] = [
                'type'    => 'self_redirect',
                'message' => 'Source and target paths are the same — this would cause an infinite loop.',
            ];
        }

        // 4. Quick check if target URL returns 200 (only for absolute or relative URLs)
        if (str_starts_with($target_url, '/')) {
            $full_url = home_url($target_url);
        } elseif (str_starts_with($target_url, 'http')) {
            $full_url = $target_url;
        } else {
            $full_url = null;
        }

        if ($full_url) {
            $response = wp_remote_head($full_url, ['timeout' => 3, 'redirection' => 0]);
            if (!is_wp_error($response)) {
                $status = wp_remote_retrieve_response_code($response);
                if ($status === 404) {
                    $warnings[] = [
                        'type'    => 'target_404',
                        'message' => "The target URL returns 404. The redirect would send visitors to a broken page.",
                    ];
                } elseif ($status >= 300 && $status < 400) {
                    $warnings[] = [
                        'type'    => 'target_redirects',
                        'message' => "The target URL itself redirects (HTTP {$status}). This creates a redirect chain.",
                    ];
                }
            }
        }
    }

    return new WP_REST_Response([
        'success'  => true,
        'safe'     => empty($errors),
        'errors'   => $errors,
        'warnings' => $warnings,
    ], 200);
}
