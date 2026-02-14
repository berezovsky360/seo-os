/**
 * Funnel Graph Serializer — Converts between DB JSONB and @xyflow graph format.
 */

import type { FunnelNode, FunnelEdge, FunnelGraphLayout, FunnelNodeData } from './flow-types'

/**
 * Parse a funnel's stored graph JSONB into @xyflow nodes/edges.
 */
export function funnelGraphFromDb(graph: Record<string, any>): FunnelGraphLayout {
  return {
    nodes: (graph.nodes || []) as FunnelNode[],
    edges: (graph.edges || []) as FunnelEdge[],
    viewport: graph.viewport || { x: 0, y: 0, zoom: 1 },
  }
}

/**
 * Serialize @xyflow nodes/edges into JSONB for DB storage.
 */
export function funnelGraphToDb(
  nodes: FunnelNode[],
  edges: FunnelEdge[],
  viewport?: { x: number; y: number; zoom: number }
): Record<string, any> {
  return {
    nodes,
    edges,
    viewport: viewport || { x: 0, y: 0, zoom: 1 },
  }
}

/**
 * Create default data for a new node of the given type.
 */
export function getDefaultFunnelNodeData(type: string): FunnelNodeData {
  switch (type) {
    case 'landing-page':
      return { type: 'landing-page', pageId: '', pageName: '', label: 'Landing Page' }
    case 'form':
      return { type: 'form', formId: '', formName: '', label: 'Lead Form' }
    case 'email':
      return { type: 'email', subject: '', body: '', label: 'Email Step' }
    case 'condition':
      return { type: 'condition', field: '', operator: 'equals', value: '', label: 'Condition' }
    case 'delay':
      return { type: 'delay', duration: 1, unit: 'days', label: 'Wait 1 day' }
    case 'conversion':
      return { type: 'conversion', goalName: '', goalValue: 0, label: 'Conversion Goal' }
    default:
      return { type: 'landing-page', pageId: '', pageName: '', label: 'Node' }
  }
}
