import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'
import { calculateCost, DEFAULT_MODEL } from '@/lib/modules/ai-writer/pricing'
import { checkBudget } from '@/lib/utils/usage-budget'

// Allow long-running generation (up to 5 min) and large payloads (base64 images)
export const maxDuration = 300

const SYSTEM_PROMPT = `You are an elite frontend developer and UI/UX designer specializing in high-converting landing pages.

TECHNOLOGY STACK:
- Start with: <script src="https://cdn.tailwindcss.com"></script>
- Use ONLY Tailwind CSS utility classes for ALL styling — do NOT write any custom CSS or <style> tags
- Use inline Tailwind config via <script> tag if you need custom colors:
  <script>tailwindcss.config={theme:{extend:{colors:{brand:'#6B22CC',accent:'#00C25E'}}}}</script>
- For icons use inline SVG (heroicons style) — no external icon libraries
- Only use vanilla JS if essential for interactivity (mobile menu toggle, smooth scroll)

OUTPUT RULES:
- Output clean HTML with Tailwind classes (no <!DOCTYPE>, <html>, <head>, <body> wrappers)
- Every element must be styled via Tailwind classes, never via style="" attributes or custom CSS
- Use semantic HTML5: <section>, <header>, <nav>, <article>, <footer>

DESIGN PRINCIPLES:
- Mobile-first responsive design: start with mobile, add md: and lg: breakpoints
- Typography: text-4xl md:text-5xl lg:text-6xl for h1, text-lg/text-xl for body, font-sans
- Spacing: py-16 md:py-24 for sections, consistent gap-6/gap-8 rhythm
- Color: cohesive palette using Tailwind color families (slate, emerald, indigo, etc.)
- Rounded corners: rounded-xl/rounded-2xl for cards, rounded-full for avatars/badges
- Shadows: shadow-sm for cards, shadow-lg for elevated elements, shadow-xl for modals
- Hover states: hover:shadow-lg, hover:-translate-y-1, hover:bg-opacity transitions
- CTA buttons: min h-12, px-8, rounded-xl, font-semibold, transition-all duration-300
- Images: use https://picsum.photos/seed/{name}/{w}/{h} for consistency
- Grid layouts: grid md:grid-cols-2 lg:grid-cols-3 gap-8 for feature cards
- Max-width containers: max-w-7xl mx-auto px-6

CONTENT:
- Write realistic, compelling copy in the language specified by the user (not lorem ipsum)
- Include trust signals: testimonials with avatars, stats with large numbers, client logos
- Clear value proposition in the hero section with one primary CTA
- Logical content flow: Hero → Features/Benefits → Social Proof → Process → FAQ → CTA
- Use visual hierarchy: badges/labels above headings, muted descriptions below`

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { mode, prompt, referenceImages, currentHtml, history } = body as {
      mode: 'reference' | 'prompt' | 'refine'
      prompt?: string
      referenceImages?: { data: string; mime: string }[]
      currentHtml?: string
      history?: { role: string; text: string }[]
    }

    if (!mode) {
      return NextResponse.json({ error: 'Missing mode' }, { status: 400 })
    }

    if (mode === 'reference' && (!referenceImages || referenceImages.length === 0)) {
      return NextResponse.json({ error: 'Missing referenceImages for reference mode' }, { status: 400 })
    }

    if (mode === 'reference' && referenceImages && referenceImages.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 reference images allowed' }, { status: 400 })
    }

    if (mode === 'prompt' && !prompt) {
      return NextResponse.json({ error: 'Missing prompt for prompt mode' }, { status: 400 })
    }

    if (mode === 'refine' && (!prompt || !currentHtml)) {
      return NextResponse.json({ error: 'Missing prompt or currentHtml for refine mode' }, { status: 400 })
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: keyRow } = await serviceClient
      .from('api_keys')
      .select('encrypted_value')
      .eq('user_id', user.id)
      .eq('key_type', 'gemini')
      .single()

    if (!keyRow) return NextResponse.json({ error: 'Gemini API key not configured. Add it in Settings → API Keys.' }, { status: 400 })

    const encryptionKey = getEncryptionKey()
    const decryptedKey = await decrypt(keyRow.encrypted_value, encryptionKey)

    // Budget check
    const budgetCheck = await checkBudget(serviceClient, user.id, 'gemini')
    if (!budgetCheck.allowed) {
      return NextResponse.json({ error: 'Monthly budget exceeded', budget_warning: budgetCheck }, { status: 429 })
    }

    // Preferred model: pro for reference (better vision), flash for text
    const preferredModel = mode === 'reference' ? 'gemini-2.5-pro' : 'gemini-2.5-flash'
    const fallbackModel = 'gemini-2.5-flash'

    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: decryptedKey })

    // Build contents — ONLY user messages, no system prompt mixed in
    let contents: any

    if (mode === 'reference') {
      const imageParts = referenceImages!.map((img) => ({
        inlineData: { mimeType: img.mime || 'image/png', data: img.data },
      }))
      const imageCount = referenceImages!.length
      const textInstruction = imageCount === 1
        ? 'Recreate this design as a landing page. Match the layout, colors, typography, and structure as closely as possible.'
        : `I'm providing ${imageCount} reference images. Analyze all of them and create a cohesive landing page that combines the best design elements, layout patterns, colors, and typography from these references.`
      contents = [{
        role: 'user',
        parts: [
          ...imageParts,
          { text: textInstruction + (prompt ? `\n\nAdditional instructions: ${prompt}` : '') },
        ],
      }]
    } else if (mode === 'prompt') {
      contents = `Create a landing page with the following description:\n${prompt}`
    } else {
      // refine mode — include conversation history
      const msgs: any[] = []
      if (history && history.length > 0) {
        for (const msg of history) {
          msgs.push({ role: msg.role === 'model' ? 'model' : 'user', parts: [{ text: msg.text }] })
        }
      }
      msgs.push({
        role: 'user',
        parts: [{ text: `Here is the current HTML:\n\`\`\`html\n${currentHtml}\n\`\`\`\n\nModify it according to this instruction: ${prompt}\n\nReturn the FULL updated HTML (not just the changed parts).` }],
      })
      contents = msgs
    }

    // Gemini config: systemInstruction is separate (like AI Studio) for stronger adherence
    const generationConfig = {
      systemInstruction: SYSTEM_PROMPT,
    }

    // Try preferred model, fallback to flash on quota/rate errors
    let response: any
    let model = preferredModel
    try {
      response = await ai.models.generateContent({ model, contents, config: generationConfig })
    } catch (genErr: any) {
      const status = genErr?.status ?? genErr?.httpStatusCode ?? 0
      const msg = genErr?.message || ''
      if ((status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) && preferredModel !== fallbackModel) {
        console.warn(`[AI] ${preferredModel} quota hit, falling back to ${fallbackModel}`)
        model = fallbackModel
        response = await ai.models.generateContent({ model, contents, config: generationConfig })
      } else {
        throw genErr
      }
    }

    let html = response.text?.trim() || ''

    // Strip markdown code fences if present
    if (html.startsWith('```html')) {
      html = html.slice(7)
    } else if (html.startsWith('```')) {
      html = html.slice(3)
    }
    if (html.endsWith('```')) {
      html = html.slice(0, -3)
    }
    html = html.trim()

    // Log usage
    const usage = response.usageMetadata
    let estimated_cost = 0
    if (usage) {
      const promptTokens = usage.promptTokenCount || 0
      const outputTokens = usage.candidatesTokenCount || 0
      estimated_cost = calculateCost(model, promptTokens, outputTokens)
      await serviceClient.from('ai_usage_log').insert({
        user_id: user.id,
        service: 'gemini',
        action: mode === 'refine' ? 'landing_refine' : 'landing_generate',
        model,
        prompt_tokens: promptTokens,
        output_tokens: outputTokens,
        total_tokens: usage.totalTokenCount || 0,
        estimated_cost,
        metadata: { mode, prompt: prompt?.substring(0, 200) },
      })
    }

    const responseBody: Record<string, any> = {
      html,
      model,
      usage: usage ? {
        model,
        prompt_tokens: usage.promptTokenCount || 0,
        output_tokens: usage.candidatesTokenCount || 0,
        total_tokens: usage.totalTokenCount || 0,
      } : null,
      estimated_cost,
    }

    if (budgetCheck.percentage >= 80) {
      responseBody.budget_warning = { percentage: budgetCheck.percentage, currentSpend: budgetCheck.currentSpend, limit: budgetCheck.limit }
    }

    return NextResponse.json(responseBody)
  } catch (error) {
    console.error('[API] landing/ai-generate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
