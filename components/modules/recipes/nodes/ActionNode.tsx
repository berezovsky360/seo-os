'use client'

import { useMemo } from 'react'
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { Play, Newspaper, Brain, Shield, BarChart3, LineChart, Image, PenTool, Users, Swords } from 'lucide-react'
import type { ActionNodeData } from '@/lib/modules/recipes/flow-types'

// Full explicit classes — Tailwind purge needs static strings
export const MODULE_STYLES: Record<string, {
  icon: React.ComponentType<any>
  iconColor: string; iconBg: string; headerBg: string
  labelColor: string; handleBg: string
  selectedBorder: string; selectedShadow: string; selectedRing: string
}> = {
  'content-engine':      { icon: Newspaper,  iconColor: 'text-amber-600',   iconBg: 'bg-amber-100',   headerBg: 'bg-amber-50',   labelColor: 'text-amber-700',   handleBg: '!bg-amber-500',   selectedBorder: 'border-amber-400',   selectedShadow: 'shadow-amber-100',   selectedRing: 'ring-amber-200' },
  'gemini-architect':    { icon: Brain,      iconColor: 'text-violet-600',  iconBg: 'bg-violet-100',  headerBg: 'bg-violet-50',  labelColor: 'text-violet-700',  handleBg: '!bg-violet-500',  selectedBorder: 'border-violet-400',  selectedShadow: 'shadow-violet-100',  selectedRing: 'ring-violet-200' },
  'rankmath-bridge':     { icon: Shield,     iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100', headerBg: 'bg-emerald-50', labelColor: 'text-emerald-700', handleBg: '!bg-emerald-500', selectedBorder: 'border-emerald-400', selectedShadow: 'shadow-emerald-100', selectedRing: 'ring-emerald-200' },
  'rank-pulse':          { icon: BarChart3,  iconColor: 'text-orange-600',  iconBg: 'bg-orange-100',  headerBg: 'bg-orange-50',  labelColor: 'text-orange-700',  handleBg: '!bg-orange-500',  selectedBorder: 'border-orange-400',  selectedShadow: 'shadow-orange-100',  selectedRing: 'ring-orange-200' },
  'gsc-insights':        { icon: LineChart,  iconColor: 'text-blue-600',    iconBg: 'bg-blue-100',    headerBg: 'bg-blue-50',    labelColor: 'text-blue-700',    handleBg: '!bg-blue-500',    selectedBorder: 'border-blue-400',    selectedShadow: 'shadow-blue-100',    selectedRing: 'ring-blue-200' },
  'nana-banana':         { icon: Image,      iconColor: 'text-pink-600',    iconBg: 'bg-pink-100',    headerBg: 'bg-pink-50',    labelColor: 'text-pink-700',    handleBg: '!bg-pink-500',    selectedBorder: 'border-pink-400',    selectedShadow: 'shadow-pink-100',    selectedRing: 'ring-pink-200' },
  'ai-writer':           { icon: PenTool,    iconColor: 'text-indigo-600',  iconBg: 'bg-indigo-100',  headerBg: 'bg-indigo-50',  labelColor: 'text-indigo-700',  handleBg: '!bg-indigo-500',  selectedBorder: 'border-indigo-400',  selectedShadow: 'shadow-indigo-100',  selectedRing: 'ring-indigo-200' },
  'personas':            { icon: Users,      iconColor: 'text-cyan-600',    iconBg: 'bg-cyan-100',    headerBg: 'bg-cyan-50',    labelColor: 'text-cyan-700',    handleBg: '!bg-cyan-500',    selectedBorder: 'border-cyan-400',    selectedShadow: 'shadow-cyan-100',    selectedRing: 'ring-cyan-200' },
  'competitor-analysis': { icon: Swords,     iconColor: 'text-red-600',     iconBg: 'bg-red-100',     headerBg: 'bg-red-50',     labelColor: 'text-red-700',     handleBg: '!bg-red-500',     selectedBorder: 'border-red-400',     selectedShadow: 'shadow-red-100',     selectedRing: 'ring-red-200' },
}

export const RECIPE_MODULES_STORAGE_KEY = 'recipe-enabled-modules'

export const ALL_MODULES: { id: string; label: string; actions: { id: string; label: string }[] }[] = [
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

function getEnabledModules() {
  if (typeof window === 'undefined') return ALL_MODULES
  try {
    const stored = localStorage.getItem(RECIPE_MODULES_STORAGE_KEY)
    if (!stored) return ALL_MODULES
    const enabled: string[] = JSON.parse(stored)
    return ALL_MODULES.filter(m => enabled.includes(m.id))
  } catch {
    return ALL_MODULES
  }
}

export function ActionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ActionNodeData
  const { updateNodeData } = useReactFlow()

  const visibleModules = useMemo(() => getEnabledModules(), [])
  const selectedModule = ALL_MODULES.find(m => m.id === nodeData.module)
  const actions = selectedModule?.actions || []
  const selectedAction = actions.find(a => a.id === nodeData.action)

  const s = nodeData.module ? MODULE_STYLES[nodeData.module] : null
  const IconComponent = s?.icon || Play

  return (
    <div className={`min-w-[260px] rounded-xl border bg-white shadow-md transition-shadow ${selected ? `${s?.selectedBorder || 'border-emerald-400'} shadow-lg ${s?.selectedShadow || 'shadow-emerald-100'} ring-2 ${s?.selectedRing || 'ring-emerald-200'}` : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className={`!w-3 !h-3 !border-2 !border-white ${s?.handleBg || '!bg-emerald-500'}`} />
      <div className={`px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 ${s?.headerBg || 'bg-emerald-50'} rounded-t-xl`}>
        <div className={`w-6 h-6 rounded-md ${s?.iconBg || 'bg-emerald-100'} flex items-center justify-center`}>
          <IconComponent size={14} className={s?.iconColor || 'text-emerald-600'} />
        </div>
        <span className={`text-xs font-bold uppercase tracking-wider ${s?.labelColor || 'text-emerald-700'}`}>
          {selectedAction ? selectedAction.label : selectedModule ? selectedModule.label : 'Do this'}
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
            {visibleModules.map(mod => (
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
      <Handle type="source" position={Position.Bottom} className={`!w-3 !h-3 !border-2 !border-white ${s?.handleBg || '!bg-emerald-500'}`} />
    </div>
  )
}
