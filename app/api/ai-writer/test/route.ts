import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'
import { DEFAULT_MODEL } from '@/lib/modules/ai-writer/pricing'

export async function POST() {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    if (!keyRow) {
      return NextResponse.json({ error: 'Gemini API key not configured. Add it in API Keys settings.' }, { status: 400 })
    }

    const encryptionKey = getEncryptionKey()
    const decryptedKey = await decrypt(keyRow.encrypted_value, encryptionKey)

    // Fetch user's model preference
    const { data: moduleConfig } = await serviceClient
      .from('modules_config')
      .select('settings')
      .eq('user_id', user.id)
      .eq('module_id', 'ai-writer')
      .single()

    const model = moduleConfig?.settings?.model || DEFAULT_MODEL

    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: decryptedKey })

    const response = await ai.models.generateContent({
      model,
      contents: 'Respond with exactly: "AI Writer connection OK"',
      config: { temperature: 0, maxOutputTokens: 20 },
    })

    const text = response.text?.trim() || ''

    return NextResponse.json({
      success: true,
      message: `Gemini connected successfully. Model: ${model}`,
      model,
      response: text,
    })
  } catch (error) {
    console.error('[API] ai-writer/test error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    )
  }
}
