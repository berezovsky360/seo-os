import type { Node, Edge } from '@xyflow/react'
import type { EventType, ModuleId } from '@/lib/core/events'

// ====== Custom Node Data Types ======

export interface TriggerNodeData {
  type: 'trigger'
  event: EventType | ''
  label: string
  [key: string]: unknown
}

export interface ConditionNodeData {
  type: 'condition'
  key: string
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte'
  value: string | number
  label: string
  [key: string]: unknown
}

export interface ActionNodeData {
  type: 'action'
  module: ModuleId | ''
  action: string
  params: Record<string, any>
  label: string
  [key: string]: unknown
}

export interface DelayNodeData {
  type: 'delay'
  duration: number
  unit: 'seconds' | 'minutes' | 'hours'
  label: string
  [key: string]: unknown
}

export interface BranchNodeData {
  type: 'branch'
  condition: {
    key: string
    operator: string
    value: string | number
  }
  label: string
  [key: string]: unknown
}

export interface CronNodeData {
  type: 'cron'
  cron_expression: string
  timezone: string
  label: string
  [key: string]: unknown
}

export type FlowNodeData =
  | TriggerNodeData
  | ConditionNodeData
  | ActionNodeData
  | DelayNodeData
  | BranchNodeData
  | CronNodeData

export type FlowNode = Node<FlowNodeData>
export type FlowEdge = Edge

export interface RecipeGraphLayout {
  nodes: FlowNode[]
  edges: FlowEdge[]
  viewport: { x: number; y: number; zoom: number }
}

// ====== Node Palette Config ======

export interface NodePaletteItem {
  type: string
  label: string
  description: string
  color: string
}

export const NODE_PALETTE: NodePaletteItem[] = [
  { type: 'trigger', label: 'Event Trigger', description: 'Start when event fires', color: 'amber' },
  { type: 'condition', label: 'Condition', description: 'Check a value', color: 'orange' },
  { type: 'action', label: 'Action', description: 'Run module action', color: 'emerald' },
  { type: 'delay', label: 'Delay', description: 'Wait before continuing', color: 'slate' },
  { type: 'branch', label: 'Branch', description: 'If/else split', color: 'purple' },
  { type: 'cron', label: 'Cron Trigger', description: 'Time-based schedule', color: 'violet' },
]
