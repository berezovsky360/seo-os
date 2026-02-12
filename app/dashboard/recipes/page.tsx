'use client'

import { useRouter } from 'next/navigation'
import RecipeList from '@/components/modules/recipes/RecipeList'

export default function RecipesPage() {
  const router = useRouter()
  return <RecipeList onBack={() => router.push('/dashboard')} />
}
