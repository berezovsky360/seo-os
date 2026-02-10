/**
 * Graph Serializer — Converts between flat Recipe format and React Flow graph.
 *
 * The `actions` JSONB array remains the execution source of truth.
 * `graph_layout` is purely visual metadata for the React Flow editor.
 */

import type { Recipe, RecipeAction, EventType } from '@/lib/core/events'
import type {
  FlowNode,
  FlowEdge,
  RecipeGraphLayout,
  TriggerNodeData,
  ConditionNodeData,
  ActionNodeData,
} from './flow-types'

const NODE_SPACING_Y = 150
const NODE_START_X = 250

/**
 * Convert a flat Recipe into a React Flow graph for visual editing.
 * Used when loading a recipe that has no `graph_layout` stored.
 */
export function recipeToGraph(recipe: Recipe): RecipeGraphLayout {
  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []
  let y = 50

  // 1. Create Trigger node
  const triggerId = 'trigger-0'
  nodes.push({
    id: triggerId,
    type: 'trigger',
    position: { x: NODE_START_X, y },
    data: {
      type: 'trigger',
      event: recipe.trigger_event || '',
      label: `On: ${recipe.trigger_event || 'Select event'}`,
    },
  })
  y += NODE_SPACING_Y

  // 2. Create Condition nodes from trigger_conditions
  let lastNodeId = triggerId
  const conditionEntries = Object.entries(recipe.trigger_conditions || {})
  for (let i = 0; i < conditionEntries.length; i++) {
    const [key, value] = conditionEntries[i]
    const condId = `condition-${i}`
    let operator: ConditionNodeData['operator'] = 'equals'
    let cleanKey = key

    if (key.startsWith('min_')) { operator = 'gte'; cleanKey = key.replace('min_', '') }
    else if (key.startsWith('max_')) { operator = 'lte'; cleanKey = key.replace('max_', '') }
    else if (key.startsWith('equals_')) { operator = 'equals'; cleanKey = key.replace('equals_', '') }
    else if (key.startsWith('contains_')) { operator = 'contains'; cleanKey = key.replace('contains_', '') }

    nodes.push({
      id: condId,
      type: 'condition',
      position: { x: NODE_START_X, y },
      data: {
        type: 'condition',
        key: cleanKey,
        operator,
        value: value as string | number,
        label: `${cleanKey} ${operator} ${value}`,
      },
    })

    edges.push({
      id: `e-${lastNodeId}-${condId}`,
      source: lastNodeId,
      target: condId,
    })

    lastNodeId = condId
    y += NODE_SPACING_Y
  }

  // 3. Create Action nodes
  for (let i = 0; i < (recipe.actions || []).length; i++) {
    const action = recipe.actions[i]
    const actionId = `action-${i}`

    nodes.push({
      id: actionId,
      type: 'action',
      position: { x: NODE_START_X, y },
      data: {
        type: 'action',
        module: action.module,
        action: action.action,
        params: action.params || {},
        label: `${action.module}.${action.action}`,
      },
    })

    edges.push({
      id: `e-${lastNodeId}-${actionId}`,
      source: lastNodeId,
      target: actionId,
    })

    lastNodeId = actionId
    y += NODE_SPACING_Y
  }

  return {
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

/**
 * Convert a React Flow graph back into the flat Recipe format for execution.
 */
export function graphToRecipe(
  nodes: FlowNode[],
  edges: FlowEdge[]
): {
  trigger_event: EventType | ''
  trigger_conditions: Record<string, any>
  actions: RecipeAction[]
} {
  // Find the trigger node
  const triggerNode = nodes.find(n => n.type === 'trigger')
  const trigger_event = (triggerNode?.data as TriggerNodeData)?.event || ''

  // Build adjacency from edges
  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    const targets = adjacency.get(edge.source) || []
    targets.push(edge.target)
    adjacency.set(edge.source, targets)
  }

  // BFS traversal from trigger node
  const trigger_conditions: Record<string, any> = {}
  const actions: RecipeAction[] = []

  if (triggerNode) {
    const visited = new Set<string>()
    const queue = [triggerNode.id]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      const node = nodes.find(n => n.id === currentId)
      if (!node) continue

      if (node.type === 'condition') {
        const data = node.data as ConditionNodeData
        const prefix =
          data.operator === 'gte' ? 'min_' :
          data.operator === 'lte' ? 'max_' :
          data.operator === 'contains' ? 'contains_' :
          data.operator === 'equals' ? 'equals_' : ''
        trigger_conditions[`${prefix}${data.key}`] = data.value
      }

      if (node.type === 'action') {
        const data = node.data as ActionNodeData
        if (data.module) {
          actions.push({
            module: data.module as RecipeAction['module'],
            action: data.action,
            params: data.params || {},
          })
        }
      }

      // Traverse children
      const children = adjacency.get(currentId) || []
      for (const childId of children) {
        queue.push(childId)
      }
    }
  }

  return { trigger_event: trigger_event as EventType, trigger_conditions, actions }
}
