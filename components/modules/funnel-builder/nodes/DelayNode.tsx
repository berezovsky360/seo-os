'use client'

import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { Clock } from 'lucide-react'
import type { FunnelDelayNodeData } from '@/lib/modules/funnel-builder/flow-types'

export function DelayNode({ id, data, selected }: NodeProps) {
  const nodeData = data as FunnelDelayNodeData
  const { updateNodeData } = useReactFlow()

  return (
    <div className={`min-w-[220px] rounded-xl border bg-white shadow-md transition-shadow ${selected ? 'border-slate-400 shadow-lg shadow-slate-100 ring-2 ring-slate-200' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-slate-50 rounded-t-xl">
        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
          <Clock size={14} className="text-slate-600" />
        </div>
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Wait</span>
      </div>
      <div className="px-4 py-3 flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={nodeData.duration || 1}
          onChange={(e) => {
            const d = Number(e.target.value) || 1
            updateNodeData(id, { duration: d, label: `Wait ${d} ${nodeData.unit || 'days'}` })
          }}
          className="w-20 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none text-center"
        />
        <select
          value={nodeData.unit || 'days'}
          onChange={(e) => {
            updateNodeData(id, { unit: e.target.value, label: `Wait ${nodeData.duration || 1} ${e.target.value}` })
          }}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-sm text-gray-700 focus:border-slate-400 outline-none"
        >
          <option value="hours">hours</option>
          <option value="days">days</option>
        </select>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  )
}
