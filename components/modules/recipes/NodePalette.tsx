'use client'

import { Zap, Filter, Play, Clock, GitBranch, Timer, Workflow } from 'lucide-react'
import { NODE_PALETTE } from '@/lib/modules/recipes/flow-types'

const ICONS: Record<string, any> = {
  trigger: Zap,
  condition: Filter,
  action: Play,
  delay: Clock,
  branch: GitBranch,
  cron: Timer,
  sub_recipe: Workflow,
}

const COLORS: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/40',
  orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/40',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/40',
  slate: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700/40',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-900/40',
  violet: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800 dark:hover:bg-violet-900/40',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100 hover:border-cyan-300 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-800 dark:hover:bg-cyan-900/40',
}

const ICON_COLORS: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400',
  cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-400',
}

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-56 bg-white dark:bg-[#1a1a1a] border-r border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Drag & Drop</h3>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Drag blocks onto the canvas</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {NODE_PALETTE.map(item => {
          const Icon = ICONS[item.type]
          const colorClass = COLORS[item.color] || COLORS.slate
          const iconClass = ICON_COLORS[item.color] || ICON_COLORS.slate
          return (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] hover:shadow-sm ${colorClass}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconClass}`}>
                {Icon && <Icon size={16} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.label}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{item.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
