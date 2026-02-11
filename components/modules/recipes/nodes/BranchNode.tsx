'use client'

import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import type { BranchNodeData } from '@/lib/modules/recipes/flow-types'

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
  { value: 'contains', label: 'contains' },
]

export function BranchNode({ id, data, selected }: NodeProps) {
  const nodeData = data as BranchNodeData
  const { updateNodeData } = useReactFlow()

  const updateCondition = (field: string, value: any) => {
    updateNodeData(id, {
      condition: { ...nodeData.condition, [field]: value },
    })
  }

  const opLabel = OPERATORS.find(o => o.value === nodeData.condition?.operator)?.label || 'equals'

  return (
    <div className={`min-w-[260px] rounded-xl border bg-white shadow-md transition-shadow ${selected ? 'border-purple-400 shadow-lg shadow-purple-100 ring-2 ring-purple-200' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-purple-50 rounded-t-xl">
        <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center">
          <GitBranch size={14} className="text-purple-600" />
        </div>
        <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">If / Else</span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block font-medium">Check field</label>
          <input
            value={nodeData.condition?.key || ''}
            onChange={(e) => updateCondition('key', e.target.value)}
            placeholder="e.g. score, status"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-shrink-0">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block font-medium">Is</label>
            <select
              value={nodeData.condition?.operator || 'equals'}
              onChange={(e) => updateCondition('operator', e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-800 outline-none cursor-pointer focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            >
              {OPERATORS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block font-medium">Value</label>
            <input
              value={nodeData.condition?.value ?? ''}
              onChange={(e) => updateCondition('value', e.target.value)}
              placeholder="e.g. 70, published"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
          </div>
        </div>
        {nodeData.condition?.key && (
          <div className="text-[10px] text-purple-500 px-1">
            If {nodeData.condition.key} {opLabel} {nodeData.condition.value || '?'}
          </div>
        )}
      </div>
      <div className="flex justify-between px-6 pb-2">
        <span className="text-[10px] font-bold text-emerald-500">YES</span>
        <span className="text-[10px] font-bold text-rose-400">NO</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="yes" className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="no" className="!bg-rose-400 !w-3 !h-3 !border-2 !border-white !left-[70%]" />
    </div>
  )
}
