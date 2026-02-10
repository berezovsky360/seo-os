-- ============================================================
-- Personas + AI Writer tables for RAG-based content generation
-- ============================================================

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: personas
CREATE TABLE IF NOT EXISTS personas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  system_prompt TEXT NOT NULL DEFAULT '',
  writing_style TEXT DEFAULT 'balanced',
  active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_personas_user_id ON personas(user_id);

-- Table: persona_documents (file metadata)
CREATE TABLE IF NOT EXISTS persona_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  strategy TEXT NOT NULL CHECK (strategy IN ('inline', 'chunked')),
  content_text TEXT,
  chunk_count INTEGER DEFAULT 0,
  is_processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_persona_documents_persona_id ON persona_documents(persona_id);

-- Table: document_chunks (pgvector RAG)
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES persona_documents(id) ON DELETE CASCADE NOT NULL,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_chunks_persona_id ON document_chunks(persona_id);
CREATE INDEX idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- RLS policies
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own personas"
  ON personas FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own persona documents"
  ON persona_documents FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can access chunks via persona"
  ON document_chunks FOR ALL
  USING (persona_id IN (SELECT id FROM personas WHERE user_id = auth.uid()));

-- RPC function for vector similarity search
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(768),
  match_persona_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  chunk_index INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE dc.persona_id = match_persona_id
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Supabase Storage bucket for persona docs
INSERT INTO storage.buckets (id, name, public)
VALUES ('persona-docs', 'persona-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload persona docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'persona-docs' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Users can read own persona docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'persona-docs' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Users can delete own persona docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'persona-docs' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Service role full access persona storage"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'persona-docs');

-- Service role bypass for API routes
CREATE POLICY "Service role full access personas"
  ON personas FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access persona_documents"
  ON persona_documents FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access document_chunks"
  ON document_chunks FOR ALL
  TO service_role
  USING (true);
