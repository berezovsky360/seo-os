'use client'

import { Globe, FileText, Mail, GitBranch, Clock, Target } from 'lucide-react'
import { FUNNEL_NODE_PALETTE } from '@/lib/modules/funnel-builder/flow-types'

const ICONS: Record<string, any> = {
  'landing-page': Globe,
  'form': FileText,
  'email': Mail,
  'condition': GitBranch,
  'delay': Clock,
  'conversion': Target,
}

const COLORS: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300',
  rose: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300',
  sky: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:border-sky-300',
  orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:border-orange-300',
  slate: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
}

const ICON_COLORS: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-600',
  rose: 'bg-rose-100 text-rose-600',
  sky: 'bg-sky-100 text-sky-600',
  orange: 'bg-orange-100 text-orange-600',
  slate: 'bg-slate-100 text-slate-600',
  emerald: 'bg-emerald-100 text-emerald-600',
}

export function FunnelNodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-56 bg-white border-r border-gray-200 flex flex-col shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Funnel Steps</h3>
        <p className="text-[10px] text-gray-400 mt-0.5">Drag blocks onto the canvas</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {FUNNEL_NODE_PALETTE.map(item => {
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
