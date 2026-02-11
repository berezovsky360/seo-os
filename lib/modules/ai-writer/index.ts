/**
 * AI Writer Module — AI-powered SEO content generation via Gemini.
 *
 * Actions:
 * - generate_title: Generate 3 SEO title options for a post
 * - generate_description: Generate 3 meta description options for a post
 * - generate_content: Generate full article content from a topic
 *
 * Integrates with Personas module for voice/style consistency.
 */

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'
import { PersonasModule } from '@/lib/modules/personas'

export class AIWriterModule implements SEOModule {
  id = 'ai-writer' as const
  name = 'AI Writer'
  description = 'AI-powered SEO content generation for titles, descriptions, and article content.'
  icon = 'Sparkles'

  emittedEvents: EventType[] = [
    'writer.title_generated',
    'writer.description_generated',
    'writer.content_generated',
  ]

  handledEvents: EventType[] = []

  actions: ModuleAction[] = [
    {
      id: 'generate_title',
      name: 'Generate SEO Title',
      description: 'Generate optimized SEO title options based on article content and focus keyword',
      params: [
        { name: 'post_id', type: 'string', label: 'Post ID', required: true },
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
        { name: 'persona_id', type: 'string', label: 'Persona', required: false },
        { name: 'keyword', type: 'string', label: 'Focus Keyword', required: false },
        { name: 'tone', type: 'select', label: 'Tone of Voice', required: false, default: 'professional', options: [
          { label: 'Professional', value: 'professional' },
          { label: 'Casual', value: 'casual' },
          { label: 'Straightforward', value: 'straightforward' },
          { label: 'Confident', value: 'confident' },
          { label: 'Friendly', value: 'friendly' },
        ]},
      ],
    },
    {
      id: 'generate_description',
      name: 'Generate Meta Description',
      description: 'Generate compelling meta description options for search results',
      params: [
        { name: 'post_id', type: 'string', label: 'Post ID', required: true },
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
        { name: 'persona_id', type: 'string', label: 'Persona', required: false },
        { name: 'keyword', type: 'string', label: 'Focus Keyword', required: false },
        { name: 'tone', type: 'select', label: 'Tone of Voice', required: false, default: 'professional', options: [
          { label: 'Professional', value: 'professional' },
          { label: 'Casual', value: 'casual' },
          { label: 'Straightforward', value: 'straightforward' },
          { label: 'Confident', value: 'confident' },
          { label: 'Friendly', value: 'friendly' },
        ]},
      ],
    },
    {
      id: 'generate_content',
      name: 'Generate Article Content',
      description: 'Generate full article content from a topic with SEO optimization',
      params: [
        { name: 'topic', type: 'string', label: 'Topic', required: true },
        { name: 'persona_id', type: 'string', label: 'Persona', required: false },
        { name: 'site_id', type: 'string', label: 'Site ID', required: false },
        { name: 'writing_style', type: 'select', label: 'Writing Style', required: false, default: 'balanced', options: [
          { label: 'Balanced', value: 'balanced' },
          { label: 'Formal', value: 'formal' },
          { label: 'Casual', value: 'casual' },
          { label: 'Technical', value: 'technical' },
          { label: 'Creative', value: 'creative' },
        ]},
      ],
    },
  ]

  requiredKeys: ApiKeyType[] = ['gemini']

  sidebar: ModuleSidebarConfig | null = {
    section: 'Content',
    sectionColor: 'bg-yellow-500',
    label: 'AI Writer',
    viewState: 'ai-writer',
    order: 5,
  }

  async handleEvent(_event: CoreEvent, _context: ModuleContext): Promise<CoreEvent | null> {
    return null
  }

  async executeAction(
    actionId: string,
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    switch (actionId) {
      case 'generate_title':
        return this.generateTitle(params, context)
      case 'generate_description':
        return this.generateDescription(params, context)
      case 'generate_content':
        return this.generateContent(params, context)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  // ====== Helpers ======

  private async getGeminiClient(context: ModuleContext) {
    const geminiKey = context.apiKeys['gemini']
    if (!geminiKey) throw new Error('Gemini API key not configured')
    const { GoogleGenAI } = await import('@google/genai')
    return new GoogleGenAI({ apiKey: geminiKey })
  }

  private async getPersonaContext(
    personaId: string | undefined,
    topic: string,
    context: ModuleContext
  ): Promise<{ systemInstruction: string; writingStyle: string }> {
    if (!personaId) return { systemInstruction: '', writingStyle: 'balanced' }

    const personasModule = new PersonasModule()
    const personaCtx = await personasModule.executeAction(
      'get_persona_context',
      { persona_id: personaId, topic },
      context
    )

    const parts: string[] = []
    if (personaCtx.systemPrompt) parts.push(personaCtx.systemPrompt)
    if (personaCtx.inlineContext) parts.push(`\n\nReference Knowledge:\n${personaCtx.inlineContext}`)
    if (personaCtx.ragContext) parts.push(`\n\nRelevant Context:\n${personaCtx.ragContext}`)

    return {
      systemInstruction: parts.join('\n'),
      writingStyle: personaCtx.writingStyle || 'balanced',
    }
  }

  private async fetchPostData(postId: string, siteId: string, context: ModuleContext) {
    // Try posts table first (WordPress synced posts)
    const { data: post } = await context.supabase
      .from('posts')
      .select('title, content, focus_keyword, seo_title, seo_description, slug')
      .eq('id', postId)
      .eq('site_id', siteId)
      .single()

    if (post) return post

    // Fallback: try generated_articles table (locally created articles)
    const { data: article } = await context.supabase
      .from('generated_articles')
      .select('title, content, keyword, seo_title, seo_description, slug')
      .eq('id', postId)
      .eq('site_id', siteId)
      .single()

    if (article) return { ...article, focus_keyword: article.keyword }

    throw new Error('Post not found')
  }

  // ====== Generate Title ======

  private async generateTitle(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { post_id, site_id, persona_id, keyword, tone } = params
    if (!post_id || !site_id) throw new Error('post_id and site_id are required')

    const ai = await this.getGeminiClient(context)
    const post = await this.fetchPostData(post_id, site_id, context)

    const focusKeyword = keyword || post.focus_keyword || ''
    const toneOfVoice = tone || 'professional'
    const { systemInstruction, writingStyle } = await this.getPersonaContext(
      persona_id, post.title || focusKeyword, context
    )

    const plainContent = (post.content || '').replace(/<[^>]*>/g, '').substring(0, 3000)

    const prompt = `You are an SEO copywriting expert.${systemInstruction ? `\n\n${systemInstruction}` : ''}

Generate exactly 3 SEO-optimized title options for the following article.

Article Title: ${post.title || 'Untitled'}
Focus Keyword: ${focusKeyword || 'N/A'}
Tone of Voice: ${toneOfVoice}
Writing Style: ${writingStyle}
Article Content (excerpt):
${plainContent}

Requirements:
- Each title must be between 50-60 characters
- Place the focus keyword near the beginning of the title when possible
- Include the focus keyword naturally — do not force it
- Use power words where appropriate (Ultimate, Essential, Complete, Proven, Best)
- Make titles compelling, click-worthy, and unique — avoid generic phrasing
- Write in a ${toneOfVoice} tone of voice
- Each title should use a different approach (question, how-to, listicle, emotional, data-driven, etc.)

Return ONLY valid JSON in this exact format:
{"titles": ["Title Option 1", "Title Option 2", "Title Option 3"]}`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    const responseText = response.text?.trim() || '{}'
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleaned)

    await context.emitEvent({
      event_type: 'writer.title_generated',
      source_module: 'ai-writer',
      payload: { post_id, site_id, titles: result.titles },
      site_id,
    })

    return {
      titles: result.titles || [],
      selected: result.titles?.[0] || '',
    }
  }

  // ====== Generate Description ======

  private async generateDescription(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { post_id, site_id, persona_id, keyword, tone } = params
    if (!post_id || !site_id) throw new Error('post_id and site_id are required')

    const ai = await this.getGeminiClient(context)
    const post = await this.fetchPostData(post_id, site_id, context)

    const focusKeyword = keyword || post.focus_keyword || ''
    const toneOfVoice = tone || 'professional'
    const { systemInstruction, writingStyle } = await this.getPersonaContext(
      persona_id, post.title || focusKeyword, context
    )

    const plainContent = (post.content || '').replace(/<[^>]*>/g, '').substring(0, 3000)

    const prompt = `You are an SEO copywriting expert.${systemInstruction ? `\n\n${systemInstruction}` : ''}

Generate exactly 3 compelling meta description options for the following article.

Article Title: ${post.title || 'Untitled'}
SEO Title: ${post.seo_title || 'N/A'}
Focus Keyword: ${focusKeyword || 'N/A'}
Tone of Voice: ${toneOfVoice}
Writing Style: ${writingStyle}
Article Content (excerpt):
${plainContent}

Requirements:
- Each description must be between 140-160 characters
- Start with an action verb or the focus keyword for maximum impact
- Include the focus keyword naturally within the first 80 characters
- Include a unique selling point, benefit, or value proposition
- Create urgency or curiosity without resorting to clickbait
- Write in a ${toneOfVoice} tone of voice
- Each description should use a different approach (benefit-driven, question, how-to, data-driven)

Return ONLY valid JSON in this exact format:
{"descriptions": ["Description 1", "Description 2", "Description 3"]}`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    const responseText = response.text?.trim() || '{}'
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleaned)

    await context.emitEvent({
      event_type: 'writer.description_generated',
      source_module: 'ai-writer',
      payload: { post_id, site_id, descriptions: result.descriptions },
      site_id,
    })

    return {
      descriptions: result.descriptions || [],
      selected: result.descriptions?.[0] || '',
    }
  }

  // ====== Generate Content ======

  private async generateContent(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { topic, persona_id, site_id, writing_style } = params
    if (!topic) throw new Error('topic is required')

    const ai = await this.getGeminiClient(context)
    const { systemInstruction, writingStyle: personaStyle } = await this.getPersonaContext(
      persona_id, topic, context
    )

    const style = writing_style || personaStyle || 'balanced'

    const prompt = `You are a professional SEO content writer.${systemInstruction ? `\n\n${systemInstruction}` : ''}

Write a comprehensive, SEO-optimized blog article about the following topic.

Topic: ${topic}
Writing Style: ${style}

Requirements:
- Write in HTML format (use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags)
- Include a compelling introduction that hooks the reader
- Use proper heading hierarchy (H2 for main sections, H3 for subsections)
- Include at least 5 main sections
- Naturally incorporate the topic as a keyword throughout
- Add internal linking suggestions as [INTERNAL_LINK: anchor text]
- Include a conclusion with a clear call to action
- Target 1500-2500 words
- Make content informative, engaging, and actionable

Also generate:
- An SEO-optimized title (50-60 characters)
- A meta description (140-160 characters)
- 3-5 suggested focus keywords

Return ONLY valid JSON:
{
  "title": "Article Title",
  "seo_title": "SEO Title",
  "meta_description": "Meta description",
  "focus_keywords": ["keyword1", "keyword2"],
  "content": "<h2>...</h2><p>...</p>..."
}`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    const responseText = response.text?.trim() || '{}'
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleaned)

    await context.emitEvent({
      event_type: 'writer.content_generated',
      source_module: 'ai-writer',
      payload: { topic, site_id, title: result.title },
      site_id,
    })

    return result
  }
}
