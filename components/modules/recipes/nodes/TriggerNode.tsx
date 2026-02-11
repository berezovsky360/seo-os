'use client'

import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { Zap } from 'lucide-react'
import type { TriggerNodeData } from '@/lib/modules/recipes/flow-types'

const TRIGGER_EVENTS = [
  {
    group: 'Schedule',
    events: [
      { value: 'cron.job_executed', label: 'Cron Job Executed' },
    ],
  },
  {
    group: 'Content Engine',
    events: [
      { value: 'engine.feed_polled', label: 'RSS Feed Polled' },
      { value: 'engine.items_scored', label: 'Items Scored' },
      { value: 'engine.facts_extracted', label: 'Facts Extracted' },
      { value: 'engine.facts_checked', label: 'Facts Checked' },
      { value: 'engine.items_clustered', label: 'Items Clustered' },
      { value: 'engine.sections_generated', label: 'Sections Generated' },
      { value: 'engine.article_assembled', label: 'Article Assembled' },
      { value: 'engine.article_published', label: 'Article Published' },
      { value: 'engine.pipeline_completed', label: 'Pipeline Completed' },
      { value: 'engine.pipeline_failed', label: 'Pipeline Failed' },
    ],
  },
  {
    group: 'Rank Tracking',
    events: [
      { value: 'rank.check_completed', label: 'Position Check Done' },
      { value: 'rank.position_dropped', label: 'Position Dropped' },
      { value: 'rank.position_improved', label: 'Position Improved' },
      { value: 'rank.new_competitor', label: 'New Competitor Found' },
    ],
  },
  {
    group: 'Search Console',
    events: [
      { value: 'gsc.data_synced', label: 'GSC Data Synced' },
      { value: 'gsc.low_ctr_found', label: 'Low CTR Found' },
      { value: 'gsc.impressions_spike', label: 'Impressions Spike' },
      { value: 'gsc.keyword_discovered', label: 'New Keyword Discovered' },
    ],
  },
  {
    group: 'Content & SEO',
    events: [
      { value: 'content.analysis_completed', label: 'Content Analysis Done' },
      { value: 'content.semantic_gap_found', label: 'Semantic Gap Found' },
      { value: 'content.title_generated', label: 'Title Generated' },
      { value: 'bridge.sync_completed', label: 'RankMath Sync Done' },
      { value: 'bridge.metadata_pushed', label: 'Metadata Pushed' },
    ],
  },
  {
    group: 'Media & AI',
    events: [
      { value: 'banana.pipeline_completed', label: 'Image Pipeline Done' },
      { value: 'banana.image_generated', label: 'Image Generated' },
      { value: 'writer.title_generated', label: 'AI Title Generated' },
      { value: 'writer.content_generated', label: 'AI Content Generated' },
      { value: 'persona.created', label: 'Persona Created' },
      { value: 'persona.updated', label: 'Persona Updated' },
    ],
  },
  {
    group: 'Competitor Analysis',
    events: [
      { value: 'competitor.analysis_completed', label: 'Competitor Analysis Done' },
      { value: 'competitor.new_threat', label: 'New Competitor Threat' },
      { value: 'competitor.keyword_gap_found', label: 'Keyword Gap Found' },
    ],
  },
  {
    group: 'Sub-Recipes',
    events: [
      { value: 'recipe.sub_recipe_started', label: 'Sub-Recipe Started' },
      { value: 'recipe.sub_recipe_completed', label: 'Sub-Recipe Completed' },
    ],
  },
]

export function TriggerNode({ id, data, selected }: NodeProps) {
  const nodeData = data as TriggerNodeData
  const { updateNodeData } = useReactFlow()

  // Find display label for current event
  const eventLabel = TRIGGER_EVENTS
    .flatMap(g => g.events)
    .find(e => e.value === nodeData.event)?.label

  return (
    <div className={`min-w-[260px] rounded-xl border bg-white shadow-md transition-shadow ${selected ? 'border-amber-400 shadow-lg shadow-amber-100 ring-2 ring-amber-200' : 'border-gray-200'}`}>
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-amber-50 rounded-t-xl">
        <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center">
          <Zap size={14} className="text-amber-600" />
        </div>
        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">When this happens</span>
      </div>
      <div className="px-4 py-3">
        <select
          value={nodeData.event || ''}
          onChange={(e) => updateNodeData(id, { event: e.target.value, label: `On: ${e.target.value}` })}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none cursor-pointer"
        >
          <option value="">Choose a trigger event...</option>
          {TRIGGER_EVENTS.map(group => (
            <optgroup key={group.group} label={group.group}>
              {group.events.map(evt => (
                <option key={evt.value} value={evt.value}>{evt.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {eventLabel && (
          <div className="mt-2 text-[10px] text-amber-600/70 px-1">
            Event: {nodeData.event}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  )
}
