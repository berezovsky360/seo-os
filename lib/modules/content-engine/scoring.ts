// Content Scoring Engine — Gemini Flash rates SEO + viral appeal

import type { ScoreResult } from './types'

export async function scoreItem(
  title: string,
  content: string,
  apiKey: string
): Promise<ScoreResult> {
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })

  const truncatedContent = content?.slice(0, 3000) || ''

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-05-20',
    contents: `You are an expert content analyst. Score this content on two dimensions.

## Content to Analyze
Title: ${title}
Content: ${truncatedContent}

## Scoring Criteria

### SEO Score (0-100)
- Search intent match: Does this topic address a clear search query?
- Keyword potential: Can strong keywords be extracted?
- Informational value: Does it answer questions people search for?
- Evergreen vs trending: Balance of lasting relevance + current interest
- Featured snippet potential: Could content be structured for position 0?

### Viral Score (0-100)
- Emotional engagement: Does it trigger curiosity, surprise, concern?
- Shareability: Would people share this on social media?
- Uniqueness: Is this a novel angle or breaking news?
- Controversy/debate potential: Does it spark discussion?
- Timeliness: Is this relevant right now?

## Response Format (JSON only, no markdown)
{"seo_score": <number>, "viral_score": <number>, "reasoning": "<1-2 sentences explaining the scores>"}`,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    },
  })

  const text = response.text || '{}'
  const parsed = JSON.parse(text)

  const seo = Math.max(0, Math.min(100, parsed.seo_score || 0))
  const viral = Math.max(0, Math.min(100, parsed.viral_score || 0))

  return {
    seo_score: seo,
    viral_score: viral,
    combined_score: Math.round(seo * 0.6 + viral * 0.4),
    reasoning: parsed.reasoning || '',
  }
}
