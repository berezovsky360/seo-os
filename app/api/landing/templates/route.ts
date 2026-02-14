import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAllBuiltinTemplates } from '@/lib/landing-engine/templates/seed-templates'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('landing_templates')
    .select('id, name, slug, description, version, manifest, is_builtin, created_at')
    .order('is_builtin', { ascending: false })
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — Seed all built-in templates (upsert by slug)
export async function POST() {
  const templates = getAllBuiltinTemplates()
  const results: { slug: string; status: string }[] = []

  for (const tpl of templates) {
    const { data: existing } = await supabase
      .from('landing_templates')
      .select('id')
      .eq('slug', tpl.slug)
      .single()

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('landing_templates')
        .update({
          name: tpl.name,
          description: tpl.description,
          version: tpl.version,
          manifest: tpl.manifest,
          layouts: tpl.layouts,
          partials: tpl.partials,
          critical_css: tpl.critical_css,
          theme_css: tpl.theme_css,
          is_builtin: tpl.is_builtin,
        })
        .eq('id', existing.id)

      results.push({ slug: tpl.slug, status: error ? `error: ${error.message}` : 'updated' })
    } else {
      // Insert new
      const { error } = await supabase
        .from('landing_templates')
        .insert(tpl)

      results.push({ slug: tpl.slug, status: error ? `error: ${error.message}` : 'created' })
    }
  }

  return NextResponse.json({ seeded: results })
}
