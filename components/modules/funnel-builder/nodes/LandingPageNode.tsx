'use client'

import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { Globe } from 'lucide-react'
import type { LandingPageNodeData } from '@/lib/modules/funnel-builder/flow-types'

export function LandingPageNode({ id, data, selected }: NodeProps) {
  const nodeData = data as LandingPageNodeData
  const { updateNodeData } = useReactFlow()

  return (
    <div className={`min-w-[260px] rounded-xl border bg-white shadow-md transition-shadow ${selected ? 'border-indigo-400 shadow-lg shadow-indigo-100 ring-2 ring-indigo-200' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-indigo-50 rounded-t-xl">
        <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
          <Globe size={14} className="text-indigo-600" />
        </div>
        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Landing Page</span>
        {nodeData.stats?.views !== undefined && (
          <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold">
            {nodeData.stats.views} views
          </span>
        )}
      </div>
      <div className="px-4 py-3">
        <input
          type="text"
          value={nodeData.pageName || ''}
          onChange={(e) => updateNodeData(id, { pageName: e.target.value, label: e.target.value || 'Landing Page' })}
          placeholder="Page name or ID..."
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
        />
        <input
          type="text"
          value={nodeData.pageId || ''}
          onChange={(e) => updateNodeData(id, { pageId: e.target.value })}
          placeholder="Page ID (UUID)..."
          className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none font-mono"
        />
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  )
}
