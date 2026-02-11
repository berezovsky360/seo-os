// Fact Checker — Verifies extracted facts via DataForSEO SERP results

import { DataForSEOClient } from '@/lib/dataforseo/client'
import type { ExtractedFact, FactCheckResults, VerifiedFact, UnverifiedFact } from './types'

export async function factCheck(
  facts: ExtractedFact[],
  dataforseoKey: string
): Promise<FactCheckResults> {
  if (!facts.length) {
    return { verified: [], unverified: [], checked_at: new Date().toISOString() }
  }

  // DataForSEO uses login:password format, stored as "login|password" in apiKeys
  const [login, password] = dataforseoKey.includes('|')
    ? dataforseoKey.split('|')
    : [dataforseoKey, '']

  const client = new DataForSEOClient({ login, password })

  const verified: VerifiedFact[] = []
  const unverified: UnverifiedFact[] = []

  // Check top 5 facts to stay within API budget
  const factsToCheck = facts.slice(0, 5)

  // Build search queries from facts
  const queries = factsToCheck.map((f) =>
    f.fact.length > 80 ? f.fact.slice(0, 80) : f.fact
  )

  try {
    const serpResults = await client.checkPositions(queries)

    for (const fact of factsToCheck) {
      const query = fact.fact.length > 80 ? fact.fact.slice(0, 80) : fact.fact
      const serp = serpResults.get(query)

      if (serp && serp.items_count > 0) {
        // Look for corroborating evidence in top results
        const topResults = serp.items.slice(0, 5)
        const evidence = topResults
          .filter((item) => item.description && item.description.length > 20)
          .map((item) => `${item.title} — ${item.description}`)
          .slice(0, 2)
          .join('; ')

        if (evidence) {
          verified.push({
            fact: fact.fact,
            serp_evidence: evidence,
            confidence: Math.min(fact.confidence + 0.1, 1),
          })
        } else {
          unverified.push({
            fact: fact.fact,
            reason: 'No corroborating descriptions found in top SERP results',
          })
        }
      } else {
        unverified.push({
          fact: fact.fact,
          reason: 'No SERP results found for this claim',
        })
      }
    }
  } catch (error) {
    // If API fails, mark all as unverified
    for (const fact of factsToCheck) {
      unverified.push({
        fact: fact.fact,
        reason: `SERP check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  return {
    verified,
    unverified,
    checked_at: new Date().toISOString(),
  }
}
