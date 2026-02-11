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

export interface SubRecipeNodeData {
  type: 'sub_recipe'
  recipe_id: string
  recipe_name: string
  input_mapping: Record<string, string>
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
  | SubRecipeNodeData

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
  { type: 'trigger', label: 'When...', description: 'Start when an event happens', color: 'amber' },
  { type: 'cron', label: 'On Schedule', description: 'Run at a specific time', color: 'violet' },
  { type: 'action', label: 'Do This', description: 'Run a module action', color: 'emerald' },
  { type: 'condition', label: 'Only If', description: 'Filter by a condition', color: 'orange' },
  { type: 'branch', label: 'If / Else', description: 'Split into two paths', color: 'purple' },
  { type: 'delay', label: 'Wait', description: 'Pause before next step', color: 'slate' },
  { type: 'sub_recipe', label: 'Sub-Recipe', description: 'Call another recipe', color: 'cyan' },
]
