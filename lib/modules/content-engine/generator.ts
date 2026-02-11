// Content Generator — Modular section generation + assembly using Gemini Pro

import type {
  SectionType,
  ContentPreset,
  ExtractedFact,
  GeneratedSection,
  AssembledArticle,
  PipelineSections,
} from './types'

interface SourceData {
  facts: ExtractedFact[]
  keywords: string[]
  topic: string
  preset: ContentPreset
}

// Generate a single content section
export async function generateSection(
  type: SectionType,
  sourceData: SourceData,
  apiKey: string,
  personaContext?: string
): Promise<GeneratedSection> {
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })

  const isFullArticle = sourceData.preset === 'full-article'
  const factsStr = sourceData.facts
    .map((f) => `- ${f.fact} (confidence: ${f.confidence})`)
    .join('\n')
  const keywordsStr = sourceData.keywords.join(', ')

  const sectionPrompts: Record<SectionType, string> = {
    zero_click: `Write a Featured Snippet / Zero-Click optimized answer (40-60 words) for the topic "${sourceData.topic}".
Requirements:
- Direct, concise answer that Google can show in position 0
- Use the focus keywords naturally: ${keywordsStr}
- Format as a short paragraph or bullet list
- Based on these verified facts:\n${factsStr}

Return HTML only (no markdown, no code fences).`,

    intro: `Write an engaging introduction (${isFullArticle ? '150-250' : '80-120'} words) for an article about "${sourceData.topic}".
Requirements:
- Hook the reader in the first sentence
- Establish relevance and urgency
- Preview what the article covers
- Naturally include keywords: ${keywordsStr}
- Based on facts:\n${factsStr}

Return HTML only (use <p> tags).`,

    body: `Write the main body content (${isFullArticle ? '1200-1800' : '300-500'} words) about "${sourceData.topic}".
Requirements:
- ${isFullArticle ? '3-5' : '1-2'} clearly defined sections with H2/H3 headings
- Use verified facts throughout:\n${factsStr}
- Naturally integrate keywords: ${keywordsStr}
- Include specific examples, data points, and actionable insights
- Use HTML lists (<ul>/<ol>) where appropriate
- Write for web readability: short paragraphs, scannable structure

Return HTML only (use <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em> tags).`,

    glossary: `Create a glossary of ${isFullArticle ? '5-8' : '3-4'} key terms related to "${sourceData.topic}".
Use these keywords as starting points: ${keywordsStr}

Requirements:
- Clear, concise definitions (1-2 sentences each)
- Terms that help readers understand the topic
- SEO-friendly: include related keywords naturally

Return JSON only: [{"term": "<term>", "definition": "<definition>"}]`,

    faq: `Generate ${isFullArticle ? '5-7' : '3-4'} FAQ questions and answers about "${sourceData.topic}".
Requirements:
- Questions people actually search for (use keyword research mindset)
- Clear, helpful answers (2-4 sentences each)
- Include keywords naturally: ${keywordsStr}
- Base answers on verified facts:\n${factsStr}

Return JSON only: [{"question": "<question>", "answer": "<answer>"}]`,

    conclusion: `Write a conclusion (${isFullArticle ? '100-150' : '60-80'} words) for an article about "${sourceData.topic}".
Requirements:
- Summarize key takeaways
- Include a call-to-action or forward-looking statement
- Naturally include keywords: ${keywordsStr}

Return HTML only (use <p> tags).`,
  }

  const systemInstruction = personaContext
    ? `You are a professional SEO content writer. ${personaContext}\n\nWrite in the specified voice and style.`
    : 'You are a professional SEO content writer. Write clear, engaging, and well-structured content optimized for both readers and search engines.'

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-05-20',
    contents: sectionPrompts[type],
    config: {
      systemInstruction,
      temperature: type === 'glossary' || type === 'faq' ? 0.3 : 0.7,
      responseMimeType: type === 'glossary' || type === 'faq' ? 'application/json' : 'text/plain',
    },
  })

  const text = response.text || ''

  // For glossary/faq, convert JSON to HTML
  let html: string
  if (type === 'glossary') {
    const terms = JSON.parse(text) as { term: string; definition: string }[]
    html = '<div class="glossary"><h2>Glossary</h2><dl>' +
      terms.map((t) => `<dt><strong>${t.term}</strong></dt><dd>${t.definition}</dd>`).join('') +
      '</dl></div>'
  } else if (type === 'faq') {
    const faqs = JSON.parse(text) as { question: string; answer: string }[]
    html = '<div class="faq" itemscope itemtype="https://schema.org/FAQPage"><h2>Frequently Asked Questions</h2>' +
      faqs.map((f) =>
        `<div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">` +
        `<h3 itemprop="name">${f.question}</h3>` +
        `<div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">` +
        `<p itemprop="text">${f.answer}</p></div></div>`
      ).join('') +
      '</div>'
  } else {
    html = text
  }

  const wordCount = html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length

  return { html, word_count: wordCount }
}

// Generate all sections for a preset
export async function generateAllSections(
  sourceData: SourceData,
  apiKey: string,
  personaContext?: string
): Promise<{ sections: PipelineSections; total_words: number }> {
  const isFullArticle = sourceData.preset === 'full-article'

  const sectionTypes: SectionType[] = isFullArticle
    ? ['zero_click', 'intro', 'body', 'glossary', 'faq', 'conclusion']
    : ['zero_click', 'intro', 'body', 'conclusion']

  const sections: PipelineSections = {}
  let totalWords = 0

  for (const type of sectionTypes) {
    const result = await generateSection(type, sourceData, apiKey, personaContext)
    totalWords += result.word_count

    if (type === 'body') {
      sections.body = [result.html]
    } else if (type === 'glossary') {
      try {
        const glossaryText = result.html
        // Extract terms from the generated HTML for structured data
        sections.glossary = []
        const dtMatches = glossaryText.match(/<dt><strong>(.*?)<\/strong><\/dt><dd>(.*?)<\/dd>/g)
        if (dtMatches) {
          for (const match of dtMatches) {
            const termMatch = match.match(/<dt><strong>(.*?)<\/strong><\/dt><dd>(.*?)<\/dd>/)
            if (termMatch) {
              sections.glossary.push({ term: termMatch[1], definition: termMatch[2] })
            }
          }
        }
      } catch {
        sections.glossary = []
      }
    } else if (type === 'faq') {
      try {
        sections.faq = []
        const qMatches = result.html.match(/<h3 itemprop="name">([\s\S]*?)<\/h3>[\s\S]*?<p itemprop="text">([\s\S]*?)<\/p>/g)
        if (qMatches) {
          for (const match of qMatches) {
            const qMatch = match.match(/<h3 itemprop="name">([\s\S]*?)<\/h3>[\s\S]*?<p itemprop="text">([\s\S]*?)<\/p>/)
            if (qMatch) {
              sections.faq.push({ question: qMatch[1], answer: qMatch[2] })
            }
          }
        }
      } catch {
        sections.faq = []
      }
    } else {
      (sections as any)[type] = result.html
    }
  }

  return { sections, total_words: totalWords }
}

// Assemble sections into final HTML article
export async function assembleArticle(
  sections: PipelineSections,
  topic: string,
  keywords: string[],
  apiKey: string
): Promise<AssembledArticle> {
  // Build the full HTML
  const parts: string[] = []

  if (sections.zero_click) {
    parts.push(`<div class="featured-snippet">${sections.zero_click}</div>`)
  }
  if (sections.intro) {
    parts.push(sections.intro)
  }
  if (sections.body?.length) {
    parts.push(sections.body.join('\n'))
  }
  if (sections.glossary?.length) {
    parts.push(
      '<div class="glossary"><h2>Glossary</h2><dl>' +
      sections.glossary.map((t) => `<dt><strong>${t.term}</strong></dt><dd>${t.definition}</dd>`).join('') +
      '</dl></div>'
    )
  }
  if (sections.faq?.length) {
    parts.push(
      '<div class="faq" itemscope itemtype="https://schema.org/FAQPage"><h2>Frequently Asked Questions</h2>' +
      sections.faq.map((f) =>
        `<div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">` +
        `<h3 itemprop="name">${f.question}</h3>` +
        `<div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">` +
        `<p itemprop="text">${f.answer}</p></div></div>`
      ).join('') +
      '</div>'
    )
  }
  if (sections.conclusion) {
    parts.push(sections.conclusion)
  }

  const html = parts.join('\n\n')
  const wordCount = html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length

  // Generate SEO metadata using Gemini
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })

  const metaResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-05-20',
    contents: `Generate SEO metadata for an article about "${topic}" with keywords: ${keywords.join(', ')}

The article is ${wordCount} words long.

Return JSON only:
{
  "title": "<article title, 50-60 chars, include primary keyword>",
  "seo_title": "<SEO title tag, 50-60 chars, keyword-optimized>",
  "seo_description": "<meta description, 150-160 chars, compelling + keyword-rich>",
  "focus_keyword": "<primary focus keyword>"
}`,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    },
  })

  const meta = JSON.parse(metaResponse.text || '{}')

  return {
    html,
    title: meta.title || topic,
    seo_title: meta.seo_title || meta.title || topic,
    seo_description: meta.seo_description || '',
    focus_keyword: meta.focus_keyword || keywords[0] || '',
    word_count: wordCount,
  }
}
