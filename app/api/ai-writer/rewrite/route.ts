import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'

const ACTION_PROMPTS: Record<string, string> = {
  improve:
    'Improve the writing quality of the following text. Make it clearer, more engaging, and more polished. Keep the same meaning and approximate length. Return ONLY the improved text, no explanations.',
  simplify:
    'Simplify the following text. Use shorter sentences, simpler words, and clearer structure. Maintain the core meaning. Return ONLY the simplified text, no explanations.',
  proofread:
    'Proofread the following text. Fix grammar, spelling, punctuation, and awkward phrasing. Make minimal changes — only correct errors. Return ONLY the corrected text, no explanations.',
  make_longer:
    'Expand the following text with more detail, examples, or explanation. Roughly double the length while keeping quality high. Return ONLY the expanded text, no explanations.',
  make_shorter:
    'Condense the following text to roughly half its length. Keep the most important points and remove redundancy. Return ONLY the shortened text, no explanations.',
  change_tone:
    'Rewrite the following text in a {tone} tone of voice. Keep the same meaning and approximate length. Return ONLY the rewritten text, no explanations.',
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { text, action, tone } = body as {
      text: string
      action: string
      tone?: string
    }

    if (!text || !action) {
      return NextResponse.json({ error: 'Missing text or action' }, { status: 400 })
    }

    let promptTemplate = ACTION_PROMPTS[action]
    if (!promptTemplate) {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    // Replace {tone} placeholder for change_tone action
    if (action === 'change_tone' && tone) {
      promptTemplate = promptTemplate.replace('{tone}', tone)
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

    if (!keyRow) return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 400 })

    const encryptionKey = getEncryptionKey()
    const decryptedKey = await decrypt(keyRow.encrypted_value, encryptionKey)

    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: decryptedKey })

    const prompt = `${promptTemplate}

Text:
${text}`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    const result = response.text?.trim() || text

    return NextResponse.json({ result })
  } catch (error) {
    console.error('[API] ai-writer/rewrite error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
