'use client'

import { Zap, Filter, Play, Clock, GitBranch, Timer } from 'lucide-react'
import { NODE_PALETTE } from '@/lib/modules/recipes/flow-types'

const ICONS: Record<string, any> = {
  trigger: Zap,
  condition: Filter,
  action: Play,
  delay: Clock,
  branch: GitBranch,
  cron: Timer,
}

const COLORS: Record<string, string> = {
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
}

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Node Types</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {NODE_PALETTE.map(item => {
          const Icon = ICONS[item.type]
          const colorClass = COLORS[item.color] || COLORS.slate
          return (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] ${colorClass}`}
            >
              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                {Icon && <Icon size={16} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-[10px] text-gray-500">{item.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
