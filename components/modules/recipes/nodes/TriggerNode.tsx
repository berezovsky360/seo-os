'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Zap } from 'lucide-react'
import type { TriggerNodeData } from '@/lib/modules/recipes/flow-types'

const TRIGGER_EVENTS = [
  { group: 'Rank Pulse', events: ['rank.check_completed', 'rank.position_dropped', 'rank.position_improved', 'rank.new_competitor'] },
  { group: 'Content', events: ['content.analysis_completed', 'content.semantic_gap_found', 'content.title_generated'] },
  { group: 'GSC', events: ['gsc.data_synced', 'gsc.low_ctr_found', 'gsc.impressions_spike', 'gsc.keyword_discovered'] },
  { group: 'RankMath', events: ['bridge.sync_completed', 'bridge.metadata_pushed'] },
  { group: 'Nana Banana', events: ['banana.pipeline_completed', 'banana.image_generated'] },
  { group: 'AI Writer', events: ['writer.title_generated', 'writer.content_generated'] },
  { group: 'Personas', events: ['persona.created', 'persona.updated'] },
]

export function TriggerNode({ data, selected }: NodeProps) {
  const nodeData = data as TriggerNodeData

  return (
    <div className={`min-w-[240px] rounded-xl border-2 shadow-lg bg-gray-900 ${selected ? 'border-amber-400 shadow-amber-500/20' : 'border-gray-700'}`}>
      <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center">
          <Zap size={14} className="text-amber-400" />
        </div>
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Trigger</span>
      </div>
      <div className="px-4 py-3">
        <select
          value={nodeData.event || ''}
          onChange={() => {}}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
        >
          <option value="">Select event...</option>
          {TRIGGER_EVENTS.map(group => (
            <optgroup key={group.group} label={group.group}>
              {group.events.map(evt => (
                <option key={evt} value={evt}>{evt}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-gray-900" />
    </div>
  )
}
