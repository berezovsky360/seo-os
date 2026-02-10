'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import type { BranchNodeData } from '@/lib/modules/recipes/flow-types'

export function BranchNode({ data, selected }: NodeProps) {
  const nodeData = data as BranchNodeData

  return (
    <div className={`min-w-[240px] rounded-xl border-2 shadow-lg bg-gray-900 ${selected ? 'border-purple-400 shadow-purple-500/20' : 'border-gray-700'}`}>
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-gray-900" />
      <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center">
          <GitBranch size={14} className="text-purple-400" />
        </div>
        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Branch</span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <input
          value={nodeData.condition?.key || ''}
          readOnly
          placeholder="Key"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none"
        />
        <div className="flex gap-2">
          <select
            value={nodeData.condition?.operator || 'equals'}
            onChange={() => {}}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white outline-none flex-shrink-0"
          >
            <option value="equals">=</option>
            <option value="gt">&gt;</option>
            <option value="lt">&lt;</option>
            <option value="contains">contains</option>
          </select>
          <input
            value={nodeData.condition?.value ?? ''}
            readOnly
            placeholder="Value"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none"
          />
        </div>
      </div>
      <div className="flex justify-between px-4 pb-2">
        <span className="text-[10px] font-bold text-emerald-400">YES</span>
        <span className="text-[10px] font-bold text-rose-400">NO</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="yes" className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-gray-900 !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="no" className="!bg-rose-500 !w-3 !h-3 !border-2 !border-gray-900 !left-[70%]" />
    </div>
  )
}
