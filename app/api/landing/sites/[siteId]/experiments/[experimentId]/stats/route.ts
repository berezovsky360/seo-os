import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function zTest(c1: number, n1: number, c2: number, n2: number): number {
  if (n1 === 0 || n2 === 0) return 0
  const p1 = c1 / n1
  const p2 = c2 / n2
  const p = (c1 + c2) / (n1 + n2)
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2))
  if (se === 0) return 0
  const z = Math.abs(p1 - p2) / se
  // Approximate two-tailed p-value to confidence
  if (z >= 2.576) return 99
  if (z >= 1.96) return 95
  if (z >= 1.645) return 90
  return Math.round(z * 30) // rough approximation below 90%
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ siteId: string; experimentId: string }> }
) {
  const { siteId, experimentId } = await params

  // 1. Fetch the experiment to get landing_page_id
  const { data: experiment, error: expError } = await supabase
    .from('landing_experiments')
    .select('landing_page_id')
    .eq('id', experimentId)
    .eq('landing_site_id', siteId)
    .single()

  if (expError || !experiment) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  // 2. Fetch variants for that page
  const { data: variants, error: varError } = await supabase
    .from('landing_page_variants')
    .select('id, variant_key, is_control')
    .eq('landing_page_id', experiment.landing_page_id)

  if (varError || !variants || variants.length === 0) {
    return NextResponse.json({ error: 'No variants found' }, { status: 404 })
  }

  // 3. Fetch views from pulse_page_views
  const { data: views, error: viewsError } = await supabase
    .from('pulse_page_views')
    .select('variant_key')
    .eq('landing_page_id', experiment.landing_page_id)

  if (viewsError) {
    return NextResponse.json({ error: viewsError.message }, { status: 500 })
  }

  // 4. Fetch conversions from leads
  const { data: conversions, error: convError } = await supabase
    .from('leads')
    .select('variant_key')
    .eq('landing_site_id', siteId)

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 })
  }

  // 5. Compute per-variant stats
  const viewCounts: Record<string, number> = {}
  const convCounts: Record<string, number> = {}

  for (const v of views || []) {
    const key = v.variant_key || 'control'
    viewCounts[key] = (viewCounts[key] || 0) + 1
  }

  for (const c of conversions || []) {
    const key = c.variant_key || 'control'
    convCounts[key] = (convCounts[key] || 0) + 1
  }

  const variantStats = variants.map((v) => {
    const key = v.variant_key
    const vw = viewCounts[key] || 0
    const cv = convCounts[key] || 0
    return {
      variant_key: key,
      views: vw,
      conversions: cv,
      rate: vw > 0 ? cv / vw : 0,
    }
  })

  // 6. Find control and best non-control variant for z-test
  const controlVariant = variants.find((v) => v.is_control)
  const controlKey = controlVariant?.variant_key || variants[0]?.variant_key
  const controlStats = variantStats.find((s) => s.variant_key === controlKey)

  const nonControlStats = variantStats.filter((s) => s.variant_key !== controlKey)
  const bestChallenger = nonControlStats.length > 0
    ? nonControlStats.reduce((best, curr) => (curr.rate > best.rate ? curr : best))
    : null

  let confidence = 0
  let winner: string | null = null

  if (controlStats && bestChallenger) {
    confidence = zTest(
      controlStats.conversions,
      controlStats.views,
      bestChallenger.conversions,
      bestChallenger.views
    )

    if (confidence >= 95) {
      winner = bestChallenger.rate > controlStats.rate
        ? bestChallenger.variant_key
        : controlStats.variant_key
    }
  }

  const sampleSize = variantStats.reduce((sum, s) => sum + s.views, 0)

  return NextResponse.json({
    variants: variantStats,
    confidence,
    winner,
    sample_size: sampleSize,
  })
}
