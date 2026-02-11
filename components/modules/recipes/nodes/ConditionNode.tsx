'use client'

import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { Filter } from 'lucide-react'
import type { ConditionNodeData } from '@/lib/modules/recipes/flow-types'

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
  { value: 'gte', label: 'at least' },
  { value: 'lte', label: 'at most' },
]

export function ConditionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ConditionNodeData
  const { updateNodeData } = useReactFlow()

  const opLabel = OPERATORS.find(o => o.value === nodeData.operator)?.label || 'equals'

  return (
    <div className={`min-w-[260px] rounded-xl border bg-white shadow-md transition-shadow ${selected ? 'border-orange-400 shadow-lg shadow-orange-100 ring-2 ring-orange-200' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-orange-50 rounded-t-xl">
        <div className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center">
          <Filter size={14} className="text-orange-600" />
        </div>
        <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Only if</span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block font-medium">Field name</label>
          <input
            value={nodeData.key || ''}
            onChange={(e) => updateNodeData(id, { key: e.target.value })}
            placeholder="e.g. position, ctr, score"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-shrink-0">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block font-medium">Is</label>
            <select
              value={nodeData.operator || 'equals'}
              onChange={(e) => updateNodeData(id, { operator: e.target.value })}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-800 outline-none cursor-pointer focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              {OPERATORS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block font-medium">Value</label>
            <input
              value={nodeData.value ?? ''}
              onChange={(e) => updateNodeData(id, { value: e.target.value })}
              placeholder="e.g. 3, 2%"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>
        </div>
        {nodeData.key && (
          <div className="text-[10px] text-orange-500 px-1">
            Pass when {nodeData.key} {opLabel} {nodeData.value || '?'}
          </div>
        )}
      </div>
      <div className="flex justify-between px-6 pb-2">
        <span className="text-[10px] font-bold text-emerald-500">PASS</span>
        <span className="text-[10px] font-bold text-rose-400">FAIL</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="false" className="!bg-rose-400 !w-3 !h-3 !border-2 !border-white !left-[70%]" />
    </div>
  )
}
