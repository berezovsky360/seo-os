import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ personaId: string; documentId: string }> }
) {
  try {
    const { personaId, documentId } = await params
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get document to find storage path
    const { data: doc } = await serviceClient
      .from('persona_documents')
      .select('storage_path')
      .eq('id', documentId)
      .eq('persona_id', personaId)
      .eq('user_id', user.id)
      .single()

    if (doc?.storage_path) {
      await serviceClient.storage
        .from('persona-docs')
        .remove([doc.storage_path])
    }

    // Delete document (cascades to chunks)
    const { error } = await serviceClient
      .from('persona_documents')
      .delete()
      .eq('id', documentId)
      .eq('persona_id', personaId)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] persona document DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
