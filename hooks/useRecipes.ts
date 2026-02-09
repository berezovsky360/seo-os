'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { coreService } from '@/lib/services/coreService'
import type { Recipe } from '@/lib/core/events'

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: () => coreService.getRecipes(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (recipe: Parameters<typeof coreService.createRecipe>[0]) =>
      coreService.createRecipe(recipe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ recipeId, updates }: { recipeId: string; updates: Partial<Recipe> }) =>
      coreService.updateRecipe(recipeId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (recipeId: string) => coreService.deleteRecipe(recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
