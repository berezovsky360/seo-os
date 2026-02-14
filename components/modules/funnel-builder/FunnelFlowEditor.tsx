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

import { LandingPageNode } from './nodes/LandingPageNode'
import { FormNode } from './nodes/FormNode'
import { EmailNode } from './nodes/EmailNode'
import { ConditionNode } from './nodes/ConditionNode'
import { DelayNode } from './nodes/DelayNode'
import { ConversionNode } from './nodes/ConversionNode'
import { FunnelNodePalette } from './FunnelNodePalette'
import { funnelGraphFromDb, funnelGraphToDb, getDefaultFunnelNodeData } from '@/lib/modules/funnel-builder/graph-serializer'
import type { FunnelNode } from '@/lib/modules/funnel-builder/flow-types'
import { Save, X, Play, Pause, Loader2 } from 'lucide-react'

const nodeTypes = {
  'landing-page': LandingPageNode,
  'form': FormNode,
  'email': EmailNode,
  'condition': ConditionNode,
  'delay': DelayNode,
  'conversion': ConversionNode,
}

interface FunnelFlowEditorProps {
  funnel: any
  onSave: (data: any) => Promise<void>
  onClose: () => void
  isSaving: boolean
}

function FlowEditorInner({ funnel, onSave, onClose, isSaving }: FunnelFlowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [funnelName, setFunnelName] = useState(funnel?.name || '')
  const [funnelDescription, setFunnelDescription] = useState(funnel?.description || '')
  const [status, setStatus] = useState(funnel?.status || 'draft')

  const initialGraph = useMemo(() => {
    if (funnel?.graph && (funnel.graph.nodes?.length || funnel.graph.edges?.length)) {
      return funnelGraphFromDb(funnel.graph)
    }
    return { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
  }, [funnel])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges)

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({
      ...connection,
      animated: true,
      type: 'smoothstep',
      style: { stroke: '#818cf8', strokeWidth: 2 },
    }, eds)),
    [setEdges]
  )

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

      const newNode: FunnelNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: getDefaultFunnelNodeData(type),
      }

      setNodes((nds) => [...nds, newNode])
    },
    [setNodes]
  )

  const handleSave = async () => {
    if (!funnelName.trim()) return

    const graph = funnelGraphToDb(nodes, edges)

    await onSave({
      name: funnelName.trim(),
      description: funnelDescription.trim() || null,
      status,
      graph,
    })
  }

  const statusColor = status === 'active'
    ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : status === 'paused'
      ? 'text-amber-600 bg-amber-50 border-amber-200'
      : 'text-gray-500 bg-gray-50 border-gray-200'

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
              value={funnelName}
              onChange={(e) => setFunnelName(e.target.value)}
              placeholder="Funnel name..."
              className="bg-transparent border-none text-lg font-bold text-gray-900 outline-none placeholder-gray-400 w-72"
            />
            <input
              type="text"
              value={funnelDescription}
              onChange={(e) => setFunnelDescription(e.target.value)}
              placeholder="Add a description..."
              className="bg-transparent border-none text-xs text-gray-500 outline-none placeholder-gray-400 w-72 mt-0.5"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status toggle */}
          <div className="flex items-center gap-1.5">
            {status !== 'active' && (
              <button
                onClick={() => setStatus('active')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <Play size={14} />
                Activate
              </button>
            )}
            {status === 'active' && (
              <button
                onClick={() => setStatus('paused')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <Pause size={14} />
                Pause
              </button>
            )}
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${statusColor}`}>
              {status}
            </span>
          </div>
          <button
            onClick={handleSave}
            disabled={!funnelName.trim() || isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <FunnelNodePalette />

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
            fitViewOptions={{ maxZoom: 0.75, padding: 0.3 }}
            className="bg-gray-50"
            connectionLineType={ConnectionLineType.SmoothStep}
            defaultEdgeOptions={{
              animated: true,
              type: 'smoothstep',
              style: { stroke: '#818cf8', strokeWidth: 2 },
            }}
          >
            <Background color="#e5e7eb" gap={20} size={1} />
            <Controls className="!bg-white !border-gray-200 !shadow-md !rounded-xl [&_button]:!bg-white [&_button]:!border-gray-200 [&_button]:!text-gray-600 [&_button:hover]:!bg-gray-50 [&_button]:!rounded-lg" />
            <MiniMap
              className="!bg-white !border-gray-200 !rounded-xl !shadow-md"
              maskColor="rgba(0, 0, 0, 0.08)"
              nodeColor={(node) => {
                switch (node.type) {
                  case 'landing-page': return '#6366f1'
                  case 'form': return '#f43f5e'
                  case 'email': return '#0ea5e9'
                  case 'condition': return '#f97316'
                  case 'delay': return '#64748b'
                  case 'conversion': return '#10b981'
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

export default function FunnelFlowEditor(props: FunnelFlowEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner {...props} />
    </ReactFlowProvider>
  )
}
