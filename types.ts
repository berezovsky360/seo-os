export enum SiteStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface MetricTrend {
  date: string;
  value: number;
}

export interface Site {
  id: string;
  name: string;
  url: string;
  favicon: string;
  status: SiteStatus;
  theme: string; // New property for 3D cover color
  wp_username?: string | null;
  wp_app_password?: string | null;
  is_competitor?: boolean;
  metrics: {
    speedScore: number;
    notFoundCount: number;
    indexedPages: number;
    trafficTrend: MetricTrend[];
    organicKeywords: number;
    rankDistribution: {
        top1: number;
        top3: number;
        top5: number;
        top10: number;
        top20: number;
        top100: number;
    };
    deviceTraffic: {
        desktop: number;
        mobile: number;
    };
  };
  contentQueue: {
    live: number;
    queued: number;
    articles: number;  // Published articles count
    drafts: number;    // Draft articles count
  };
}

export interface Keyword {
  id: string;
  term: string;
  intent: 'I' | 'T' | 'C' | 'N'; // Informational, Transactional, Commercial, Navigational
  volume: number;
  difficulty: number;
  cpc: number;
  updated: string;
  status?: {
      research: boolean;
  };
}

export interface AuthorPersona {
  id: string;
  name: string;
  avatarUrl: string;
  role: string;
  systemPrompt: string;
  writingStyle: WritingStyle;
  active: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type WritingStyle = 'formal' | 'casual' | 'technical' | 'creative' | 'balanced';

export interface PersonaDocument {
  id: string;
  persona_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  strategy: 'inline' | 'chunked';
  content_text: string | null;
  chunk_count: number;
  is_processed: boolean;
  processing_error: string | null;
  created_at: string;
}

export interface PersonaDB {
  id: string;
  user_id: string;
  name: string;
  role: string;
  avatar_url: string | null;
  system_prompt: string;
  writing_style: string;
  active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type ViewState =
    | 'dashboard'
    | 'site-details'
    | 'keywords'
    | 'authors'
    | 'calendar'
    | 'keywords-main'
    | 'keywords-db'
    | 'serp'
    | 'clusters'
    | 'ideas-cluster'
    | 'ideas-list'
    | 'article-overview'
    | 'llm-tracker'
    | 'brands'
    // Core Event Bus views
    | 'marketplace'
    | 'key-management'
    | 'event-log'
    | 'recipes'
    | 'settings'
    // Module views
    | 'rank-pulse'
    | 'gemini-architect'
    | 'rankmath-bridge'
    | 'gsc-insights'
    | 'bulk-metadata'
    | 'nana-banana'
    | 'docs'
    | 'cron-jobs'
    | 'content-engine'
    | 'content-lots'
    | 'telegraph'
    | 'competitor-analysis'
    | 'ai-writer';

export interface Article {
    id: string;
    mainKeyword: string;
    title: string;
    status: 'Planned' | 'In Progress' | 'Finished';
    publicationDate?: string;
    image?: string;
    type: 'How-To' | 'Pillar' | 'Listicle' | 'Leitfaden';
    funnel: 'TOFU' | 'MOFU' | 'BOFU';
    completed: boolean;
    slug?: string;
    metaDescription?: string;
}

export interface LLMResult {
    id: string;
    query: string;
    score: number;
    lastCheck: string;
    platforms: {
        chatgpt: 'positive' | 'negative' | 'neutral';
        claude: 'positive' | 'negative' | 'neutral';
        gemini: 'positive' | 'negative' | 'neutral';
        perplexity: 'positive' | 'negative' | 'neutral';
    };
}

export interface Post {
    id: string;
    site_id: string;
    wp_post_id: number | null;
    title: string;
    slug: string | null;
    url: string | null;
    status: 'draft' | 'publish' | 'pending' | 'private';
    content: string | null;
    // Rank Math SEO data
    seo_score: number | null;
    focus_keyword: string | null;
    seo_title: string | null;
    seo_description: string | null;
    is_indexable: boolean;
    schema_type: string | null;
    word_count: number | null;
    published_at: string | null;
    synced_at: string;
    created_at: string;
    // Extended Rank Math fields
    additional_keywords: string[] | null;
    canonical_url: string | null;
    robots_meta: string | null;
    og_title: string | null;
    og_description: string | null;
    og_image_url: string | null;
    twitter_title: string | null;
    twitter_description: string | null;
    twitter_image_url: string | null;
    twitter_card_type: string | null;
    readability_score: number | null;
    content_ai_score: number | null;
    internal_links_count: number | null;
    external_links_count: number | null;
    images_count: number | null;
    images_alt_count: number | null;
    primary_category_id: number | null;
    schema_article_type: string | null;
    schema_config: any | null;
    last_seo_analysis_at: string | null;
}