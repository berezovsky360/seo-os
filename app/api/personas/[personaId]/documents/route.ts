import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ personaId: string }> }
) {
  try {
    const { personaId } = await params
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await serviceClient
      .from('persona_documents')
      .select('*')
      .eq('persona_id', personaId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ documents: data || [] })
  } catch (error) {
    console.error('[API] persona documents GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ personaId: string }> }
) {
  try {
    const { personaId } = await params
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Upload file to Supabase Storage
    const storagePath = `personas/${user.id}/${personaId}/${Date.now()}-${file.name}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await serviceClient.storage
      .from('persona-docs')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) throw uploadError

    // Determine strategy based on file size
    const strategy = file.size < 50_000 ? 'inline' : 'chunked'

    // For inline strategy, extract text content immediately
    let contentText: string | null = null
    if (strategy === 'inline') {
      const text = await file.text()
      contentText = text
    }

    // Save document metadata
    const { data, error } = await serviceClient
      .from('persona_documents')
      .insert({
        persona_id: personaId,
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        strategy,
        content_text: contentText,
        is_processed: strategy === 'inline', // inline is immediately processed
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ document: data })
  } catch (error) {
    console.error('[API] persona document upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
