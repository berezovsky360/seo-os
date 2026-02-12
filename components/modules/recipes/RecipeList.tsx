'use client';

import React, { useState } from 'react';
import {
  BookOpen, Plus, ChevronLeft, Zap, ArrowRight, Trash2,
  ToggleLeft, ToggleRight, Loader2, Clock, Hash,
  Store, Share2, FileJson, Settings
} from 'lucide-react';
import { useRecipes, useCreateRecipe, useUpdateRecipe, useDeleteRecipe } from '@/hooks/useRecipes';
import { useToast } from '@/lib/contexts/ToastContext';
import RecipeEditor from './RecipeEditor';
import RecipeFlowEditor from './RecipeFlowEditor';
import RecipeMarketplace from './RecipeMarketplace';
import ShareRecipeModal from './ShareRecipeModal';
import ImportRecipeModal from './ImportRecipeModal';
import { ALL_MODULES, MODULE_STYLES, RECIPE_MODULES_STORAGE_KEY } from './nodes/ActionNode';
import type { Recipe } from '@/lib/core/events';

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
  const [showFlowEditor, setShowFlowEditor] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [sharingRecipe, setSharingRecipe] = useState<Recipe | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState<'recipes' | 'settings'>('recipes');
  const [enabledModules, setEnabledModules] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ALL_MODULES.map(m => m.id);
    try {
      const stored = localStorage.getItem(RECIPE_MODULES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : ALL_MODULES.map(m => m.id);
    } catch {
      return ALL_MODULES.map(m => m.id);
    }
  });

  const toggleModule = (moduleId: string) => {
    setEnabledModules(prev => {
      const next = prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId];
      localStorage.setItem(RECIPE_MODULES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleAllModules = () => {
    const next = enabledModules.length === ALL_MODULES.length ? [] : ALL_MODULES.map(m => m.id);
    setEnabledModules(next);
    localStorage.setItem(RECIPE_MODULES_STORAGE_KEY, JSON.stringify(next));
  };

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

  const startFlowEdit = (recipe: Recipe | null) => {
    setEditingRecipe(recipe);
    setShowFlowEditor(true);
  };

  const handleFlowSave = async (data: any) => {
    if (editingRecipe?.id) {
      await handleUpdate(data);
    } else {
      await handleCreate(data);
    }
    setShowFlowEditor(false);
    setEditingRecipe(null);
  };

  const formatEventType = (type: string) => {
    const action = type.split('.').slice(1).join('.');
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatModuleAction = (module: string, action: string) => {
    return `${module.replace(/-/g, ' ')} → ${action.replace(/_/g, ' ')}`;
  };

  // Visual Flow Editor overlay
  if (showFlowEditor) {
    return (
      <RecipeFlowEditor
        recipe={editingRecipe}
        onSave={handleFlowSave}
        onClose={() => { setShowFlowEditor(false); setEditingRecipe(null); }}
        isSaving={createRecipe.isPending || updateRecipe.isPending}
      />
    );
  }

  // Form Editor overlay
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
      <div className="flex justify-between items-center px-8 py-5 bg-[#F5F5F7] border-b border-gray-200 sticky top-0 z-10">
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
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('recipes')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'recipes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Recipes ({recipes.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'settings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Settings size={12} />
              Modules
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMarketplace(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-indigo-200 transition-colors"
          >
            <Store size={14} />
            Browse Templates
          </button>

          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <FileJson size={14} />
            Import
          </button>

          <button
            onClick={() => startFlowEdit(null)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
          >
            <Plus size={14} />
            New Recipe
          </button>
        </div>
      </div>

      <div className="p-8">
        {activeTab === 'settings' ? (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Module Visibility</h2>
              <p className="text-sm text-gray-500">Choose which modules appear in the Action node dropdown. Disabling unused modules simplifies the editor.</p>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">{enabledModules.length} of {ALL_MODULES.length} modules enabled</span>
              <button
                onClick={toggleAllModules}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                {enabledModules.length === ALL_MODULES.length ? 'Disable all' : 'Enable all'}
              </button>
            </div>
            <div className="space-y-2">
              {ALL_MODULES.map(mod => {
                const isEnabled = enabledModules.includes(mod.id);
                const style = MODULE_STYLES[mod.id];
                const IconComponent = style?.icon;
                return (
                  <div
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      isEnabled
                        ? 'bg-white border-gray-200 shadow-sm hover:shadow-md'
                        : 'bg-gray-50 border-gray-100 opacity-60 hover:opacity-80'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${style?.iconBg || 'bg-gray-100'}`}>
                      {IconComponent && <IconComponent size={18} className={style?.iconColor || 'text-gray-500'} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{mod.label}</p>
                      <p className="text-xs text-gray-400">{mod.actions.length} actions</p>
                    </div>
                    <div className="flex-shrink-0">
                      {isEnabled ? (
                        <ToggleRight size={24} className="text-indigo-600" />
                      ) : (
                        <ToggleLeft size={24} className="text-gray-300" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : isLoading ? (
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
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowMarketplace(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 text-sm font-semibold rounded-xl border-2 border-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                <Store size={16} />
                Browse Templates
              </button>
              <button
                onClick={() => startFlowEdit(null)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
              >
                <Plus size={16} />
                Create From Scratch
              </button>
            </div>
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
                          onClick={() => startFlowEdit(recipe)}
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
                    <div className="flex items-center gap-1.5 ml-4">
                      <button
                        onClick={() => setSharingRecipe(recipe)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Share recipe"
                      >
                        <Share2 size={14} />
                      </button>
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

      {/* Modals */}
      {showMarketplace && (
        <RecipeMarketplace
          onClose={() => setShowMarketplace(false)}
          onInstalled={() => setShowMarketplace(false)}
        />
      )}
      {sharingRecipe && (
        <ShareRecipeModal
          recipe={sharingRecipe}
          onClose={() => setSharingRecipe(null)}
        />
      )}
      {showImport && (
        <ImportRecipeModal
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
