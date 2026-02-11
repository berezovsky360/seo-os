// Fact & Keyword Extractor — Gemini Flash extracts structured data from content

import type { ExtractionResult } from './types'

export async function extractFacts(
  title: string,
  content: string,
  apiKey: string
): Promise<ExtractionResult> {
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })

  const truncatedContent = content?.slice(0, 4000) || ''

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `You are a fact extraction specialist. Extract key facts and SEO keywords from this content.

## Content
Title: ${title}
Body: ${truncatedContent}

## Instructions
1. Extract 3-8 key factual claims (statistics, events, names, dates, specific data points)
2. For each fact, rate your confidence (0-1) that it's accurately stated
3. Include the source quote from the text
4. Extract 5-15 SEO-relevant keywords/phrases

## Response Format (JSON only, no markdown)
{
  "facts": [
    {"fact": "<factual claim>", "confidence": <0-1>, "source_quote": "<relevant quote from text>"}
  ],
  "keywords": ["keyword1", "keyword2"]
}`,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  })

  const text = response.text || '{}'
  const parsed = JSON.parse(text)

  return {
    facts: Array.isArray(parsed.facts) ? parsed.facts : [],
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
  }
}
