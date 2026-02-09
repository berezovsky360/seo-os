'use client';

import React, { useState } from 'react';
import {
  X, Plus, Trash2, ChevronDown, Zap, ArrowDown,
  Loader2, Save, GripVertical, AlertCircle
} from 'lucide-react';
import type { EventType, ModuleId } from '@/lib/core/events';

// Trigger event options grouped by module
const TRIGGER_EVENTS: { group: string; events: { value: EventType; label: string }[] }[] = [
  {
    group: 'Rank Pulse',
    events: [
      { value: 'rank.position_dropped', label: 'Position Dropped' },
      { value: 'rank.position_improved', label: 'Position Improved' },
      { value: 'rank.check_completed', label: 'Rank Check Completed' },
      { value: 'rank.new_competitor', label: 'New Competitor Found' },
      { value: 'rank.serp_structure_changed', label: 'SERP Structure Changed' },
    ],
  },
  {
    group: 'GSC Insights',
    events: [
      { value: 'gsc.low_ctr_found', label: 'Low CTR Found' },
      { value: 'gsc.impressions_spike', label: 'Impressions Spike' },
      { value: 'gsc.keyword_discovered', label: 'New Keyword Discovered' },
      { value: 'gsc.data_synced', label: 'GSC Data Synced' },
    ],
  },
  {
    group: 'Gemini Architect',
    events: [
      { value: 'content.analysis_completed', label: 'Content Analysis Completed' },
      { value: 'content.semantic_gap_found', label: 'Semantic Gap Found' },
      { value: 'content.faq_generated', label: 'FAQ Generated' },
      { value: 'content.rewrite_ready', label: 'Content Rewrite Ready' },
      { value: 'content.title_suggestions_ready', label: 'Title Suggestions Ready' },
    ],
  },
  {
    group: 'RankMath Bridge',
    events: [
      { value: 'bridge.sync_completed', label: 'WP Sync Completed' },
      { value: 'bridge.metadata_pushed', label: 'Metadata Pushed' },
      { value: 'bridge.bulk_push_completed', label: 'Bulk Push Completed' },
      { value: 'bridge.draft_created', label: 'Draft Created' },
    ],
  },
];

// Available actions grouped by module
const MODULE_ACTIONS: { module: ModuleId; moduleName: string; actions: { id: string; name: string }[] }[] = [
  {
    module: 'rankmath-bridge',
    moduleName: 'RankMath Bridge',
    actions: [
      { id: 'sync_site', name: 'Sync Posts from WP' },
      { id: 'push_metadata', name: 'Push Metadata to WP' },
      { id: 'bulk_push', name: 'Bulk Update Metadata' },
      { id: 'create_draft', name: 'Create WP Draft' },
    ],
  },
  {
    module: 'gemini-architect',
    moduleName: 'Gemini Architect',
    actions: [
      { id: 'analyze_content', name: 'Analyze Content' },
      { id: 'find_semantic_gaps', name: 'Find Semantic Gaps' },
      { id: 'generate_faq', name: 'Generate FAQ Section' },
      { id: 'generate_titles', name: 'Generate Title Suggestions' },
      { id: 'analyze_title', name: 'Analyze Title' },
    ],
  },
  {
    module: 'rank-pulse',
    moduleName: 'Rank Pulse',
    actions: [
      { id: 'check_positions', name: 'Check Positions' },
      { id: 'snapshot_serp', name: 'Take SERP Snapshot' },
    ],
  },
  {
    module: 'gsc-insights',
    moduleName: 'GSC Insights',
    actions: [
      { id: 'sync_data', name: 'Sync GSC Data' },
      { id: 'find_low_ctr', name: 'Find Low CTR Pages' },
      { id: 'check_impressions', name: 'Check Impressions' },
    ],
  },
];

// Condition operators
const CONDITION_OPERATORS = [
  { prefix: 'min_', label: 'Minimum', description: 'Value must be >= threshold' },
  { prefix: 'max_', label: 'Maximum', description: 'Value must be <= threshold' },
  { prefix: 'equals_', label: 'Equals', description: 'Value must equal' },
  { prefix: 'contains_', label: 'Contains', description: 'Value must contain text' },
];

interface RecipeAction {
  module: string;
  action: string;
  params: Record<string, any>;
}

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface RecipeEditorProps {
  initialData?: {
    id?: string;
    name: string;
    description: string;
    trigger_event: string;
    trigger_conditions: Record<string, any>;
    actions: RecipeAction[];
    site_ids: string[] | null;
  };
  onSave: (data: {
    name: string;
    description: string;
    trigger_event: string;
    trigger_conditions: Record<string, any>;
    actions: RecipeAction[];
    site_ids: string[] | null;
  }) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export default function RecipeEditor({ initialData, onSave, onCancel, isSaving }: RecipeEditorProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [triggerEvent, setTriggerEvent] = useState(initialData?.trigger_event || '');
  const [actions, setActions] = useState<RecipeAction[]>(
    initialData?.actions || [{ module: '', action: '', params: {} }]
  );

  // Parse initial conditions into UI state
  const parseConditions = (conditions: Record<string, any>): Condition[] => {
    const result: Condition[] = [];
    for (const [key, val] of Object.entries(conditions)) {
      let operator = '';
      let field = key;
      for (const op of CONDITION_OPERATORS) {
        if (key.startsWith(op.prefix)) {
          operator = op.prefix;
          field = key.slice(op.prefix.length);
          break;
        }
      }
      result.push({
        id: Math.random().toString(36).slice(2),
        field,
        operator: operator || 'equals_',
        value: String(val),
      });
    }
    return result;
  };

  const [conditions, setConditions] = useState<Condition[]>(
    initialData?.trigger_conditions
      ? parseConditions(initialData.trigger_conditions)
      : []
  );

  // Build conditions object from UI state
  const buildConditions = (): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const c of conditions) {
      if (!c.field || !c.value) continue;
      const key = `${c.operator}${c.field}`;
      // Try to parse as number
      const numVal = Number(c.value);
      result[key] = isNaN(numVal) ? c.value : numVal;
    }
    return result;
  };

  const addCondition = () => {
    setConditions([...conditions, { id: Math.random().toString(36).slice(2), field: '', operator: 'min_', value: '' }]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const addAction = () => {
    setActions([...actions, { module: '', action: '', params: {} }]);
  };

  const removeAction = (index: number) => {
    if (actions.length <= 1) return;
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, updates: Partial<RecipeAction>) => {
    setActions(actions.map((a, i) => i === index ? { ...a, ...updates } : a));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !triggerEvent) return;

    const validActions = actions.filter(a => a.module && a.action);
    if (validActions.length === 0) return;

    await onSave({
      name: name.trim(),
      description: description.trim(),
      trigger_event: triggerEvent,
      trigger_conditions: buildConditions(),
      actions: validActions,
      site_ids: null,
    });
  };

  const getActionsForModule = (moduleId: string) => {
    return MODULE_ACTIONS.find(m => m.module === moduleId)?.actions || [];
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">
          {initialData?.id ? 'Edit Recipe' : 'New Recipe'}
        </h2>
        <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <X size={18} />
        </button>
      </div>

      <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Name + Description */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Recipe Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Low CTR Rescue"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this recipe do?"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Trigger Event */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-amber-100 rounded-md flex items-center justify-center">
              <Zap size={12} className="text-amber-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">When this happens...</span>
          </div>
          <select
            value={triggerEvent}
            onChange={(e) => setTriggerEvent(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Select trigger event</option>
            {TRIGGER_EVENTS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.events.map((evt) => (
                  <option key={evt.value} value={evt.value}>{evt.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Conditions */}
        {triggerEvent && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                  <AlertCircle size={12} className="text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-gray-900">Only if... (optional)</span>
              </div>
              <button
                onClick={addCondition}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <Plus size={12} />
                Add Condition
              </button>
            </div>

            {conditions.length === 0 ? (
              <p className="text-xs text-gray-400 italic ml-8">No conditions — recipe will trigger on every matching event.</p>
            ) : (
              <div className="space-y-2 ml-8">
                {conditions.map((cond) => (
                  <div key={cond.id} className="flex items-center gap-2">
                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(cond.id, { operator: e.target.value })}
                      className="px-2.5 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {CONDITION_OPERATORS.map(op => (
                        <option key={op.prefix} value={op.prefix}>{op.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={cond.field}
                      onChange={(e) => updateCondition(cond.id, { field: e.target.value })}
                      placeholder="field (e.g., drop, position, ctr)"
                      className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={cond.value}
                      onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                      placeholder="value"
                      className="w-24 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => removeCondition(cond.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions Chain */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-100 rounded-md flex items-center justify-center">
                <ArrowDown size={12} className="text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Then do this...</span>
            </div>
            <button
              onClick={addAction}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Plus size={12} />
              Add Step
            </button>
          </div>

          <div className="space-y-3 ml-8">
            {actions.map((action, index) => (
              <div key={index}>
                {index > 0 && (
                  <div className="flex items-center gap-2 my-2 ml-4">
                    <ArrowDown size={12} className="text-gray-300" />
                    <span className="text-[10px] text-gray-400 font-medium">then</span>
                  </div>
                )}
                <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="mt-1 text-gray-300 cursor-grab">
                    <GripVertical size={14} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">{index + 1}</span>
                      <select
                        value={action.module}
                        onChange={(e) => updateAction(index, { module: e.target.value, action: '', params: {} })}
                        className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select module</option>
                        {MODULE_ACTIONS.map(m => (
                          <option key={m.module} value={m.module}>{m.moduleName}</option>
                        ))}
                      </select>
                    </div>
                    {action.module && (
                      <select
                        value={action.action}
                        onChange={(e) => updateAction(index, { action: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select action</option>
                        {getActionsForModule(action.module).map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {actions.length > 1 && (
                    <button
                      onClick={() => removeAction(index)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded mt-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSaving || !name.trim() || !triggerEvent || actions.every(a => !a.module || !a.action)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {initialData?.id ? 'Update Recipe' : 'Create Recipe'}
        </button>
      </div>
    </div>
  );
}
