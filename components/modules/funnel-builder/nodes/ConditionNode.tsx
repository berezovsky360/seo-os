'use client'

import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import type { FunnelConditionNodeData } from '@/lib/modules/funnel-builder/flow-types'

export function ConditionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as FunnelConditionNodeData
  const { updateNodeData } = useReactFlow()

  return (
    <div className={`min-w-[260px] rounded-xl border bg-white shadow-md transition-shadow ${selected ? 'border-orange-400 shadow-lg shadow-orange-100 ring-2 ring-orange-200' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-orange-50 rounded-t-xl">
        <div className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center">
          <GitBranch size={14} className="text-orange-600" />
        </div>
        <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Condition</span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <input
          type="text"
          value={nodeData.field || ''}
          onChange={(e) => updateNodeData(id, { field: e.target.value, label: `If ${e.target.value} ${nodeData.operator} ${nodeData.value}` })}
          placeholder="Field (e.g. opened_email)"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
        />
        <div className="flex gap-2">
          <select
            value={nodeData.operator || 'equals'}
            onChange={(e) => updateNodeData(id, { operator: e.target.value })}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:border-orange-400 outline-none"
          >
            <option value="equals">equals</option>
            <option value="contains">contains</option>
            <option value="gt">greater than</option>
            <option value="lt">less than</option>
          </select>
          <input
            type="text"
            value={nodeData.value || ''}
            onChange={(e) => updateNodeData(id, { value: e.target.value })}
            placeholder="Value"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:border-orange-400 outline-none"
          />
        </div>
      </div>
      {/* Two output handles: true (left) and false (right) */}
      <div className="flex justify-between px-8 pb-1">
        <span className="text-[9px] text-emerald-500 font-bold">YES</span>
        <span className="text-[9px] text-red-400 font-bold">NO</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%' }} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white" />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%' }} className="!bg-red-400 !w-3 !h-3 !border-2 !border-white" />
    </div>
  )
}
