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
  amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300',
  orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:border-orange-300',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
  slate: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300',
  violet: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100 hover:border-cyan-300',
}

const ICON_COLORS: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-600',
  orange: 'bg-orange-100 text-orange-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  slate: 'bg-slate-100 text-slate-600',
  purple: 'bg-purple-100 text-purple-600',
  violet: 'bg-violet-100 text-violet-600',
  cyan: 'bg-cyan-100 text-cyan-600',
}

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-56 bg-white border-r border-gray-200 flex flex-col shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Drag & Drop</h3>
        <p className="text-[10px] text-gray-400 mt-0.5">Drag blocks onto the canvas</p>
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
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-[10px] text-gray-400">{item.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
