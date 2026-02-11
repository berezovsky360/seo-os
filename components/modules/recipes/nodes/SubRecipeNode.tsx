'use client'

import { useState, useEffect } from 'react'
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { Workflow, Loader2 } from 'lucide-react'
import type { SubRecipeNodeData } from '@/lib/modules/recipes/flow-types'

interface RecipeOption {
  id: string
  name: string
  description: string | null
}

export function SubRecipeNode({ id, data, selected }: NodeProps) {
  const nodeData = data as SubRecipeNodeData
  const { updateNodeData } = useReactFlow()
  const [recipes, setRecipes] = useState<RecipeOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/core/recipes')
      .then(res => res.json())
      .then((data: RecipeOption[]) => {
        setRecipes(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const selectedRecipe = recipes.find(r => r.id === nodeData.recipe_id)

  return (
    <div className={`min-w-[260px] rounded-xl border bg-white shadow-md transition-shadow ${selected ? 'border-cyan-400 shadow-lg shadow-cyan-100 ring-2 ring-cyan-200' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-cyan-50 rounded-t-xl">
        <div className="w-6 h-6 rounded-md bg-cyan-100 flex items-center justify-center">
          <Workflow size={14} className="text-cyan-600" />
        </div>
        <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">
          {selectedRecipe ? selectedRecipe.name : 'Sub-Recipe'}
        </span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block font-medium">Recipe</label>
          {loading ? (
            <div className="flex items-center gap-2 py-1.5 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              Loading recipes...
            </div>
          ) : (
            <select
              value={nodeData.recipe_id || ''}
              onChange={(e) => {
                const recipe = recipes.find(r => r.id === e.target.value)
                updateNodeData(id, {
                  recipe_id: e.target.value,
                  recipe_name: recipe?.name || '',
                  label: recipe ? `sub:${recipe.name}` : 'Sub-Recipe',
                })
              }}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 outline-none cursor-pointer focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="">Choose a recipe...</option>
              {recipes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}
        </div>
        {selectedRecipe?.description && (
          <p className="text-[10px] text-gray-400 leading-relaxed">{selectedRecipe.description}</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  )
}
