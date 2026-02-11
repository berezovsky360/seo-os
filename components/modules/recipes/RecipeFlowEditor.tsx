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
  ConnectionLineType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { TriggerNode } from './nodes/TriggerNode'
import { ConditionNode } from './nodes/ConditionNode'
import { ActionNode } from './nodes/ActionNode'
import { DelayNode } from './nodes/DelayNode'
import { BranchNode } from './nodes/BranchNode'
import { CronNode } from './nodes/CronNode'
import { SubRecipeNode } from './nodes/SubRecipeNode'
import { NodePalette } from './NodePalette'
import { recipeToGraph, graphToRecipe } from '@/lib/modules/recipes/graph-serializer'
import type { Recipe } from '@/lib/core/events'
import type { FlowNode, FlowNodeData } from '@/lib/modules/recipes/flow-types'
import { Save, X, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  delay: DelayNode,
  branch: BranchNode,
  cron: CronNode,
  sub_recipe: SubRecipeNode,
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
    case 'sub_recipe':
      return { type: 'sub_recipe', recipe_id: '', recipe_name: '', input_mapping: {}, label: 'Sub-Recipe' }
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
    (connection: Connection) => setEdges((eds) => addEdge({
      ...connection,
      animated: true,
      type: 'smoothstep',
      style: { stroke: '#a78bfa', strokeWidth: 2 },
    }, eds)),
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
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
          <div className="flex flex-col">
            <input
              type="text"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder="Recipe name..."
              className="bg-transparent border-none text-lg font-bold text-gray-900 outline-none placeholder-gray-400 w-72"
            />
            <input
              type="text"
              value={recipeDescription}
              onChange={(e) => setRecipeDescription(e.target.value)}
              placeholder="Add a description..."
              className="bg-transparent border-none text-xs text-gray-500 outline-none placeholder-gray-400 w-72 mt-0.5"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEnabled(!enabled)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            {enabled ? (
              <>
                <ToggleRight size={20} className="text-emerald-500" />
                <span className="text-emerald-600 font-semibold">Enabled</span>
              </>
            ) : (
              <>
                <ToggleLeft size={20} className="text-gray-400" />
                <span className="text-gray-400">Disabled</span>
              </>
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={!recipeName.trim() || isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
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
            className="bg-gray-50"
            connectionLineType={ConnectionLineType.SmoothStep}
            defaultEdgeOptions={{
              animated: true,
              type: 'smoothstep',
              style: { stroke: '#a78bfa', strokeWidth: 2 },
            }}
          >
            <Background color="#e5e7eb" gap={20} size={1} />
            <Controls className="!bg-white !border-gray-200 !shadow-md !rounded-xl [&_button]:!bg-white [&_button]:!border-gray-200 [&_button]:!text-gray-600 [&_button:hover]:!bg-gray-50 [&_button]:!rounded-lg" />
            <MiniMap
              className="!bg-white !border-gray-200 !rounded-xl !shadow-md"
              maskColor="rgba(0, 0, 0, 0.08)"
              nodeColor={(node) => {
                switch (node.type) {
                  case 'trigger': return '#f59e0b'
                  case 'condition': return '#f97316'
                  case 'action': return '#10b981'
                  case 'delay': return '#64748b'
                  case 'branch': return '#a855f7'
                  case 'cron': return '#8b5cf6'
                  case 'sub_recipe': return '#06b6d4'
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
