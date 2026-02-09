<?php
/**
 * Plugin Name: SEO OS Connector
 * Plugin URI: https://github.com/antigravity/seo-os-connector
 * Description: REST API bridge between SEO OS dashboard and WordPress. Exposes Rank Math SEO data, scores, and allows remote SEO management.
 * Version: 1.0.0
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

define('SEO_OS_CONNECTOR_VERSION', '1.0.0');
define('SEO_OS_CONNECTOR_NAMESPACE', 'seo-os/v1');

/**
 * All Rank Math meta keys we read/write
 */
function seo_os_get_rank_math_fields(): array {
    return [
        // Basic SEO
        'rank_math_title'              => ['type' => 'string', 'label' => 'SEO Title'],
        'rank_math_description'        => ['type' => 'string', 'label' => 'Meta Description'],
        'rank_math_focus_keyword'      => ['type' => 'string', 'label' => 'Focus Keyword'],
        'rank_math_seo_score'          => ['type' => 'integer', 'label' => 'SEO Score'],

        // Additional keywords
        'rank_math_focus_keywords'     => ['type' => 'string', 'label' => 'Additional Keywords (comma-separated)'],

        // Advanced SEO
        'rank_math_canonical_url'      => ['type' => 'string', 'label' => 'Canonical URL'],
        'rank_math_robots'             => ['type' => 'string', 'label' => 'Robots Meta'],

        // Open Graph / Facebook
        'rank_math_facebook_title'     => ['type' => 'string', 'label' => 'OG Title'],
        'rank_math_facebook_description' => ['type' => 'string', 'label' => 'OG Description'],
        'rank_math_facebook_image'     => ['type' => 'string', 'label' => 'OG Image URL'],

        // Twitter Card
        'rank_math_twitter_title'      => ['type' => 'string', 'label' => 'Twitter Title'],
        'rank_math_twitter_description' => ['type' => 'string', 'label' => 'Twitter Description'],
        'rank_math_twitter_image'      => ['type' => 'string', 'label' => 'Twitter Image URL'],
        'rank_math_twitter_card_type'  => ['type' => 'string', 'label' => 'Twitter Card Type'],
        'rank_math_twitter_use_facebook' => ['type' => 'string', 'label' => 'Twitter Use Facebook Data'],

        // Content Analysis
        'rank_math_readability_score'  => ['type' => 'integer', 'label' => 'Readability Score'],
        'rank_math_contentai_score'    => ['type' => 'integer', 'label' => 'Content AI Score'],

        // Schema
        'rank_math_primary_category'   => ['type' => 'integer', 'label' => 'Primary Category ID'],
        'rank_math_schema_article_type' => ['type' => 'string', 'label' => 'Schema Article Type'],
        'rank_math_schemas'            => ['type' => 'string', 'label' => 'Schema Config (JSON)'],

        // Pillar Content
        'rank_math_pillar_content'     => ['type' => 'string', 'label' => 'Pillar Content'],

        // Breadcrumb
        'rank_math_breadcrumb_title'   => ['type' => 'string', 'label' => 'Breadcrumb Title'],
    ];
}

/**
 * Register REST API routes
 */
add_action('rest_api_init', function () {

    // GET /seo-os/v1/ping - Health check
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/ping', [
        'methods'             => 'GET',
        'callback'            => 'seo_os_ping',
        'permission_callback' => 'seo_os_check_permissions',
    ]);

    // GET /seo-os/v1/posts - List posts with SEO data
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

    // GET /seo-os/v1/posts/{id}/meta - Get all Rank Math data for a post
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/posts/(?P<id>\d+)/meta', [
        'methods'             => 'GET',
        'callback'            => 'seo_os_get_post_meta',
        'permission_callback' => 'seo_os_check_permissions',
        'args'                => [
            'id' => ['required' => true, 'type' => 'integer'],
        ],
    ]);

    // POST /seo-os/v1/posts/{id}/meta - Update Rank Math data for a post
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/posts/(?P<id>\d+)/meta', [
        'methods'             => 'POST',
        'callback'            => 'seo_os_update_post_meta',
        'permission_callback' => 'seo_os_check_edit_permissions',
        'args'                => [
            'id' => ['required' => true, 'type' => 'integer'],
        ],
    ]);

    // GET /seo-os/v1/posts/{id}/score - Get/recalculate SEO score
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/posts/(?P<id>\d+)/score', [
        'methods'             => 'GET',
        'callback'            => 'seo_os_get_post_score',
        'permission_callback' => 'seo_os_check_permissions',
        'args'                => [
            'id' => ['required' => true, 'type' => 'integer'],
        ],
    ]);

    // GET /seo-os/v1/posts/{id}/head - Get rendered SEO head for a post
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/posts/(?P<id>\d+)/head', [
        'methods'             => 'GET',
        'callback'            => 'seo_os_get_post_head',
        'permission_callback' => 'seo_os_check_permissions',
        'args'                => [
            'id' => ['required' => true, 'type' => 'integer'],
        ],
    ]);

    // GET /seo-os/v1/info - Plugin & Rank Math info
    register_rest_route(SEO_OS_CONNECTOR_NAMESPACE, '/info', [
        'methods'             => 'GET',
        'callback'            => 'seo_os_get_info',
        'permission_callback' => 'seo_os_check_permissions',
    ]);
});

/**
 * Permission check: user must be logged in and can edit posts
 */
function seo_os_check_permissions(): bool {
    return current_user_can('edit_posts');
}

/**
 * Permission check for write operations: must be able to edit posts
 */
function seo_os_check_edit_permissions(): bool {
    return current_user_can('edit_posts');
}

/**
 * GET /ping - Health check
 */
function seo_os_ping(): WP_REST_Response {
    return new WP_REST_Response([
        'status'  => 'ok',
        'plugin'  => 'seo-os-connector',
        'version' => SEO_OS_CONNECTOR_VERSION,
        'wp'      => get_bloginfo('version'),
        'rank_math' => seo_os_is_rank_math_active(),
    ], 200);
}

/**
 * GET /info - Detailed plugin and site info
 */
function seo_os_get_info(WP_REST_Request $request): WP_REST_Response {
    $info = [
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
            'version' => seo_os_is_rank_math_active() ? (defined('RANK_MATH_VERSION') ? RANK_MATH_VERSION : 'unknown') : null,
        ],
        'available_fields' => array_keys(seo_os_get_rank_math_fields()),
    ];

    return new WP_REST_Response($info, 200);
}

/**
 * GET /posts - List posts with SEO meta data
 */
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
        $seo_meta = seo_os_extract_rank_math_data($post->ID);

        // Content analysis: count links and images
        $content = $post->post_content;
        $site_url = get_site_url();

        preg_match_all('/<a\s[^>]*href=["\']([^"\']+)["\'][^>]*>/i', $content, $link_matches);
        $all_links = $link_matches[1] ?? [];
        $internal_links = 0;
        $external_links = 0;
        foreach ($all_links as $link) {
            if (strpos($link, $site_url) === 0 || strpos($link, '/') === 0) {
                $internal_links++;
            } else {
                $external_links++;
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
            'content_analysis' => [
                'internal_links'  => $internal_links,
                'external_links'  => $external_links,
                'images_total'    => $images_total,
                'images_with_alt' => $images_with_alt,
            ],
        ];
    }

    return new WP_REST_Response([
        'success'    => true,
        'posts'      => $posts,
        'total'      => (int) $query->found_posts,
        'pages'      => (int) $query->max_num_pages,
        'page'       => (int) $request->get_param('page'),
        'per_page'   => (int) $request->get_param('per_page'),
    ], 200);
}

/**
 * GET /posts/{id}/meta - Get all Rank Math SEO data for a post
 */
function seo_os_get_post_meta(WP_REST_Request $request): WP_REST_Response {
    $post_id = (int) $request->get_param('id');
    $post = get_post($post_id);

    if (!$post) {
        return new WP_REST_Response(['error' => 'Post not found'], 404);
    }

    $seo_data = seo_os_extract_rank_math_data($post_id);

    // Add post context
    $seo_data['post_id']    = $post_id;
    $seo_data['post_title'] = $post->post_title;
    $seo_data['post_url']   = get_permalink($post_id);
    $seo_data['post_status'] = $post->post_status;
    $seo_data['word_count'] = str_word_count(wp_strip_all_tags($post->post_content));

    // Count links in content
    $content = $post->post_content;
    $site_url = get_site_url();

    preg_match_all('/<a\s[^>]*href=["\']([^"\']+)["\'][^>]*>/i', $content, $matches);
    $all_links = $matches[1] ?? [];
    $internal = 0;
    $external = 0;
    foreach ($all_links as $link) {
        if (strpos($link, $site_url) === 0 || strpos($link, '/') === 0) {
            $internal++;
        } else {
            $external++;
        }
    }
    $seo_data['internal_links_count'] = $internal;
    $seo_data['external_links_count'] = $external;

    // Count images and alt text
    preg_match_all('/<img\s[^>]*>/i', $content, $img_matches);
    $images_total = count($img_matches[0] ?? []);
    $images_with_alt = 0;
    foreach (($img_matches[0] ?? []) as $img_tag) {
        if (preg_match('/alt=["\'][^"\']+["\']/', $img_tag)) {
            $images_with_alt++;
        }
    }
    $seo_data['images_count']     = $images_total;
    $seo_data['images_alt_count'] = $images_with_alt;

    return new WP_REST_Response([
        'success' => true,
        'meta'    => $seo_data,
    ], 200);
}

/**
 * POST /posts/{id}/meta - Update Rank Math SEO data for a post
 */
function seo_os_update_post_meta(WP_REST_Request $request): WP_REST_Response {
    $post_id = (int) $request->get_param('id');
    $post = get_post($post_id);

    if (!$post) {
        return new WP_REST_Response(['error' => 'Post not found'], 404);
    }

    $body = $request->get_json_params();
    if (empty($body)) {
        return new WP_REST_Response(['error' => 'No data provided'], 400);
    }

    $allowed_fields = seo_os_get_rank_math_fields();
    $updated = [];
    $errors = [];

    foreach ($body as $key => $value) {
        // Allow both with and without 'rank_math_' prefix
        $meta_key = $key;
        if (strpos($key, 'rank_math_') !== 0) {
            $meta_key = 'rank_math_' . $key;
        }

        if (!isset($allowed_fields[$meta_key])) {
            $errors[] = "Unknown field: {$key}";
            continue;
        }

        $field_config = $allowed_fields[$meta_key];

        // Type validation
        if ($field_config['type'] === 'integer' && !is_numeric($value)) {
            $errors[] = "Field {$key} must be numeric";
            continue;
        }

        // Sanitize
        if ($field_config['type'] === 'string') {
            $value = sanitize_text_field($value);
        } elseif ($field_config['type'] === 'integer') {
            $value = intval($value);
        }

        update_post_meta($post_id, $meta_key, $value);
        $updated[$meta_key] = $value;
    }

    // Return updated data
    $seo_data = seo_os_extract_rank_math_data($post_id);

    return new WP_REST_Response([
        'success' => true,
        'updated' => $updated,
        'errors'  => $errors,
        'meta'    => $seo_data,
    ], 200);
}

/**
 * GET /posts/{id}/score - Get SEO score, attempt recalculation if Rank Math active
 */
function seo_os_get_post_score(WP_REST_Request $request): WP_REST_Response {
    $post_id = (int) $request->get_param('id');
    $post = get_post($post_id);

    if (!$post) {
        return new WP_REST_Response(['error' => 'Post not found'], 404);
    }

    $score_data = [
        'post_id' => $post_id,
        'seo_score' => null,
        'readability_score' => null,
        'content_ai_score' => null,
        'focus_keyword' => null,
        'source' => 'meta', // 'meta' or 'calculated'
    ];

    // Read stored scores from meta
    $score_data['seo_score'] = (int) get_post_meta($post_id, 'rank_math_seo_score', true) ?: null;
    $score_data['readability_score'] = (int) get_post_meta($post_id, 'rank_math_readability_score', true) ?: null;
    $score_data['content_ai_score'] = (int) get_post_meta($post_id, 'rank_math_contentai_score', true) ?: null;
    $score_data['focus_keyword'] = get_post_meta($post_id, 'rank_math_focus_keyword', true) ?: null;

    // Try to get score via Rank Math API if available
    if (seo_os_is_rank_math_active()) {
        // Try using Rank Math's internal scoring
        if (class_exists('\\RankMath\\Paper\\Paper')) {
            try {
                $paper = \RankMath\Paper\Paper::get();
                if ($paper) {
                    $score_data['source'] = 'rank_math_api';
                }
            } catch (\Exception $e) {
                // Rank Math API not available for this context
            }
        }

        // Try using the SEO analysis class
        if (class_exists('\\RankMath\\SEO_Analysis\\SEO_Analyzer')) {
            $score_data['analyzer_available'] = true;
        }
    }

    // Content analysis details
    $content = $post->post_content;
    $keyword = $score_data['focus_keyword'] ?? '';
    $title = get_post_meta($post_id, 'rank_math_title', true) ?: $post->post_title;
    $description = get_post_meta($post_id, 'rank_math_description', true) ?: '';

    $word_count = str_word_count(wp_strip_all_tags($content));
    $keyword_count = $keyword ? substr_count(strtolower(wp_strip_all_tags($content)), strtolower($keyword)) : 0;
    $keyword_density = $word_count > 0 ? round(($keyword_count / $word_count) * 100, 2) : 0;

    $score_data['analysis'] = [
        'title_length'     => mb_strlen($title),
        'description_length' => mb_strlen($description),
        'word_count'       => $word_count,
        'keyword_count'    => $keyword_count,
        'keyword_density'  => $keyword_density,
        'keyword_in_title' => $keyword ? (stripos($title, $keyword) !== false) : false,
        'keyword_in_description' => $keyword ? (stripos($description, $keyword) !== false) : false,
    ];

    return new WP_REST_Response([
        'success' => true,
        'score'   => $score_data,
    ], 200);
}

/**
 * GET /posts/{id}/head - Get rendered SEO <head> tags
 */
function seo_os_get_post_head(WP_REST_Request $request): WP_REST_Response {
    $post_id = (int) $request->get_param('id');
    $post = get_post($post_id);

    if (!$post) {
        return new WP_REST_Response(['error' => 'Post not found'], 404);
    }

    $head_data = [
        'post_id' => $post_id,
        'title'   => '',
        'meta'    => [],
        'og'      => [],
        'twitter'  => [],
        'schema'  => null,
    ];

    // Build title
    $seo_title = get_post_meta($post_id, 'rank_math_title', true);
    $head_data['title'] = $seo_title ?: $post->post_title;

    // Meta description
    $description = get_post_meta($post_id, 'rank_math_description', true);
    if ($description) {
        $head_data['meta']['description'] = $description;
    }

    // Robots
    $robots = get_post_meta($post_id, 'rank_math_robots', true);
    if ($robots) {
        $head_data['meta']['robots'] = is_array($robots) ? implode(', ', $robots) : $robots;
    }

    // Canonical
    $canonical = get_post_meta($post_id, 'rank_math_canonical_url', true);
    $head_data['meta']['canonical'] = $canonical ?: get_permalink($post_id);

    // Open Graph
    $og_title = get_post_meta($post_id, 'rank_math_facebook_title', true);
    $og_desc = get_post_meta($post_id, 'rank_math_facebook_description', true);
    $og_image = get_post_meta($post_id, 'rank_math_facebook_image', true);
    $head_data['og'] = [
        'title'       => $og_title ?: $head_data['title'],
        'description' => $og_desc ?: ($description ?: ''),
        'image'       => $og_image ?: get_the_post_thumbnail_url($post_id, 'full'),
        'url'         => get_permalink($post_id),
        'type'        => 'article',
        'site_name'   => get_bloginfo('name'),
    ];

    // Twitter Card
    $tw_title = get_post_meta($post_id, 'rank_math_twitter_title', true);
    $tw_desc = get_post_meta($post_id, 'rank_math_twitter_description', true);
    $tw_image = get_post_meta($post_id, 'rank_math_twitter_image', true);
    $tw_card = get_post_meta($post_id, 'rank_math_twitter_card_type', true);
    $head_data['twitter'] = [
        'card'        => $tw_card ?: 'summary_large_image',
        'title'       => $tw_title ?: $head_data['og']['title'],
        'description' => $tw_desc ?: $head_data['og']['description'],
        'image'       => $tw_image ?: $head_data['og']['image'],
    ];

    // Schema
    $schemas = get_post_meta($post_id, 'rank_math_schemas', true);
    if ($schemas) {
        $head_data['schema'] = is_string($schemas) ? json_decode($schemas, true) : $schemas;
    }

    return new WP_REST_Response([
        'success' => true,
        'head'    => $head_data,
    ], 200);
}

/**
 * Extract all Rank Math data from post meta
 */
function seo_os_extract_rank_math_data(int $post_id): array {
    $fields = seo_os_get_rank_math_fields();
    $data = [];

    foreach ($fields as $meta_key => $config) {
        $value = get_post_meta($post_id, $meta_key, true);

        // Clean key: remove 'rank_math_' prefix for cleaner API
        $clean_key = str_replace('rank_math_', '', $meta_key);

        if ($config['type'] === 'integer') {
            $data[$clean_key] = $value ? intval($value) : null;
        } else {
            $data[$clean_key] = $value ?: null;
        }
    }

    // Special handling: robots may be stored as array
    if (isset($data['robots']) && is_array($data['robots'])) {
        $data['robots'] = implode(',', $data['robots']);
    }

    // Parse additional keywords into array
    if (!empty($data['focus_keywords'])) {
        $data['additional_keywords'] = array_map('trim', explode(',', $data['focus_keywords']));
    } else {
        $data['additional_keywords'] = [];
    }

    return $data;
}

/**
 * Check if Rank Math is active
 */
function seo_os_is_rank_math_active(): bool {
    return defined('RANK_MATH_VERSION') || class_exists('\\RankMath\\RankMath');
}

/**
 * Also register all Rank Math fields in standard WP REST API
 * This makes them available via /wp-json/wp/v2/posts too
 */
add_action('init', function () {
    $fields = seo_os_get_rank_math_fields();

    foreach ($fields as $meta_key => $config) {
        register_post_meta('post', $meta_key, [
            'type'          => $config['type'],
            'single'        => true,
            'show_in_rest'  => true,
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
        ]);
    }
});

/**
 * Add settings page under Tools menu
 */
add_action('admin_menu', function () {
    add_management_page(
        'SEO OS Connector',
        'SEO OS Connector',
        'manage_options',
        'seo-os-connector',
        'seo_os_settings_page'
    );
});

/**
 * Settings page
 */
function seo_os_settings_page(): void {
    $site_url = get_site_url();
    $api_base = rest_url(SEO_OS_CONNECTOR_NAMESPACE);
    $rank_math_active = seo_os_is_rank_math_active();
    $rm_version = $rank_math_active && defined('RANK_MATH_VERSION') ? RANK_MATH_VERSION : 'N/A';
    $fields = seo_os_get_rank_math_fields();
    ?>
    <div class="wrap">
        <h1>SEO OS Connector</h1>

        <div class="card" style="max-width: 800px; padding: 20px;">
            <h2>Connection Status</h2>
            <table class="form-table">
                <tr>
                    <th>Plugin Version</th>
                    <td><code><?php echo SEO_OS_CONNECTOR_VERSION; ?></code></td>
                </tr>
                <tr>
                    <th>API Base URL</th>
                    <td><code><?php echo esc_html($api_base); ?></code></td>
                </tr>
                <tr>
                    <th>Rank Math</th>
                    <td>
                        <?php if ($rank_math_active): ?>
                            <span style="color: green; font-weight: bold;">Active</span>
                            (v<?php echo esc_html($rm_version); ?>)
                        <?php else: ?>
                            <span style="color: red; font-weight: bold;">Not Active</span>
                            <p class="description">Install and activate Rank Math SEO for full functionality.</p>
                        <?php endif; ?>
                    </td>
                </tr>
                <tr>
                    <th>Registered Fields</th>
                    <td><?php echo count($fields); ?> Rank Math meta fields</td>
                </tr>
            </table>
        </div>

        <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
            <h2>API Endpoints</h2>
            <table class="widefat striped">
                <thead>
                    <tr>
                        <th>Method</th>
                        <th>Endpoint</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>GET</code></td>
                        <td><code>/seo-os/v1/ping</code></td>
                        <td>Health check</td>
                    </tr>
                    <tr>
                        <td><code>GET</code></td>
                        <td><code>/seo-os/v1/info</code></td>
                        <td>Plugin & site info</td>
                    </tr>
                    <tr>
                        <td><code>GET</code></td>
                        <td><code>/seo-os/v1/posts</code></td>
                        <td>List posts with SEO data</td>
                    </tr>
                    <tr>
                        <td><code>GET</code></td>
                        <td><code>/seo-os/v1/posts/{id}/meta</code></td>
                        <td>Get all Rank Math fields</td>
                    </tr>
                    <tr>
                        <td><code>POST</code></td>
                        <td><code>/seo-os/v1/posts/{id}/meta</code></td>
                        <td>Update Rank Math fields</td>
                    </tr>
                    <tr>
                        <td><code>GET</code></td>
                        <td><code>/seo-os/v1/posts/{id}/score</code></td>
                        <td>Get SEO score + analysis</td>
                    </tr>
                    <tr>
                        <td><code>GET</code></td>
                        <td><code>/seo-os/v1/posts/{id}/head</code></td>
                        <td>Get rendered SEO head tags</td>
                    </tr>
                </tbody>
            </table>
            <p class="description" style="margin-top: 10px;">
                Authentication: Use WordPress Application Passwords.
                All endpoints require <code>edit_posts</code> capability.
            </p>
        </div>

        <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
            <h2>Quick Test</h2>
            <p>Test the connection from your browser (you must be logged in):</p>
            <p>
                <a href="<?php echo esc_url($api_base . '/ping'); ?>" target="_blank" class="button">
                    Test Ping
                </a>
                <a href="<?php echo esc_url($api_base . '/info'); ?>" target="_blank" class="button">
                    View Info
                </a>
                <a href="<?php echo esc_url($api_base . '/posts?per_page=5'); ?>" target="_blank" class="button">
                    List Posts (5)
                </a>
            </p>
        </div>

        <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
            <h2>SEO OS Configuration</h2>
            <p>Add this site to SEO OS with the following settings:</p>
            <table class="form-table">
                <tr>
                    <th>Site URL</th>
                    <td><code><?php echo esc_html(str_replace(['https://', 'http://'], '', $site_url)); ?></code></td>
                </tr>
                <tr>
                    <th>API URL</th>
                    <td><code><?php echo esc_html($api_base); ?></code></td>
                </tr>
                <tr>
                    <th>Auth</th>
                    <td>WordPress Application Password (Users &rarr; Profile &rarr; Application Passwords)</td>
                </tr>
            </table>
        </div>
    </div>
    <?php
}

/**
 * Show notice if Rank Math is not active
 */
add_action('admin_notices', function () {
    if (!seo_os_is_rank_math_active()) {
        $screen = get_current_screen();
        if ($screen && $screen->id === 'tools_page_seo-os-connector') {
            echo '<div class="notice notice-warning"><p>';
            echo '<strong>SEO OS Connector:</strong> Rank Math SEO is not active. ';
            echo 'The connector will still work with basic post meta, but SEO scores and analysis features require Rank Math.';
            echo '</p></div>';
        }
    }
});
