'use client'

import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { Clock } from 'lucide-react'
import type { DelayNodeData } from '@/lib/modules/recipes/flow-types'

const UNIT_LABELS: Record<string, string> = {
  seconds: 'seconds',
  minutes: 'minutes',
  hours: 'hours',
}

export function DelayNode({ id, data, selected }: NodeProps) {
  const nodeData = data as DelayNodeData
  const { updateNodeData } = useReactFlow()

  return (
    <div className={`min-w-[220px] rounded-xl border bg-white shadow-md transition-shadow ${selected ? 'border-slate-400 shadow-lg shadow-slate-100 ring-2 ring-slate-200' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-3 !h-3 !border-2 !border-white" />
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-slate-50 rounded-t-xl">
        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
          <Clock size={14} className="text-slate-600" />
        </div>
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Wait</span>
      </div>
      <div className="px-4 py-3">
        <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block font-medium">Pause for</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={nodeData.duration || 0}
            onChange={(e) => updateNodeData(id, { duration: parseInt(e.target.value) || 0 })}
            min={0}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 outline-none w-20 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
          <select
            value={nodeData.unit || 'seconds'}
            onChange={(e) => updateNodeData(id, { unit: e.target.value })}
            className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-800 outline-none cursor-pointer focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          >
            <option value="seconds">seconds</option>
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
          </select>
        </div>
        {nodeData.duration > 0 && (
          <div className="mt-2 text-[10px] text-slate-500 px-1">
            Wait {nodeData.duration} {UNIT_LABELS[nodeData.unit] || 'seconds'} before continuing
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-3 !h-3 !border-2 !border-white" />
    </div>
  )
}
