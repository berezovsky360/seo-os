'use client'

import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { Play } from 'lucide-react'
import type { ActionNodeData } from '@/lib/modules/recipes/flow-types'

const MODULES: { id: string; label: string; actions: { id: string; label: string }[] }[] = [
  {
    id: 'content-engine',
    label: 'Content Engine',
    actions: [
      { id: 'poll_feed', label: 'Poll Single Feed' },
      { id: 'poll_all_feeds', label: 'Poll All RSS Feeds' },
      { id: 'score_batch', label: 'Score Items (SEO + Viral)' },
      { id: 'extract_facts', label: 'Extract Facts & Keywords' },
      { id: 'fact_check', label: 'Fact-Check via SERP' },
      { id: 'cluster_items', label: 'Cluster Similar Items' },
      { id: 'generate_all_sections', label: 'Generate Article Sections' },
      { id: 'assemble_article', label: 'Assemble Final Article' },
      { id: 'publish_to_wp', label: 'Publish to WordPress' },
      { id: 'run_full_pipeline', label: 'Run Full Pipeline' },
    ],
  },
  {
    id: 'gemini-architect',
    label: 'Gemini Architect',
    actions: [
      { id: 'analyze_content', label: 'Analyze Content' },
      { id: 'analyze_title', label: 'Analyze Title' },
      { id: 'generate_titles', label: 'Generate Title Variants' },
      { id: 'find_semantic_gaps', label: 'Find Semantic Gaps' },
      { id: 'generate_faq', label: 'Generate FAQ' },
      { id: 'generate_rewrite', label: 'Generate Rewrite' },
    ],
  },
  {
    id: 'rankmath-bridge',
    label: 'RankMath Bridge',
    actions: [
      { id: 'push_metadata', label: 'Push SEO Metadata' },
      { id: 'create_draft', label: 'Create WP Draft' },
      { id: 'bulk_push', label: 'Bulk Push Metadata' },
    ],
  },
  {
    id: 'rank-pulse',
    label: 'Rank Pulse',
    actions: [
      { id: 'check_positions', label: 'Check Keyword Positions' },
      { id: 'snapshot_serp', label: 'Take SERP Snapshot' },
    ],
  },
  {
    id: 'gsc-insights',
    label: 'GSC Insights',
    actions: [
      { id: 'sync_data', label: 'Sync GSC Data' },
      { id: 'check_impressions', label: 'Check Impressions' },
      { id: 'find_opportunities', label: 'Find Opportunities' },
    ],
  },
  {
    id: 'nana-banana',
    label: 'Nana Banana',
    actions: [
      { id: 'generate_prompt', label: 'Generate Image Prompt' },
      { id: 'generate_image', label: 'Generate Image' },
      { id: 'run_pipeline', label: 'Run Image Pipeline' },
    ],
  },
  {
    id: 'ai-writer',
    label: 'AI Writer',
    actions: [
      { id: 'generate_title', label: 'Generate Title' },
      { id: 'generate_description', label: 'Generate Description' },
      { id: 'generate_content', label: 'Generate Content' },
    ],
  },
  {
    id: 'personas',
    label: 'Personas',
    actions: [
      { id: 'get_persona', label: 'Get Persona Profile' },
      { id: 'get_context', label: 'Get Persona Context' },
    ],
  },
  {
    id: 'competitor-analysis',
    label: 'Competitor Analysis',
    actions: [
      { id: 'run_analysis', label: 'Run Competitor Analysis' },
      { id: 'check_keyword_gaps', label: 'Check Keyword Gaps' },
      { id: 'compare_rankings', label: 'Compare Rankings' },
    ],
  },
]

export function ActionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ActionNodeData
  const { updateNodeData } = useReactFlow()

  const selectedModule = MODULES.find(m => m.id === nodeData.module)
  const actions = selectedModule?.actions || []
  const selectedAction = actions.find(a => a.id === nodeData.action)

  return (
    <div className={`min-w-[260px] rounded-xl border bg-white shadow-md transition-shadow ${selected ? 'border-emerald-400 shadow-lg shadow-emerald-100 ring-2 ring-emerald-200' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-emerald-50 rounded-t-xl">
        <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
          <Play size={14} className="text-emerald-600" />
        </div>
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
          {selectedAction ? selectedAction.label : 'Do this'}
        </span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block font-medium">Module</label>
          <select
            value={nodeData.module || ''}
            onChange={(e) => updateNodeData(id, { module: e.target.value, action: '', label: `${e.target.value}.?` })}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 outline-none cursor-pointer focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">Choose a module...</option>
            {MODULES.map(mod => (
              <option key={mod.id} value={mod.id}>{mod.label}</option>
            ))}
          </select>
        </div>
        {nodeData.module && (
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block font-medium">Action</label>
            <select
              value={nodeData.action || ''}
              onChange={(e) => updateNodeData(id, { action: e.target.value, label: `${nodeData.module}.${e.target.value}` })}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 outline-none cursor-pointer focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Choose an action...</option>
              {actions.map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  )
}
