'use client'

import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { Clock } from 'lucide-react'
import { describeCron, CRON_PRESETS } from '@/lib/modules/cron/parser'

interface CronNodeData {
  cron_expression?: string
  timezone?: string
  [key: string]: unknown
}

export function CronNode({ id, data, selected }: NodeProps) {
  const nodeData = data as CronNodeData
  const { updateNodeData } = useReactFlow()
  const expression = nodeData.cron_expression || ''
  const description = expression ? describeCron(expression) : ''

  return (
    <div className={`min-w-[280px] rounded-xl border bg-white shadow-md transition-shadow ${selected ? 'border-violet-400 shadow-lg shadow-violet-100 ring-2 ring-violet-200' : 'border-gray-200'}`}>
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-violet-50 rounded-t-xl">
        <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center">
          <Clock size={14} className="text-violet-600" />
        </div>
        <span className="text-xs font-bold text-violet-700 uppercase tracking-wider">Run on schedule</span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block font-medium">Schedule</label>
          <select
            value={expression}
            onChange={(e) => updateNodeData(id, { cron_expression: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 outline-none cursor-pointer focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            <option value="">Choose a schedule...</option>
            {CRON_PRESETS.map(preset => (
              <option key={preset.expression} value={preset.expression}>
                {preset.label}
              </option>
            ))}
            {expression && !CRON_PRESETS.some(p => p.expression === expression) && (
              <option value={expression}>Custom: {expression}</option>
            )}
          </select>
        </div>
        {expression && (
          <>
            <div className="bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">
              <span className="text-xs text-gray-600 font-mono">{expression}</span>
            </div>
            <div className="text-[10px] text-violet-500 px-1">
              {description}
            </div>
          </>
        )}
        {!expression && (
          <div className="text-[10px] text-gray-400 px-1">
            Select a schedule or enter a custom cron expression
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  )
}
