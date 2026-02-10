'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Clock } from 'lucide-react'
import { describeCron, CRON_PRESETS } from '@/lib/modules/cron/parser'

interface CronNodeData {
  cron_expression?: string
  timezone?: string
  [key: string]: unknown
}

export function CronNode({ data, selected }: NodeProps) {
  const nodeData = data as CronNodeData
  const expression = nodeData.cron_expression || ''
  const description = expression ? describeCron(expression) : 'No schedule set'

  return (
    <div className={`min-w-[260px] rounded-xl border-2 shadow-lg bg-gray-900 ${selected ? 'border-violet-400 shadow-violet-500/20' : 'border-gray-700'}`}>
      <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-violet-500/20 flex items-center justify-center">
          <Clock size={14} className="text-violet-400" />
        </div>
        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">Cron Trigger</span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <select
          value={expression}
          onChange={() => {}}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
        >
          <option value="">Select schedule...</option>
          {CRON_PRESETS.map(preset => (
            <option key={preset.expression} value={preset.expression}>
              {preset.label}
            </option>
          ))}
          {expression && !CRON_PRESETS.some(p => p.expression === expression) && (
            <option value={expression}>Custom: {expression}</option>
          )}
        </select>
        <input
          value={expression}
          readOnly
          placeholder="* * * * * (min hr day mon dow)"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-400 font-mono placeholder-gray-600 outline-none"
        />
        {expression && (
          <div className="text-[10px] text-violet-400/70 px-1">
            {description}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-violet-500 !w-3 !h-3 !border-2 !border-gray-900" />
    </div>
  )
}
