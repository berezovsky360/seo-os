'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Filter } from 'lucide-react'
import type { ConditionNodeData } from '@/lib/modules/recipes/flow-types'

const OPERATORS = [
  { value: 'equals', label: '=' },
  { value: 'contains', label: 'contains' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '>=' },
  { value: 'lte', label: '<=' },
]

export function ConditionNode({ data, selected }: NodeProps) {
  const nodeData = data as ConditionNodeData

  return (
    <div className={`min-w-[240px] rounded-xl border-2 shadow-lg bg-gray-900 ${selected ? 'border-orange-400 shadow-orange-500/20' : 'border-gray-700'}`}>
      <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-3 !h-3 !border-2 !border-gray-900" />
      <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-orange-500/20 flex items-center justify-center">
          <Filter size={14} className="text-orange-400" />
        </div>
        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Condition</span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <input
          value={nodeData.key || ''}
          readOnly
          placeholder="Key (e.g. position)"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none"
        />
        <div className="flex gap-2">
          <select
            value={nodeData.operator || 'equals'}
            onChange={() => {}}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white outline-none flex-shrink-0"
          >
            {OPERATORS.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
          <input
            value={nodeData.value ?? ''}
            readOnly
            placeholder="Value"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none"
          />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-gray-900 !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="false" className="!bg-rose-500 !w-3 !h-3 !border-2 !border-gray-900 !left-[70%]" />
    </div>
  )
}
