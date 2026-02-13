import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import RecipePublicView from '@/components/modules/recipes/RecipePublicView'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function RecipePublicPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const { data: template, error } = await supabase
    .from('recipe_templates')
    .select('name, description, author_name, category, tags, trigger_event, trigger_conditions, actions, required_modules, install_count, created_at')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (error || !template) {
    notFound()
  }

  return <RecipePublicView template={template} />
}
