// Semantic Clustering — Embed items + group by cosine similarity

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ContentCluster } from './types'

// Generate embeddings for content items using text-embedding-004
export async function embedItems(
  items: { id: string; title: string; content: string | null }[],
  apiKey: string,
  supabase: SupabaseClient
): Promise<number> {
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })

  let embedded = 0

  // Process in batches of 10
  for (let i = 0; i < items.length; i += 10) {
    const batch = items.slice(i, i + 10)

    for (const item of batch) {
      const text = `${item.title}\n${(item.content || '').slice(0, 2000)}`

      try {
        const result = await ai.models.embedContent({
          model: 'text-embedding-004',
          contents: text,
        })

        const embedding = result.embeddings?.[0]?.values
        if (embedding) {
          const vectorStr = `[${embedding.join(',')}]`
          await supabase
            .from('content_items')
            .update({ embedding: vectorStr })
            .eq('id', item.id)
          embedded++
        }
      } catch {
        // Skip items that fail to embed
      }
    }
  }

  return embedded
}

// Cluster items by cosine similarity using pgvector
export async function clusterItems(
  userId: string,
  siteId: string | null,
  supabase: SupabaseClient,
  apiKey: string
): Promise<ContentCluster[]> {
  // Fetch items with embeddings that aren't yet clustered
  let query = supabase
    .from('content_items')
    .select('id, title, content, embedding')
    .eq('user_id', userId)
    .is('cluster_id', null)
    .not('embedding', 'is', null)

  if (siteId) {
    // Filter by feed's site_id
    const { data: feeds } = await supabase
      .from('content_feeds')
      .select('id')
      .eq('site_id', siteId)

    if (feeds?.length) {
      query = query.in('feed_id', feeds.map((f) => f.id))
    }
  }

  const { data: items } = await query

  if (!items || items.length < 2) return []

  // Simple greedy clustering: for each unclustered item, find similar items
  const THRESHOLD = 0.75
  const clustered = new Set<string>()
  const clusters: { items: typeof items; label: string }[] = []

  for (const item of items) {
    if (clustered.has(item.id)) continue

    // Use pgvector to find similar items
    const { data: similar } = await supabase.rpc('match_content_items', {
      query_embedding: item.embedding,
      match_threshold: THRESHOLD,
      match_count: 20,
      p_user_id: userId,
    })

    if (!similar || similar.length < 2) continue

    const clusterItems = similar.filter((s: any) => !clustered.has(s.id))
    if (clusterItems.length < 2) continue

    for (const ci of clusterItems) {
      clustered.add(ci.id)
    }

    clusters.push({
      items: clusterItems,
      label: '',
    })
  }

  // Generate labels for clusters using Gemini Flash
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })

  const createdClusters: ContentCluster[] = []

  for (const cluster of clusters) {
    const titles = cluster.items.map((i: any) => i.title).slice(0, 10).join('\n- ')

    try {
      const labelResult = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: `Generate a short (3-6 word) topic label for this cluster of related articles:\n- ${titles}\n\nRespond with JSON: {"label": "<label>", "summary": "<1 sentence summary>"}`,
        config: { responseMimeType: 'application/json', temperature: 0.3 },
      })

      const parsed = JSON.parse(labelResult.text || '{}')

      // Create cluster in DB
      const { data: created } = await supabase
        .from('content_clusters')
        .insert({
          user_id: userId,
          site_id: siteId,
          label: parsed.label || 'Unnamed Cluster',
          summary: parsed.summary || null,
          item_count: cluster.items.length,
        })
        .select()
        .single()

      if (created) {
        // Assign items to cluster
        await supabase
          .from('content_items')
          .update({ cluster_id: created.id, status: 'clustered' })
          .in('id', cluster.items.map((i: any) => i.id))

        createdClusters.push(created)
      }
    } catch {
      // Skip clusters that fail to label
    }
  }

  return createdClusters
}
