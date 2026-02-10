/**
 * Personas Module — Author personas and brand voice management with RAG.
 *
 * Actions:
 * - get_persona_context: Fetch persona + inline docs + RAG-retrieved chunks
 * - process_document: Chunk large files and embed via Gemini
 * - rotate_author: Select next active persona
 */

import type { CoreEvent, EventType, ApiKeyType } from '@/lib/core/events'
import type { SEOModule, ModuleAction, ModuleContext, ModuleSidebarConfig } from '@/lib/core/module-interface'

export class PersonasModule implements SEOModule {
  id = 'personas' as const
  name = 'Personas'
  description = 'Author personas and brand voice management with RAG knowledge base.'
  icon = 'Users'

  emittedEvents: EventType[] = [
    'persona.created',
    'persona.updated',
    'persona.document_uploaded',
    'persona.document_processed',
  ]

  handledEvents: EventType[] = []

  actions: ModuleAction[] = [
    {
      id: 'get_persona_context',
      name: 'Get Persona Context',
      description: 'Retrieve persona system prompt, inline documents, and RAG-retrieved context',
      params: [
        { name: 'persona_id', type: 'string', label: 'Persona ID', required: true },
        { name: 'topic', type: 'string', label: 'Topic for RAG retrieval', required: false },
      ],
    },
    {
      id: 'process_document',
      name: 'Process Document',
      description: 'Chunk and embed a large document for RAG retrieval',
      params: [
        { name: 'document_id', type: 'string', label: 'Document ID', required: true },
      ],
    },
    {
      id: 'rotate_author',
      name: 'Rotate Author',
      description: 'Randomly select an active author persona for content generation',
      params: [],
    },
  ]

  requiredKeys: ApiKeyType[] = ['gemini']

  sidebar: ModuleSidebarConfig = {
    section: 'Content',
    sectionColor: 'bg-yellow-500',
    label: 'Personas',
    viewState: 'authors',
    order: 2,
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
      case 'get_persona_context':
        return this.getPersonaContext(params, context)
      case 'process_document':
        return this.processDocument(params, context)
      case 'rotate_author':
        return this.rotateAuthor(context)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  // ====== Get Persona Context (system prompt + inline docs + RAG) ======

  private async getPersonaContext(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { persona_id, topic } = params
    if (!persona_id) throw new Error('persona_id is required')

    // 1. Fetch persona
    const { data: persona } = await context.supabase
      .from('personas')
      .select('*')
      .eq('id', persona_id)
      .single()

    if (!persona) throw new Error('Persona not found')

    // 2. Fetch inline documents
    const { data: inlineDocs } = await context.supabase
      .from('persona_documents')
      .select('file_name, content_text')
      .eq('persona_id', persona_id)
      .eq('strategy', 'inline')
      .eq('is_processed', true)

    const inlineContext = (inlineDocs || [])
      .filter((d: any) => d.content_text)
      .map((d: any) => `--- ${d.file_name} ---\n${d.content_text}`)
      .join('\n\n')

    // 3. RAG retrieval if topic is provided and Gemini key is available
    let ragContext = ''
    if (topic && context.apiKeys['gemini']) {
      try {
        ragContext = await this.retrieveRAGContext(persona_id, topic, context)
      } catch (err) {
        console.error('RAG retrieval failed, continuing without:', err)
      }
    }

    return {
      systemPrompt: persona.system_prompt,
      writingStyle: persona.writing_style,
      personaName: persona.name,
      personaRole: persona.role,
      inlineContext,
      ragContext,
    }
  }

  private async retrieveRAGContext(
    personaId: string,
    topic: string,
    context: ModuleContext
  ): Promise<string> {
    const geminiKey = context.apiKeys['gemini']
    if (!geminiKey) return ''

    // Check if there are any chunks for this persona
    const { count } = await context.supabase
      .from('document_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('persona_id', personaId)

    if (!count || count === 0) return ''

    // Embed the topic query
    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: geminiKey })

    const embeddingResult = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: topic,
    })

    const queryEmbedding = embeddingResult.embeddings?.[0]?.values
    if (!queryEmbedding) return ''

    // Query pgvector for top-5 similar chunks
    const { data: chunks } = await context.supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_persona_id: personaId,
      match_threshold: 0.5,
      match_count: 5,
    })

    if (!chunks || chunks.length === 0) return ''

    return chunks
      .map((c: any) => c.content)
      .join('\n\n---\n\n')
  }

  // ====== Process Document (chunk + embed) ======

  private async processDocument(
    params: Record<string, any>,
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { document_id } = params
    if (!document_id) throw new Error('document_id is required')

    const geminiKey = context.apiKeys['gemini']
    if (!geminiKey) throw new Error('Gemini API key not configured')

    // Get document metadata
    const { data: doc } = await context.supabase
      .from('persona_documents')
      .select('*')
      .eq('id', document_id)
      .single()

    if (!doc) throw new Error('Document not found')

    // If inline strategy, already processed
    if (doc.strategy === 'inline') {
      return { success: true, chunk_count: 0, message: 'Inline document — no chunking needed' }
    }

    try {
      // Download file from storage
      const { data: fileData, error: downloadError } = await context.supabase.storage
        .from('persona-docs')
        .download(doc.storage_path)

      if (downloadError || !fileData) throw new Error('Failed to download file')

      // Extract text
      const text = await fileData.text()
      if (!text) throw new Error('Failed to extract text from file')

      // Chunk the text (~500 tokens with 50-token overlap, ~2000 chars ≈ 500 tokens)
      const chunks = this.chunkText(text, 2000, 200)

      // Embed each chunk
      const { GoogleGenAI } = await import('@google/genai')
      const ai = new GoogleGenAI({ apiKey: geminiKey })

      // Process in batches of 10
      const batchSize = 10
      let totalInserted = 0

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize)

        const embeddings = await Promise.all(
          batch.map(async (chunk) => {
            const result = await ai.models.embedContent({
              model: 'text-embedding-004',
              contents: chunk,
            })
            return result.embeddings?.[0]?.values || null
          })
        )

        const inserts = batch.map((chunk, idx) => ({
          document_id: doc.id,
          persona_id: doc.persona_id,
          chunk_index: i + idx,
          content: chunk,
          token_count: Math.ceil(chunk.length / 4),
          embedding: embeddings[idx] ? `[${embeddings[idx]!.join(',')}]` : null,
        }))

        const { error: insertError } = await context.supabase
          .from('document_chunks')
          .insert(inserts)

        if (insertError) throw insertError
        totalInserted += inserts.length
      }

      // Update document status
      await context.supabase
        .from('persona_documents')
        .update({
          is_processed: true,
          chunk_count: totalInserted,
        })
        .eq('id', document_id)

      await context.emitEvent({
        event_type: 'persona.document_processed',
        source_module: 'personas',
        payload: { document_id, chunk_count: totalInserted },
      })

      return { success: true, chunk_count: totalInserted }
    } catch (error) {
      await context.supabase
        .from('persona_documents')
        .update({
          processing_error: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', document_id)

      throw error
    }
  }

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = []
    let start = 0

    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length)

      // Try to break at a sentence or paragraph boundary
      if (end < text.length) {
        const lastParagraph = text.lastIndexOf('\n\n', end)
        const lastSentence = text.lastIndexOf('. ', end)
        const lastNewline = text.lastIndexOf('\n', end)

        if (lastParagraph > start + chunkSize / 2) {
          end = lastParagraph + 2
        } else if (lastSentence > start + chunkSize / 2) {
          end = lastSentence + 2
        } else if (lastNewline > start + chunkSize / 2) {
          end = lastNewline + 1
        }
      }

      chunks.push(text.slice(start, end).trim())
      start = end - overlap
      if (start < 0) start = 0
      if (end >= text.length) break
    }

    return chunks.filter(c => c.length > 0)
  }

  // ====== Rotate Author ======

  private async rotateAuthor(
    context: ModuleContext
  ): Promise<Record<string, any>> {
    const { data: personas } = await context.supabase
      .from('personas')
      .select('*')
      .eq('user_id', context.userId)
      .eq('active', true)

    if (!personas || personas.length === 0) {
      throw new Error('No active personas found')
    }

    const selected = personas[Math.floor(Math.random() * personas.length)]
    return {
      persona_id: selected.id,
      name: selected.name,
      role: selected.role,
      writing_style: selected.writing_style,
    }
  }
}
