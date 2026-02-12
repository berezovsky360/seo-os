// Content Engine types

export interface FeedItem {
  guid: string
  title: string
  link: string | null
  content: string | null
  pubDate: string | null
  imageUrl: string | null
}

export interface ContentFeed {
  id: string
  user_id: string
  site_id: string | null
  name: string
  feed_url: string
  feed_type: string
  enabled: boolean
  poll_interval_minutes: number
  last_polled_at: string | null
  last_item_count: number
  created_at: string
}

export interface ContentItem {
  id: string
  user_id: string
  feed_id: string
  guid: string
  title: string
  url: string | null
  content: string | null
  published_at: string | null
  seo_score: number | null
  viral_score: number | null
  combined_score: number | null
  score_reasoning: string | null
  extracted_facts: ExtractedFact[]
  extracted_keywords: string[]
  fact_check_results: FactCheckResults | null
  cluster_id: string | null
  image_url: string | null
  status: ContentItemStatus
  created_at: string
}

export type ContentItemStatus = 'ingested' | 'scored' | 'extracted' | 'clustered' | 'used' | 'skipped'

export interface ExtractedFact {
  fact: string
  confidence: number
  source_quote: string
}

export interface FactCheckResults {
  verified: VerifiedFact[]
  unverified: UnverifiedFact[]
  checked_at: string
}

export interface VerifiedFact {
  fact: string
  serp_evidence: string
  confidence: number
}

export interface UnverifiedFact {
  fact: string
  reason: string
}

export interface ContentCluster {
  id: string
  user_id: string
  site_id: string | null
  label: string
  summary: string | null
  item_count: number
  avg_score: number | null
  status: 'open' | 'generating' | 'published'
  created_at: string
}

export type ContentPreset = 'full-article' | 'news-post'

export type PipelineStatus = 'pending' | 'generating' | 'assembling' | 'publishing' | 'completed' | 'failed'

export interface PipelineRun {
  id: string
  user_id: string
  site_id: string | null
  preset: ContentPreset
  source_item_ids: string[]
  cluster_id: string | null
  status: PipelineStatus
  sections: PipelineSections
  assembled_html: string | null
  generated_article_id: string | null
  wp_post_id: number | null
  title: string | null
  focus_keyword: string | null
  seo_title: string | null
  seo_description: string | null
  word_count: number | null
  error: string | null
  scheduled_publish_at: string | null
  started_at: string
  completed_at: string | null
}

export interface PipelineSections {
  zero_click?: string
  intro?: string
  body?: string[]
  glossary?: { term: string; definition: string }[]
  faq?: { question: string; answer: string }[]
  conclusion?: string
}

export type SectionType = 'zero_click' | 'intro' | 'body' | 'glossary' | 'faq' | 'conclusion'

export interface ScoreResult {
  seo_score: number
  viral_score: number
  combined_score: number
  reasoning: string
}

export interface ExtractionResult {
  facts: ExtractedFact[]
  keywords: string[]
}

export interface GeneratedSection {
  html: string
  word_count: number
}

export interface AssembledArticle {
  html: string
  title: string
  seo_title: string
  seo_description: string
  focus_keyword: string
  word_count: number
}
