import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'

export class NanaBananaModule implements SEOModule {
  id = 'nana-banana' as const
  name = 'Nana Banana'
  description = 'AI-powered featured image generation with SEO alt-text and captions.'
  icon = 'Image'

  emittedEvents: EventType[] = [
    'banana.prompt_generated',
    'banana.image_generated',
    'banana.seo_description_ready',
    'banana.image_pushed_to_wp',
    'banana.pipeline_completed',
    'banana.pipeline_failed',
  ]

  handledEvents: EventType[] = []

  actions: ModuleAction[] = [
    {
      id: 'generate_image_prompt',
      name: 'Generate Image Prompt',
      description: 'Analyze article content and generate an Imagen prompt',
      params: [
        { name: 'post_id', type: 'string', label: 'Post ID', required: true },
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
      ],
    },
    {
      id: 'generate_image',
      name: 'Generate Image',
      description: 'Generate an image using Imagen from a prompt',
      params: [
        { name: 'prompt', type: 'string', label: 'Image Prompt', required: true },
        { name: 'aspect_ratio', type: 'select', label: 'Aspect Ratio', required: false, default: '16:9', options: [
          { label: '16:9 Landscape', value: '16:9' },
          { label: '4:3 Standard', value: '4:3' },
          { label: '1:1 Square', value: '1:1' },
          { label: '3:4 Portrait', value: '3:4' },
        ]},
      ],
    },
    {
      id: 'analyze_image_seo',
      name: 'Generate SEO Description',
      description: 'Analyze image with Gemini and generate alt-text + caption',
      params: [
        { name: 'image_base64', type: 'string', label: 'Image Base64', required: true },
        { name: 'article_title', type: 'string', label: 'Article Title', required: true },
        { name: 'focus_keyword', type: 'string', label: 'Focus Keyword', required: false },
      ],
    },
    {
      id: 'push_to_wordpress',
      name: 'Push to WordPress',
      description: 'Upload image to WP Media Library and set as featured image',
      params: [
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
        { name: 'wp_post_id', type: 'number', label: 'WP Post ID', required: true },
        { name: 'image_base64', type: 'string', label: 'Image Base64', required: true },
        { name: 'alt_text', type: 'string', label: 'Alt Text', required: true },
        { name: 'caption', type: 'string', label: 'Caption', required: false },
      ],
    },
    {
      id: 'run_full_pipeline',
      name: 'Run Full Pipeline',
      description: 'End-to-end: analyze article, generate image, get SEO text, push to WP',
      params: [
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
        { name: 'post_id', type: 'string', label: 'Post ID', required: true },
        { name: 'aspect_ratio', type: 'select', label: 'Aspect Ratio', required: false, default: '16:9' },
      ],
    },
    {
      id: 'analyze_style',
      name: 'Analyze Cover Style',
      description: 'Analyze 1-10 reference images and generate a unified style description',
      params: [
        { name: 'site_id', type: 'string', label: 'Site ID', required: true },
        { name: 'images', type: 'string', label: 'Reference Images (base64 array)', required: true },
      ],
    },
  ]

  requiredKeys: ApiKeyType[] = ['gemini']

  sidebar: ModuleSidebarConfig = {
    section: 'Content',
    sectionColor: 'bg-yellow-500',
    label: 'Nana Banana',
    viewState: 'nana-banana',
    order: 1,
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
      case 'generate_image_prompt':
        return this.generateImagePrompt(params, context)
      case 'generate_image':
        return this.generateImage(params, context)
      case 'analyze_image_seo':
        return this.analyzeImageSeo(params, context)
      case 'push_to_wordpress':
        return this.pushToWordPress(params, context)
      case 'run_full_pipeline':
        return this.runFullPipeline(params, context)
      case 'analyze_style':
        return this.analyzeStyle(params, context)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  // ====== Action implementations ======

  private async generateImagePrompt(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { post_id, site_id } = params
    if (!post_id || !site_id) throw new Error('post_id and site_id are required')

    // Try posts table first (WP synced), then generated_articles (local)
    let post: { title: string; content: string; focus_keyword: string | null; seo_description: string | null } | null = null

    const { data: wpPost } = await context.supabase
      .from('posts')
      .select('title, content, focus_keyword, seo_description')
      .eq('id', post_id)
      .eq('site_id', site_id)
      .maybeSingle()

    if (wpPost) {
      post = wpPost
    } else {
      // Try generated_articles with site_id match
      const { data: article } = await context.supabase
        .from('generated_articles')
        .select('title, content, keyword, seo_description')
        .eq('id', post_id)
        .eq('site_id', site_id)
        .maybeSingle()

      if (article) {
        post = { ...article, focus_keyword: article.keyword }
      } else {
        // Fallback: try generated_articles by id only (site_id may differ)
        const { data: articleById } = await context.supabase
          .from('generated_articles')
          .select('title, content, keyword, seo_description')
          .eq('id', post_id)
          .maybeSingle()

        if (articleById) {
          post = { ...articleById, focus_keyword: articleById.keyword }
        }
      }
    }

    if (!post) throw new Error('Post not found')

    // Fetch site's cover style reference (if set)
    const { data: siteStyle } = await context.supabase
      .from('sites')
      .select('cover_style_prompt')
      .eq('id', site_id)
      .single()

    const geminiKey = context.apiKeys['gemini']
    if (!geminiKey) throw new Error('Gemini API key not configured')

    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: geminiKey })

    const plainContent = (post.content || '').replace(/<[^>]*>/g, '')
    const truncated = plainContent.substring(0, 4000)

    const styleInstruction = siteStyle?.cover_style_prompt
      ? `\n\nIMPORTANT — Match this visual style exactly:\n${siteStyle.cover_style_prompt}\n\nThe generated prompt MUST incorporate these style elements while depicting the article's topic.`
      : ''

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an SEO image specialist. Analyze this article and generate a detailed image generation prompt for Imagen.

Article Title: ${post.title}
Focus Keyword: ${post.focus_keyword || 'N/A'}
SEO Description: ${post.seo_description || 'N/A'}
Article Content (excerpt):
${truncated}

Generate a single, detailed prompt for an AI image generator (Imagen) that would create a professional, visually appealing featured image for this article. The prompt should:
1. Be specific and descriptive (colors, composition, style)
2. Be relevant to the article topic
3. Work well as a blog featured image
4. Avoid text/words in the image
5. Use a photorealistic or professional illustration style${styleInstruction}

Return ONLY the image generation prompt, nothing else.`,
    })

    const imagePrompt = response.text?.trim() || ''

    await context.emitEvent({
      event_type: 'banana.prompt_generated',
      source_module: 'nana-banana',
      payload: { post_id, site_id, prompt: imagePrompt },
      site_id,
    })

    return { prompt: imagePrompt, post_title: post.title, focus_keyword: post.focus_keyword }
  }

  private async generateImage(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { prompt, aspect_ratio = '16:9' } = params
    if (!prompt) throw new Error('prompt is required')

    const geminiKey = context.apiKeys['gemini']
    if (!geminiKey) throw new Error('Gemini API key not configured')

    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: geminiKey })

    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspect_ratio,
      },
    })

    const imageData = response?.generatedImages?.[0]?.image
    if (!imageData?.imageBytes) {
      throw new Error('Image generation failed — no image data returned. Try adjusting the prompt.')
    }

    await context.emitEvent({
      event_type: 'banana.image_generated',
      source_module: 'nana-banana',
      payload: { prompt, aspect_ratio },
      site_id: context.siteId,
    })

    return {
      image_base64: imageData.imageBytes,
      mime_type: imageData.mimeType || 'image/png',
    }
  }

  private async analyzeImageSeo(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { image_base64, article_title, focus_keyword, article_language } = params
    if (!image_base64 || !article_title) throw new Error('image_base64 and article_title are required')

    const geminiKey = context.apiKeys['gemini']
    if (!geminiKey) throw new Error('Gemini API key not configured')

    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: geminiKey })

    const langInstruction = article_language
      ? `Generate the alt-text, caption, and title in ${article_language}.`
      : 'Generate the alt-text, caption, and title in the same language as the article title.'

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: image_base64,
          },
        },
        {
          text: `You are an SEO specialist. Analyze this image that will be used as the featured image for an article.

Article Title: "${article_title}"
Focus Keyword: "${focus_keyword || 'N/A'}"

${langInstruction}

Generate:
1. **alt_text**: A concise, descriptive alt text (max 125 characters) that includes the focus keyword naturally. Must describe the image accurately for accessibility.
2. **caption**: An engaging caption (max 200 characters) that complements the article and encourages reading.
3. **title**: A descriptive title for the media file (max 80 characters).

Return ONLY valid JSON in this format:
{"alt_text": "...", "caption": "...", "title": "..."}`,
        },
      ],
    })

    const responseText = response.text?.trim() || '{}'
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const seoData = JSON.parse(cleaned)

    await context.emitEvent({
      event_type: 'banana.seo_description_ready',
      source_module: 'nana-banana',
      payload: { alt_text: seoData.alt_text, caption: seoData.caption, title: seoData.title },
      site_id: context.siteId,
    })

    return seoData
  }

  private async pushToWordPress(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { site_id, wp_post_id, image_base64, alt_text, caption, title } = params
    if (!site_id || !wp_post_id || !image_base64) {
      throw new Error('site_id, wp_post_id, and image_base64 are required')
    }

    const { data: site } = await context.supabase
      .from('sites')
      .select('url, wp_username, wp_app_password')
      .eq('id', site_id)
      .single()

    if (!site?.wp_username || !site?.wp_app_password) {
      throw new Error('WordPress credentials not configured for this site')
    }

    const { decrypt, getEncryptionKey } = await import('@/lib/utils/encryption')
    const encryptionKey = getEncryptionKey()
    const decryptedPassword = await decrypt(site.wp_app_password, encryptionKey)

    const { createWordPressClient } = await import('@/lib/wordpress/client')
    const wpClient = createWordPressClient({
      url: site.url,
      username: site.wp_username,
      appPassword: decryptedPassword,
    })

    const mediaResult = await wpClient.uploadMedia({
      imageBuffer: Buffer.from(image_base64, 'base64'),
      filename: `nana-banana-${wp_post_id}-${Date.now()}.png`,
      mimeType: 'image/png',
      altText: alt_text || '',
      caption: caption || '',
      title: title || `Featured image for post ${wp_post_id}`,
    })

    await wpClient.setFeaturedImage(wp_post_id, mediaResult.id)

    await context.emitEvent({
      event_type: 'banana.image_pushed_to_wp',
      source_module: 'nana-banana',
      payload: { site_id, wp_post_id, media_id: mediaResult.id, media_url: mediaResult.source_url },
      site_id,
    })

    return { media_id: mediaResult.id, media_url: mediaResult.source_url, wp_post_id }
  }

  private async runFullPipeline(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { site_id, post_id, aspect_ratio = '16:9' } = params

    try {
      const promptResult = await this.generateImagePrompt({ post_id, site_id }, context)
      const imageResult = await this.generateImage({ prompt: promptResult.prompt, aspect_ratio }, context)
      const seoResult = await this.analyzeImageSeo({
        image_base64: imageResult.image_base64,
        article_title: promptResult.post_title,
        focus_keyword: promptResult.focus_keyword,
      }, context)

      // Try to push to WordPress if linked
      // Check posts table first, then generated_articles for wp_post_id
      let wpPostId: number | null = null

      const { data: wpRow } = await context.supabase
        .from('posts')
        .select('wp_post_id')
        .eq('id', post_id)
        .maybeSingle()

      if (wpRow?.wp_post_id) {
        wpPostId = wpRow.wp_post_id
      } else {
        const { data: articleRow } = await context.supabase
          .from('generated_articles')
          .select('wp_post_id')
          .eq('id', post_id)
          .maybeSingle()
        wpPostId = articleRow?.wp_post_id || null
      }

      let wpResult: { media_id?: number; media_url?: string } = {}

      if (wpPostId) {
        wpResult = await this.pushToWordPress({
          site_id,
          wp_post_id: wpPostId,
          image_base64: imageResult.image_base64,
          alt_text: seoResult.alt_text,
          caption: seoResult.caption,
          title: seoResult.title,
        }, context)
      }

      await context.emitEvent({
        event_type: 'banana.pipeline_completed',
        source_module: 'nana-banana',
        payload: {
          site_id, post_id,
          prompt: promptResult.prompt,
          media_id: wpResult.media_id || null,
          media_url: wpResult.media_url || null,
          alt_text: seoResult.alt_text,
          caption: seoResult.caption,
        },
        site_id,
      })

      return {
        prompt: promptResult.prompt,
        image_base64: imageResult.image_base64,
        mime_type: imageResult.mime_type,
        alt_text: seoResult.alt_text,
        caption: seoResult.caption,
        media_title: seoResult.title,
        media_id: wpResult.media_id || null,
        media_url: wpResult.media_url || null,
      }
    } catch (error) {
      await context.emitEvent({
        event_type: 'banana.pipeline_failed',
        source_module: 'nana-banana',
        payload: {
          site_id, post_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        site_id,
        severity: 'warning',
      })
      throw error
    }
  }

  private async analyzeStyle(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { site_id, images, image_base64 } = params
    // Support both: new multi-image `images` array and legacy single `image_base64`
    const imageList: string[] = images
      ? (Array.isArray(images) ? images : [images])
      : image_base64 ? [image_base64] : []

    if (!site_id || imageList.length === 0) throw new Error('site_id and at least one image are required')
    if (imageList.length > 10) throw new Error('Maximum 10 reference images allowed')

    const geminiKey = context.apiKeys['gemini']
    if (!geminiKey) throw new Error('Gemini API key not configured')

    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: geminiKey })

    const imageCount = imageList.length
    const plural = imageCount > 1

    // Build contents array: all images first, then the text prompt
    const contents: any[] = imageList.map(img => ({
      inlineData: {
        mimeType: 'image/png',
        data: img,
      },
    }))

    contents.push({
      text: `You are an art director analyzing ${plural ? `${imageCount} reference images` : 'a reference image'} for consistent brand imagery.

${plural
  ? `These ${imageCount} images represent the desired visual style for a brand. Identify the COMMON visual patterns, style elements, and design language shared across all images. Focus on what makes them look cohesive as a set.`
  : 'Analyze this image and describe its visual style in detail so that an AI image generator can recreate similar images on different topics.'}

Cover:
1. **Art style** (e.g., flat illustration, 3D render, watercolor, photorealistic, minimalist vector, isometric, etc.)
2. **Color palette** (dominant colors, accent colors, overall tone — warm/cool/neutral)
3. **Composition** (layout, perspective, depth of field, framing)
4. **Lighting** (soft/hard, direction, shadows, highlights)
5. **Mood & atmosphere** (professional, playful, dramatic, calm, etc.)
6. **Textures & details** (smooth gradients, grainy, paper texture, glossy, matte)
7. **Distinctive elements** (any recurring visual motifs, border styles, overlays)

Write a concise style description (200-400 words) that can be appended to any image generation prompt to achieve this same look. Write it as direct instructions, e.g., "Use flat vector illustration style with..."

Return ONLY the style description, no preamble or explanation.`,
    })

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
    })

    const stylePrompt = response.text?.trim() || ''

    // Save to sites table
    await context.supabase
      .from('sites')
      .update({ cover_style_prompt: stylePrompt })
      .eq('id', site_id)

    return { style_prompt: stylePrompt, images_analyzed: imageCount }
  }
}
