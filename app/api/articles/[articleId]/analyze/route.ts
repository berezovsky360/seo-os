import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/articles/[articleId]/analyze
 * Perform preliminary SEO analysis on article before publishing
 * Returns SEO score (0-100) with detailed breakdown
 *
 * Supports two modes:
 * 1. Pass article data in request body (works for both WP posts and local articles)
 * 2. Fallback: fetch from generated_articles table by ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params
    let article: any = null

    // Try to get article data from request body first (works for any source)
    try {
      const body = await request.json()
      if (body && (body.title || body.content)) {
        article = body
      }
    } catch {
      // No body or invalid JSON - will try DB lookup
    }

    // If no body data, try both tables
    if (!article) {
      // Try generated_articles first
      const { data: genArticle } = await supabase
        .from('generated_articles')
        .select('*')
        .eq('id', articleId)
        .single()

      if (genArticle) {
        article = genArticle
      } else {
        // Try posts table (WP synced posts)
        const { data: wpPost } = await supabase
          .from('posts')
          .select('*')
          .eq('id', articleId)
          .single()

        if (wpPost) {
          // Map WP post fields to analysis-compatible format
          article = {
            ...wpPost,
            keyword: wpPost.focus_keyword,
          }
        }
      }
    }

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Perform SEO analysis
    const analysis = performSEOAnalysis(article)

    console.log(`Analysis complete. Score: ${analysis.score}/100`)

    return NextResponse.json({
      success: true,
      analysis,
    })
  } catch (error) {
    console.error('Error analyzing article:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * SEO Analysis Logic
 * Calculates preliminary SEO score based on content quality factors
 */
function performSEOAnalysis(article: any) {
  const checks = {
    titleLength: 0,
    descriptionLength: 0,
    focusKeywordInTitle: 0,
    focusKeywordInDescription: 0,
    focusKeywordInContent: 0,
    wordCount: 0,
    imagesWithAlt: 0,
    internalLinks: 0,
    externalLinks: 0,
    readability: 0,
  }

  const issues: string[] = []
  const suggestions: string[] = []

  // 1. Title length check (50-60 chars = perfect, up to 70 acceptable)
  const titleLength = article.seo_title?.length || article.title?.length || 0
  if (titleLength >= 50 && titleLength <= 60) {
    checks.titleLength = 10
  } else if (titleLength > 0 && titleLength <= 70) {
    checks.titleLength = 7
    if (titleLength < 50) {
      suggestions.push(`Title is ${titleLength} chars. Aim for 50-60 characters.`)
    } else {
      suggestions.push(`Title is ${titleLength} chars. Consider shortening to 50-60.`)
    }
  } else if (titleLength > 70) {
    checks.titleLength = 3
    issues.push(`Title too long: ${titleLength} chars. Google may truncate at 60.`)
  } else {
    issues.push('Missing SEO title')
  }

  // 2. Meta description length (150-160 chars = perfect, up to 170 acceptable)
  const descLength = article.seo_description?.length || 0
  if (descLength >= 150 && descLength <= 160) {
    checks.descriptionLength = 10
  } else if (descLength > 0 && descLength <= 170) {
    checks.descriptionLength = 7
    if (descLength < 150) {
      suggestions.push(`Description is ${descLength} chars. Aim for 150-160 characters.`)
    } else {
      suggestions.push(`Description is ${descLength} chars. Consider shortening to 150-160.`)
    }
  } else if (descLength > 170) {
    checks.descriptionLength = 3
    issues.push(`Description too long: ${descLength} chars. Google may truncate at 160.`)
  } else {
    issues.push('Missing meta description')
  }

  // 3. Focus keyword presence checks
  const keyword = (article.keyword?.toLowerCase() || article.focus_keyword?.toLowerCase() || '').trim()

  if (keyword) {
    const title = (article.seo_title || article.title || '').toLowerCase()
    const description = (article.seo_description || '').toLowerCase()
    const content = (article.content || '').toLowerCase()

    // Keyword in title
    if (title.includes(keyword)) {
      checks.focusKeywordInTitle = 15
    } else {
      issues.push(`Focus keyword "${keyword}" not found in title`)
    }

    // Keyword in description
    if (description.includes(keyword)) {
      checks.focusKeywordInDescription = 10
    } else {
      issues.push(`Focus keyword "${keyword}" not found in meta description`)
    }

    // Keyword density in content (0.5% - 2.5% is optimal)
    const words = content.split(/\s+/)
    const wordCount = words.length
    const keywordRegex = new RegExp(keyword, 'gi')
    const keywordMatches = content.match(keywordRegex) || []
    const keywordCount = keywordMatches.length
    const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0

    if (density >= 0.5 && density <= 2.5) {
      checks.focusKeywordInContent = 15
    } else if (density > 0) {
      checks.focusKeywordInContent = 10
      if (density < 0.5) {
        suggestions.push(`Keyword density is ${density.toFixed(2)}%. Add "${keyword}" more naturally (aim for 0.5-2.5%).`)
      } else {
        suggestions.push(`Keyword density is ${density.toFixed(2)}%. Reduce keyword stuffing (aim for 0.5-2.5%).`)
      }
    } else {
      issues.push(`Focus keyword "${keyword}" not found in content`)
    }
  } else {
    issues.push('No focus keyword specified')
  }

  // 4. Word count (≥1000 words is good for SEO, 500-1000 acceptable, <500 poor)
  const wordCount = article.word_count || (article.content?.split(/\s+/).length || 0)
  if (wordCount >= 1000) {
    checks.wordCount = 15
  } else if (wordCount >= 500) {
    checks.wordCount = 10
    suggestions.push(`Content is ${wordCount} words. Aim for 1000+ for better ranking.`)
  } else if (wordCount > 0) {
    checks.wordCount = 5
    issues.push(`Content too short: ${wordCount} words. Minimum 500, ideal 1000+.`)
  } else {
    issues.push('No content found')
  }

  // 5. Images with alt text
  if (article.images_count && article.images_alt_count) {
    const altPercentage = (article.images_alt_count / article.images_count) * 100
    if (altPercentage === 100) {
      checks.imagesWithAlt = 10
    } else if (altPercentage >= 80) {
      checks.imagesWithAlt = 7
      suggestions.push(`${article.images_count - article.images_alt_count} images missing alt text`)
    } else {
      checks.imagesWithAlt = 3
      issues.push(`Only ${article.images_alt_count}/${article.images_count} images have alt text`)
    }
  } else if (article.images_count > 0) {
    checks.imagesWithAlt = 0
    issues.push(`${article.images_count} images found but no alt text provided`)
  }

  // 6. Internal links (3-5 is optimal)
  const internalLinksCount = article.internal_links_count || 0
  if (internalLinksCount >= 3 && internalLinksCount <= 5) {
    checks.internalLinks = 5
  } else if (internalLinksCount >= 1) {
    checks.internalLinks = 3
    if (internalLinksCount < 3) {
      suggestions.push(`Add more internal links (${internalLinksCount} found, aim for 3-5)`)
    } else {
      suggestions.push(`Too many internal links (${internalLinksCount}). Keep it to 3-5 for best results.`)
    }
  } else {
    issues.push('No internal links found')
  }

  // 7. External links (1-3 is optimal)
  const externalLinksCount = article.external_links_count || 0
  if (externalLinksCount >= 1 && externalLinksCount <= 3) {
    checks.externalLinks = 5
  } else if (externalLinksCount === 0) {
    suggestions.push('Consider adding 1-2 authoritative external links')
  } else {
    checks.externalLinks = 3
    suggestions.push(`Too many external links (${externalLinksCount}). Keep it to 1-3.`)
  }

  // 8. Readability score
  if (article.readability_score) {
    if (article.readability_score >= 60) {
      checks.readability = 10
    } else if (article.readability_score >= 40) {
      checks.readability = 7
      suggestions.push('Content readability could be improved (use shorter sentences and simpler words)')
    } else {
      checks.readability = 3
      issues.push('Content is difficult to read. Simplify language and sentence structure.')
    }
  }

  // Calculate total score
  const score = Math.min(
    Object.values(checks).reduce((sum, val) => sum + val, 0),
    100
  )

  // Calculate keyword density for analysis details
  const content = article.content || ''
  const words = content.split(/\s+/)
  const keywordCount = keyword
    ? (content.toLowerCase().match(new RegExp(keyword, 'gi')) || []).length
    : 0
  const keywordDensity = words.length > 0 ? (keywordCount / words.length * 100).toFixed(2) : '0.00'

  return {
    score,
    checks,
    issues,
    suggestions,
    analysis: {
      titleLength,
      descriptionLength: descLength,
      wordCount,
      keywordDensity,
      keyword,
      imagesTotal: article.images_count || 0,
      imagesWithAlt: article.images_alt_count || 0,
      internalLinks: internalLinksCount,
      externalLinks: externalLinksCount,
      readabilityScore: article.readability_score || null,
    },
  }
}
