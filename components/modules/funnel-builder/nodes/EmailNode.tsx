'use client'

import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { Mail } from 'lucide-react'
import type { EmailNodeData } from '@/lib/modules/funnel-builder/flow-types'

export function EmailNode({ id, data, selected }: NodeProps) {
  const nodeData = data as EmailNodeData
  const { updateNodeData } = useReactFlow()

  return (
    <div className={`min-w-[260px] rounded-xl border bg-white shadow-md transition-shadow ${selected ? 'border-sky-400 shadow-lg shadow-sky-100 ring-2 ring-sky-200' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-sky-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-sky-50 rounded-t-xl">
        <div className="w-6 h-6 rounded-md bg-sky-100 flex items-center justify-center">
          <Mail size={14} className="text-sky-600" />
        </div>
        <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">Email</span>
        {nodeData.stats && (
          <span className="ml-auto text-[10px] bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded-full font-semibold">
            {nodeData.stats.sent} sent / {nodeData.stats.opened} opened
          </span>
        )}
      </div>
      <div className="px-4 py-3 space-y-2">
        <input
          type="text"
          value={nodeData.subject || ''}
          onChange={(e) => updateNodeData(id, { subject: e.target.value, label: e.target.value || 'Email Step' })}
          placeholder="Subject line..."
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none"
        />
        <textarea
          value={nodeData.body || ''}
          onChange={(e) => updateNodeData(id, { body: e.target.value })}
          placeholder="Email body..."
          rows={3}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none resize-none"
        />
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-sky-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  )
}
