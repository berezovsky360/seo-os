'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Clock } from 'lucide-react'
import type { DelayNodeData } from '@/lib/modules/recipes/flow-types'

export function DelayNode({ data, selected }: NodeProps) {
  const nodeData = data as DelayNodeData

  return (
    <div className={`min-w-[200px] rounded-xl border-2 shadow-lg bg-gray-900 ${selected ? 'border-slate-400 shadow-slate-500/20' : 'border-gray-700'}`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-3 !h-3 !border-2 !border-gray-900" />
      <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-slate-500/20 flex items-center justify-center">
          <Clock size={14} className="text-slate-400" />
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delay</span>
      </div>
      <div className="px-4 py-3 flex gap-2">
        <input
          type="number"
          value={nodeData.duration || 0}
          readOnly
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none w-20"
        />
        <select
          value={nodeData.unit || 'seconds'}
          onChange={() => {}}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white outline-none"
        >
          <option value="seconds">sec</option>
          <option value="minutes">min</option>
          <option value="hours">hr</option>
        </select>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-3 !h-3 !border-2 !border-gray-900" />
    </div>
  )
}
