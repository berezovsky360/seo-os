'use client'

import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { FileText } from 'lucide-react'
import type { FormNodeData } from '@/lib/modules/funnel-builder/flow-types'

export function FormNode({ id, data, selected }: NodeProps) {
  const nodeData = data as FormNodeData
  const { updateNodeData } = useReactFlow()

  return (
    <div className={`min-w-[260px] rounded-xl border bg-white shadow-md transition-shadow ${selected ? 'border-rose-400 shadow-lg shadow-rose-100 ring-2 ring-rose-200' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-rose-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-rose-50 rounded-t-xl">
        <div className="w-6 h-6 rounded-md bg-rose-100 flex items-center justify-center">
          <FileText size={14} className="text-rose-600" />
        </div>
        <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Lead Form</span>
        {nodeData.stats?.submissions !== undefined && (
          <span className="ml-auto text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-semibold">
            {nodeData.stats.submissions} subs
          </span>
        )}
      </div>
      <div className="px-4 py-3">
        <input
          type="text"
          value={nodeData.formName || ''}
          onChange={(e) => updateNodeData(id, { formName: e.target.value, label: e.target.value || 'Lead Form' })}
          placeholder="Form name..."
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none"
        />
        <input
          type="text"
          value={nodeData.formId || ''}
          onChange={(e) => updateNodeData(id, { formId: e.target.value })}
          placeholder="Form ID (UUID)..."
          className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none font-mono"
        />
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-rose-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  )
}
