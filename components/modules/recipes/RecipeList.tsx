'use client';

import React, { useState } from 'react';
import {
  BookOpen, Plus, ChevronLeft, Zap, ArrowRight, Trash2,
  ToggleLeft, ToggleRight, Loader2, Clock, Hash, ChevronDown
} from 'lucide-react';
import { useRecipes, useCreateRecipe, useUpdateRecipe, useDeleteRecipe } from '@/hooks/useRecipes';
import { useToast } from '@/lib/contexts/ToastContext';
import RecipeEditor from './RecipeEditor';
import type { Recipe } from '@/lib/core/events';

// Pre-built recipe templates
const RECIPE_TEMPLATES = [
  {
    name: 'Low CTR Rescue',
    description: 'When a page is in TOP-3 but CTR < 2%, analyze title and generate alternatives.',
    trigger_event: 'gsc.low_ctr_found',
    trigger_conditions: { max_ctr: 2, max_position: 3 },
    actions: [
      { module: 'gemini-architect', action: 'analyze_title', params: {} },
      { module: 'gemini-architect', action: 'generate_titles', params: { count: 3 } },
      { module: 'rankmath-bridge', action: 'create_draft', params: { status: 'draft' } },
    ],
  },
  {
    name: 'Smart Position Rescue',
    description: 'When position drops by 5+, run content analysis and find semantic gaps.',
    trigger_event: 'rank.position_dropped',
    trigger_conditions: { min_drop: 5 },
    actions: [
      { module: 'gsc-insights', action: 'check_impressions', params: {} },
      { module: 'gemini-architect', action: 'analyze_content', params: {} },
      { module: 'gemini-architect', action: 'find_semantic_gaps', params: {} },
    ],
  },
  {
    name: 'New Keyword Alert',
    description: 'When a new keyword is discovered in GSC, sync data and generate FAQ.',
    trigger_event: 'gsc.keyword_discovered',
    trigger_conditions: {},
    actions: [
      { module: 'gemini-architect', action: 'generate_faq', params: { count: 5 } },
    ],
  },
];

interface RecipeListProps {
  onBack?: () => void;
}

export default function RecipeList({ onBack }: RecipeListProps) {
  const { data: recipes = [], isLoading } = useRecipes();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();
  const toast = useToast();

  const [showEditor, setShowEditor] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleCreate = async (data: any) => {
    try {
      await createRecipe.mutateAsync(data);
      toast.success('Recipe created');
      setShowEditor(false);
    } catch {
      toast.error('Failed to create recipe');
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingRecipe) return;
    try {
      await updateRecipe.mutateAsync({ recipeId: editingRecipe.id, updates: data });
      toast.success('Recipe updated');
      setEditingRecipe(null);
      setShowEditor(false);
    } catch {
      toast.error('Failed to update recipe');
    }
  };

  const handleDelete = async (recipeId: string) => {
    if (!window.confirm('Delete this recipe? This cannot be undone.')) return;
    try {
      await deleteRecipe.mutateAsync(recipeId);
      toast.success('Recipe deleted');
    } catch {
      toast.error('Failed to delete recipe');
    }
  };

  const handleToggle = async (recipe: Recipe) => {
    setTogglingId(recipe.id);
    try {
      await updateRecipe.mutateAsync({
        recipeId: recipe.id,
        updates: { enabled: !recipe.enabled },
      });
    } catch {
      toast.error('Failed to toggle recipe');
    } finally {
      setTogglingId(null);
    }
  };

  const handleUseTemplate = (template: typeof RECIPE_TEMPLATES[0]) => {
    setEditingRecipe(null);
    setShowEditor(true);
    setShowTemplates(false);
    // We'll pass the template data as initialData to the editor
    // The editor will open with pre-filled data
    setEditingRecipe({
      id: '',
      user_id: '',
      name: template.name,
      description: template.description,
      enabled: true,
      trigger_event: template.trigger_event as any,
      trigger_conditions: template.trigger_conditions,
      actions: template.actions as Recipe['actions'],
      site_ids: null,
      times_triggered: 0,
      last_triggered_at: null,
      created_at: '',
      updated_at: '',
    });
  };

  const startEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowEditor(true);
  };

  const formatEventType = (type: string) => {
    const action = type.split('.').slice(1).join('.');
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatModuleAction = (module: string, action: string) => {
    return `${module.replace(/-/g, ' ')} → ${action.replace(/_/g, ' ')}`;
  };

  // Editor overlay
  if (showEditor) {
    const isEditing = editingRecipe?.id;
    return (
      <div className="h-full overflow-y-auto bg-gray-50/50 p-8 flex items-start justify-center">
        <RecipeEditor
          initialData={editingRecipe ? {
            id: editingRecipe.id || undefined,
            name: editingRecipe.name,
            description: editingRecipe.description || '',
            trigger_event: editingRecipe.trigger_event,
            trigger_conditions: editingRecipe.trigger_conditions,
            actions: editingRecipe.actions,
            site_ids: editingRecipe.site_ids,
          } : undefined}
          onSave={isEditing ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowEditor(false);
            setEditingRecipe(null);
          }}
          isSaving={createRecipe.isPending || updateRecipe.isPending}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center px-8 py-5 bg-[#F5F6F8] border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          {onBack && (
            <>
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <div className="h-4 w-px bg-gray-300" />
            </>
          )}
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-gray-900" />
            <h1 className="text-lg font-bold text-gray-900">Recipes</h1>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {recipes.length} recipes
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <Zap size={14} />
              Templates
              <ChevronDown size={12} />
            </button>

            {showTemplates && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowTemplates(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-30 overflow-hidden">
                  <div className="p-3 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-500 uppercase">Pre-built Recipes</span>
                  </div>
                  {RECIPE_TEMPLATES.map((tmpl, i) => (
                    <button
                      key={i}
                      onClick={() => handleUseTemplate(tmpl)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="text-sm font-medium text-gray-900">{tmpl.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{tmpl.description}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => { setEditingRecipe(null); setShowEditor(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
          >
            <Plus size={14} />
            New Recipe
          </button>
        </div>
      </div>

      <div className="p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-gray-300" />
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={48} className="text-gray-200 mx-auto mb-4" />
            <h3 className="text-gray-500 font-medium mb-1">No recipes yet</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
              Recipes are automation chains — when an event happens, a sequence of module actions runs automatically.
              Like Zapier, but for SEO.
            </p>
            <button
              onClick={() => { setEditingRecipe(null); setShowEditor(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
            >
              <Plus size={16} />
              Create Your First Recipe
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {(recipes as Recipe[]).map((recipe) => (
              <div
                key={recipe.id}
                className={`bg-white rounded-xl border transition-all ${
                  recipe.enabled ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-60'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3
                          className="font-semibold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors"
                          onClick={() => startEdit(recipe)}
                        >
                          {recipe.name}
                        </h3>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          recipe.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {recipe.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      {recipe.description && (
                        <p className="text-sm text-gray-500 mb-3">{recipe.description}</p>
                      )}

                      {/* Visual flow */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg border border-amber-200">
                          <Zap size={10} />
                          {formatEventType(recipe.trigger_event)}
                        </span>
                        {recipe.actions.map((action, i) => (
                          <React.Fragment key={i}>
                            <ArrowRight size={12} className="text-gray-300" />
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg border border-emerald-200">
                              {formatModuleAction(action.module, action.action)}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Hash size={10} />
                          Triggered {recipe.times_triggered}x
                        </span>
                        {recipe.last_triggered_at && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            Last: {new Date(recipe.last_triggered_at).toLocaleDateString()}
                          </span>
                        )}
                        {Object.keys(recipe.trigger_conditions).length > 0 && (
                          <span className="text-gray-500">
                            {Object.keys(recipe.trigger_conditions).length} condition(s)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleToggle(recipe)}
                        disabled={togglingId === recipe.id}
                        className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                        title={recipe.enabled ? 'Disable' : 'Enable'}
                      >
                        {togglingId === recipe.id ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : recipe.enabled ? (
                          <ToggleRight size={24} className="text-indigo-600" />
                        ) : (
                          <ToggleLeft size={24} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(recipe.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete recipe"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
