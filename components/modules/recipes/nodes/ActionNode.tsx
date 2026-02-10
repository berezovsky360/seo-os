'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Play } from 'lucide-react'
import type { ActionNodeData } from '@/lib/modules/recipes/flow-types'

const MODULE_ACTIONS: Record<string, string[]> = {
  'gemini-architect': ['analyze_content', 'analyze_title', 'generate_titles', 'find_semantic_gaps', 'generate_faq', 'generate_rewrite'],
  'rankmath-bridge': ['push_metadata', 'create_draft', 'bulk_push'],
  'rank-pulse': ['check_positions', 'snapshot_serp'],
  'gsc-insights': ['sync_data', 'check_impressions', 'find_opportunities'],
  'nana-banana': ['generate_prompt', 'generate_image', 'run_pipeline'],
  'ai-writer': ['generate_title', 'generate_description', 'generate_content'],
  'personas': ['get_persona', 'get_context'],
}

export function ActionNode({ data, selected }: NodeProps) {
  const nodeData = data as ActionNodeData
  const actions = nodeData.module ? (MODULE_ACTIONS[nodeData.module] || []) : []

  return (
    <div className={`min-w-[240px] rounded-xl border-2 shadow-lg bg-gray-900 ${selected ? 'border-emerald-400 shadow-emerald-500/20' : 'border-gray-700'}`}>
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-gray-900" />
      <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
          <Play size={14} className="text-emerald-400" />
        </div>
        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Action</span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <select
          value={nodeData.module || ''}
          onChange={() => {}}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
        >
          <option value="">Select module...</option>
          {Object.keys(MODULE_ACTIONS).map(mod => (
            <option key={mod} value={mod}>{mod}</option>
          ))}
        </select>
        {nodeData.module && (
          <select
            value={nodeData.action || ''}
            onChange={() => {}}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          >
            <option value="">Select action...</option>
            {actions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-gray-900" />
    </div>
  )
}
