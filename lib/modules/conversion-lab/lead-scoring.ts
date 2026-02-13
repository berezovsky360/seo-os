// Lead Scoring — Behavior-based automatic scoring.

export const SCORING_RULES = {
  form_submit: 20,
  download: 15,
  return_visit: 10,
  pricing_page_view: 25,
  long_session: 10,  // 3+ minute session
  email_opened: 5,
  hot_threshold: 50,
}

export interface InteractionRow {
  event_type: string
  event_data: Record<string, any> | null
  duration_seconds: number | null
}

export interface LeadMetrics {
  total_downloads?: number
  total_page_views?: number
}

/**
 * Calculate lead score based on interactions and metrics.
 * Higher scores indicate more engaged leads.
 */
export function calculateLeadScore(
  interactions: InteractionRow[],
  metrics?: LeadMetrics | null,
): number {
  let score = 0

  for (const i of interactions) {
    switch (i.event_type) {
      case 'form_submit':
        score += SCORING_RULES.form_submit
        break
      case 'download':
        score += SCORING_RULES.download
        break
      case 'page_view':
        if (i.event_data?.page_path?.includes('pricing')) {
          score += SCORING_RULES.pricing_page_view
        }
        break
      case 'leave':
        if (i.duration_seconds && i.duration_seconds >= 180) {
          score += SCORING_RULES.long_session
        }
        break
      case 'email_opened':
        score += SCORING_RULES.email_opened
        break
    }
  }

  // Bonus for return visits (multiple page views)
  const pageViews = metrics?.total_page_views || 0
  if (pageViews >= 2) {
    score += SCORING_RULES.return_visit
  }

  // Bonus for downloads
  const downloads = metrics?.total_downloads || 0
  if (downloads > 0) {
    score += SCORING_RULES.download * Math.min(downloads, 3) // Cap at 3
  }

  return Math.min(score, 100) // Cap at 100
}
