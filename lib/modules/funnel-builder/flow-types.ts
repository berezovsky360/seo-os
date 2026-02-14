import type { Node, Edge } from '@xyflow/react'

// ====== Funnel Node Data Types ======

export interface LandingPageNodeData {
  type: 'landing-page'
  pageId: string
  pageName: string
  label: string
  stats?: { views: number }
  [key: string]: unknown
}

export interface FormNodeData {
  type: 'form'
  formId: string
  formName: string
  label: string
  stats?: { submissions: number }
  [key: string]: unknown
}

export interface EmailNodeData {
  type: 'email'
  subject: string
  body: string
  label: string
  stats?: { sent: number; opened: number }
  [key: string]: unknown
}

export interface FunnelConditionNodeData {
  type: 'condition'
  field: string
  operator: 'equals' | 'contains' | 'gt' | 'lt'
  value: string
  label: string
  [key: string]: unknown
}

export interface FunnelDelayNodeData {
  type: 'delay'
  duration: number
  unit: 'hours' | 'days'
  label: string
  [key: string]: unknown
}

export interface ConversionNodeData {
  type: 'conversion'
  goalName: string
  goalValue: number
  label: string
  stats?: { conversions: number }
  [key: string]: unknown
}

export type FunnelNodeData =
  | LandingPageNodeData
  | FormNodeData
  | EmailNodeData
  | FunnelConditionNodeData
  | FunnelDelayNodeData
  | ConversionNodeData

export type FunnelNode = Node<FunnelNodeData>
export type FunnelEdge = Edge

export interface FunnelGraphLayout {
  nodes: FunnelNode[]
  edges: FunnelEdge[]
  viewport: { x: number; y: number; zoom: number }
}

// ====== Node Palette Config ======

export interface FunnelPaletteItem {
  type: string
  label: string
  description: string
  color: string
}

export const FUNNEL_NODE_PALETTE: FunnelPaletteItem[] = [
  { type: 'landing-page', label: 'Landing Page', description: 'Link to a landing page', color: 'indigo' },
  { type: 'form', label: 'Lead Form', description: 'Capture form submission', color: 'rose' },
  { type: 'email', label: 'Email', description: 'Send an email step', color: 'sky' },
  { type: 'condition', label: 'Condition', description: 'If/else branch', color: 'orange' },
  { type: 'delay', label: 'Wait', description: 'Delay before next step', color: 'slate' },
  { type: 'conversion', label: 'Conversion', description: 'Goal / conversion event', color: 'emerald' },
]
