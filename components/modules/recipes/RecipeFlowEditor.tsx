'use client'

import { useCallback, useRef, useState, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type OnConnect,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { TriggerNode } from './nodes/TriggerNode'
import { ConditionNode } from './nodes/ConditionNode'
import { ActionNode } from './nodes/ActionNode'
import { DelayNode } from './nodes/DelayNode'
import { BranchNode } from './nodes/BranchNode'
import { CronNode } from './nodes/CronNode'
import { NodePalette } from './NodePalette'
import { recipeToGraph, graphToRecipe } from '@/lib/modules/recipes/graph-serializer'
import type { Recipe } from '@/lib/core/events'
import type { FlowNode, FlowNodeData, TriggerNodeData, ActionNodeData, ConditionNodeData, DelayNodeData, BranchNodeData, CronNodeData } from '@/lib/modules/recipes/flow-types'
import { Save, X, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  delay: DelayNode,
  branch: BranchNode,
  cron: CronNode,
}

interface RecipeFlowEditorProps {
  recipe: Recipe | null // null = new recipe
  onSave: (data: any) => Promise<void>
  onClose: () => void
  isSaving: boolean
}

function getDefaultNodeData(type: string): FlowNodeData {
  switch (type) {
    case 'trigger':
      return { type: 'trigger', event: '' as any, label: 'New Trigger' }
    case 'condition':
      return { type: 'condition', key: '', operator: 'equals', value: '', label: 'New Condition' }
    case 'action':
      return { type: 'action', module: '' as any, action: '', params: {}, label: 'New Action' }
    case 'delay':
      return { type: 'delay', duration: 10, unit: 'seconds', label: 'Delay' }
    case 'branch':
      return { type: 'branch', condition: { key: '', operator: 'equals', value: '' }, label: 'Branch' }
    case 'cron':
      return { type: 'cron', cron_expression: '', timezone: 'UTC', label: 'Cron Trigger' }
    default:
      return { type: 'action', module: '' as any, action: '', params: {}, label: 'Node' }
  }
}

function FlowEditorInner({ recipe, onSave, onClose, isSaving }: RecipeFlowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [recipeName, setRecipeName] = useState(recipe?.name || '')
  const [recipeDescription, setRecipeDescription] = useState(recipe?.description || '')
  const [enabled, setEnabled] = useState(recipe?.enabled ?? true)

  // Initialize nodes and edges from recipe
  const initialGraph = useMemo(() => {
    if (recipe?.graph_layout) {
      return recipe.graph_layout as { nodes: FlowNode[]; edges: any[]; viewport: any }
    }
    if (recipe) {
      return recipeToGraph(recipe)
    }
    // New recipe: start with a single trigger node
    return {
      nodes: [{
        id: 'trigger-0',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: { type: 'trigger' as const, event: '' as any, label: 'Select event' },
      }] as FlowNode[],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    }
  }, [recipe])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges)

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
    [setEdges]
  )

  // Handle drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow')
      if (!type || !reactFlowWrapper.current) return

      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = {
        x: event.clientX - bounds.left - 120,
        y: event.clientY - bounds.top - 30,
      }

      const newNode: FlowNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: getDefaultNodeData(type),
      }

      setNodes((nds) => [...nds, newNode])
    },
    [setNodes]
  )

  // Update node data when user changes inputs
  const onNodeDataChange = useCallback((nodeId: string, field: string, value: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== nodeId) return node
        const newData = { ...node.data, [field]: value }
        // Update label
        if (node.type === 'trigger' && field === 'event') {
          (newData as TriggerNodeData).label = `On: ${value || 'Select event'}`
        }
        if (node.type === 'action') {
          const d = newData as ActionNodeData
          if (field === 'module' || field === 'action') {
            d.label = `${d.module || '?'}.${d.action || '?'}`
          }
        }
        return { ...node, data: newData }
      })
    )
  }, [setNodes])

  // Save handler
  const handleSave = async () => {
    if (!recipeName.trim()) return

    const { trigger_event, trigger_conditions, actions } = graphToRecipe(nodes, edges)
    const graphLayout = { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } }

    await onSave({
      name: recipeName.trim(),
      description: recipeDescription.trim(),
      enabled,
      trigger_event,
      trigger_conditions,
      actions,
      graph_layout: graphLayout,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
          <input
            type="text"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="Recipe name..."
            className="bg-transparent border-none text-lg font-bold text-white outline-none placeholder-gray-600 w-64"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEnabled(!enabled)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            {enabled ? (
              <>
                <ToggleRight size={20} className="text-emerald-400" />
                <span className="text-emerald-400">Enabled</span>
              </>
            ) : (
              <>
                <ToggleLeft size={20} className="text-gray-500" />
                <span className="text-gray-500">Disabled</span>
              </>
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={!recipeName.trim() || isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette */}
        <NodePalette />

        {/* Flow Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-950"
            defaultEdgeOptions={{ animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }}
          >
            <Background color="#333" gap={20} />
            <Controls className="!bg-gray-800 !border-gray-700 !shadow-lg [&_button]:!bg-gray-800 [&_button]:!border-gray-700 [&_button]:!text-gray-300 [&_button:hover]:!bg-gray-700" />
            <MiniMap
              className="!bg-gray-900 !border-gray-800"
              nodeColor={(node) => {
                switch (node.type) {
                  case 'trigger': return '#f59e0b'
                  case 'condition': return '#f97316'
                  case 'action': return '#10b981'
                  case 'delay': return '#94a3b8'
                  case 'branch': return '#a855f7'
                  case 'cron': return '#8b5cf6'
                  default: return '#6366f1'
                }
              }}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}

export default function RecipeFlowEditor(props: RecipeFlowEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner {...props} />
    </ReactFlowProvider>
  )
}
