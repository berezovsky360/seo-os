import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'
import { calculateCost, DEFAULT_MODEL } from '@/lib/modules/ai-writer/pricing'
import { checkBudget } from '@/lib/utils/usage-budget'

// Allow long-running generation (up to 2 min) and large payloads (base64 images)
export const maxDuration = 120

const SYSTEM_PROMPT = `You are an expert web designer. Generate clean, responsive HTML + CSS for a landing page section.
Rules:
- Output ONLY the HTML content (no <!DOCTYPE>, <html>, <head>, <body> wrappers)
- Use a single <style> tag at the top for all CSS
- Fully responsive, mobile-first design
- Modern, clean design with good typography and spacing
- Use semantic HTML (section, header, nav, article, footer)
- Use placeholder images from https://picsum.photos (e.g. https://picsum.photos/800/400)
- Include realistic placeholder text
- No external CDN links, no JavaScript frameworks
- No JavaScript unless absolutely necessary for interactivity
- Use CSS Grid or Flexbox for layout
- Include hover states for interactive elements`

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

    let contents: any

    if (mode === 'reference') {
      const imageParts = referenceImages!.map((img) => ({
        inlineData: { mimeType: img.mime || 'image/png', data: img.data },
      }))
      const imageCount = referenceImages!.length
      const textInstruction = imageCount === 1
        ? 'Recreate this design as clean HTML+CSS. Match the layout, colors, typography, and structure as closely as possible.'
        : `I'm providing ${imageCount} reference images. Analyze all of them and create a cohesive landing page that combines the best design elements, layout patterns, colors, and typography from these references.`
      contents = [{
        role: 'user',
        parts: [
          ...imageParts,
          { text: SYSTEM_PROMPT + '\n\n' + textInstruction + (prompt ? `\n\nAdditional instructions: ${prompt}` : '') },
        ],
      }]
    } else if (mode === 'prompt') {
      contents = SYSTEM_PROMPT + '\n\nCreate a landing page with the following description:\n' + prompt
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
        parts: [{ text: SYSTEM_PROMPT + `\n\nHere is the current HTML:\n\`\`\`html\n${currentHtml}\n\`\`\`\n\nModify it according to this instruction: ${prompt}\n\nReturn the FULL updated HTML (not just the changed parts).` }],
      })
      contents = msgs
    }

    // Try preferred model, fallback to flash on quota/rate errors
    let response: any
    let model = preferredModel
    try {
      response = await ai.models.generateContent({ model, contents })
    } catch (genErr: any) {
      const status = genErr?.status ?? genErr?.httpStatusCode ?? 0
      const msg = genErr?.message || ''
      if ((status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) && preferredModel !== fallbackModel) {
        console.warn(`[AI] ${preferredModel} quota hit, falling back to ${fallbackModel}`)
        model = fallbackModel
        response = await ai.models.generateContent({ model, contents })
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
