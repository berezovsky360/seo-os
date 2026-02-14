'use client'

import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { Target } from 'lucide-react'
import type { ConversionNodeData } from '@/lib/modules/funnel-builder/flow-types'

export function ConversionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ConversionNodeData
  const { updateNodeData } = useReactFlow()

  return (
    <div className={`min-w-[260px] rounded-xl border bg-white shadow-md transition-shadow ${selected ? 'border-emerald-400 shadow-lg shadow-emerald-100 ring-2 ring-emerald-200' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-emerald-50 rounded-t-xl">
        <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
          <Target size={14} className="text-emerald-600" />
        </div>
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Conversion</span>
        {nodeData.stats?.conversions !== undefined && (
          <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-semibold">
            {nodeData.stats.conversions} conv
          </span>
        )}
      </div>
      <div className="px-4 py-3 space-y-2">
        <input
          type="text"
          value={nodeData.goalName || ''}
          onChange={(e) => updateNodeData(id, { goalName: e.target.value, label: e.target.value || 'Conversion Goal' })}
          placeholder="Goal name (e.g. Purchase, Signup)"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Value $</span>
          <input
            type="number"
            min={0}
            value={nodeData.goalValue || 0}
            onChange={(e) => updateNodeData(id, { goalValue: Number(e.target.value) || 0 })}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
          />
        </div>
      </div>
    </div>
  )
}
