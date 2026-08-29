"use client";

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TableNode } from './TableNode';
import { layoutSchema } from '@/lib/layout';
import { useStudio } from '@/lib/store';

const nodeTypes = { table: TableNode };
const palette = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#db2777','#4f46e5','#65a30d','#ea580c'];

function CanvasInner() {
  const parsed = useStudio((s) => s.parsed);
  const analysis = useStudio((s) => s.analysis);
  const fileName = useStudio((s) => s.fileName);
  const selectedTable = useStudio((s) => s.selectedTable);
  const setSelectedTable = useStudio((s) => s.setSelectedTable);
  const search = useStudio((s) => s.search);
  const layoutMode = useStudio((s) => s.layoutMode);
  const layoutNonce = useStudio((s) => s.layoutNonce);
  const colorByCommunity = useStudio((s) => s.colorByCommunity);
  const showCross = useStudio((s) => s.showCrossCommunityEdges);
  const showLabels = useStudio((s) => s.showEdgeLabels);
  const appendReference = useStudio((s) => s.appendReference);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const topologyRef = useRef('');
  const layoutModeRef = useRef(layoutMode);
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});

  const neighbors = useMemo(() => {
    const set = new Set<string>();
    if (!selectedTable || !parsed) return set;
    set.add(selectedTable);
    parsed.relations.forEach((r) => {
      if (r.sourceTable === selectedTable) set.add(r.targetTable);
      if (r.targetTable === selectedTable) set.add(r.sourceTable);
    });
    return set;
  }, [selectedTable, parsed]);

  const build = useCallback(async (forceLayout = false) => {
    if (!parsed || !analysis) { setNodes([]); setEdges([]); return; }
    const topology = JSON.stringify({ tables: parsed.tables.map((t) => [t.id, t.fields.map((f) => f.name)]), refs: parsed.relations.map((r) => [r.sourceTable, r.targetTable, r.sourceFields, r.targetFields]) });
    const shouldLayout = forceLayout || topologyRef.current !== topology || layoutModeRef.current !== layoutMode;
    topologyRef.current = topology;
    layoutModeRef.current = layoutMode;

    let positions: Record<string, { x: number; y: number }> = { ...positionsRef.current };
    const storageKey = `dbml-layout:${fileName}`;
    if (!shouldLayout && Object.keys(positions).length === 0) {
      try { positions = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { positions = {}; }
    }
    if (shouldLayout || Object.keys(positions).length === 0) {
      positions = await layoutSchema(parsed, analysis, layoutMode);
    }
    positionsRef.current = positions;

    const fkFields = new Map<string, Set<string>>();
    parsed.tables.forEach((t) => fkFields.set(t.id, new Set()));
    parsed.relations.forEach((r) => r.sourceFields.forEach((f) => fkFields.get(r.sourceTable)?.add(f)));
    const q = search.trim().toLowerCase();

    const nextNodes: Node[] = parsed.tables.map((table) => {
      const metric = analysis.nodes[table.id];
      const matches = !q || table.id.toLowerCase().includes(q) || table.fields.some((f) => f.name.toLowerCase().includes(q));
      const selectedContext = neighbors.size === 0 || neighbors.has(table.id);
      return {
        id: table.id,
        type: 'table',
        position: positions[table.id] ?? { x: 0, y: 0 },
        data: {
          table,
          community: colorByCommunity ? (metric?.community ?? 0) : 0,
          foreignFields: [...(fkFields.get(table.id) ?? [])],
          articulation: metric?.articulation,
          dimmed: !matches || !selectedContext,
        },
        selected: selectedTable === table.id,
      };
    });

    const nextEdges: Edge[] = parsed.relations.map((r) => {
      const sC = analysis.nodes[r.sourceTable]?.community ?? 0;
      const tC = analysis.nodes[r.targetTable]?.community ?? 0;
      const cross = sC !== tC;
      const selected = selectedTable && (r.sourceTable === selectedTable || r.targetTable === selectedTable);
      return {
        id: r.id,
        source: r.sourceTable,
        target: r.targetTable,
        sourceHandle: `source:${r.sourceFields[0] ?? ''}`,
        targetHandle: `target:${r.targetFields[0] ?? ''}`,
        type: 'smoothstep',
        label: showLabels ? `${r.sourceRelation} → ${r.targetRelation}` : undefined,
        hidden: cross && !showCross,
        animated: Boolean(selected),
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        style: { strokeWidth: selected ? 2.5 : 1.35, stroke: selected ? '#f8fafc' : cross ? '#64748b' : '#94a3b8', opacity: selectedTable && !selected ? 0.13 : 0.72 },
        labelStyle: { fill: '#cbd5e1', fontSize: 10 },
        labelBgStyle: { fill: '#111827', fillOpacity: 0.9 },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
      };
    });

    setNodes(nextNodes);
    setEdges(nextEdges);
  }, [parsed, analysis, fileName, layoutMode, search, colorByCommunity, showCross, showLabels, selectedTable, neighbors, setNodes, setEdges]);

  useEffect(() => { void build(false); }, [build]);
  useEffect(() => { if (layoutNonce) void build(true); }, [layoutNonce]);

  const onNodeDragStop = useCallback((_event: unknown, node: Node) => {
    try {
      const key = `dbml-layout:${fileName}`;
      const current = JSON.parse(localStorage.getItem(key) || '{}');
      current[node.id] = node.position;
      positionsRef.current[node.id] = node.position;
      localStorage.setItem(key, JSON.stringify(current));
    } catch {}
  }, [fileName]);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) return;
    const sourceField = connection.sourceHandle.split(':').slice(1).join(':');
    const targetField = connection.targetHandle.split(':').slice(1).join(':');
    if (sourceField && targetField) appendReference(connection.source, sourceField, connection.target, targetField);
  }, [appendReference]);

  if (!parsed?.tables.length) return <div className="canvas-empty"><div>Open a DBML file to render its schema.</div><small>The included Invello example loads automatically on first launch.</small></div>;

  return <ReactFlow
    nodes={nodes}
    edges={edges}
    nodeTypes={nodeTypes}
    onNodesChange={onNodesChange}
    onEdgesChange={onEdgesChange}
    onNodeDragStop={onNodeDragStop}
    onNodeClick={(_, node) => setSelectedTable(node.id)}
    onPaneClick={() => setSelectedTable(undefined)}
    onConnect={onConnect}
    fitView
    minZoom={0.08}
    maxZoom={2.2}
    snapToGrid
    snapGrid={[12,12]}
    selectionOnDrag
    panOnScroll
    deleteKeyCode={null}
    proOptions={{ hideAttribution: true }}
  >
    <Background gap={20} size={1} color="#1f2937" />
    <Controls position="bottom-right" />
    <MiniMap
      position="bottom-left"
      pannable
      zoomable
      nodeColor={(n) => palette[(analysis.nodes[n.id]?.community ?? 0) % palette.length]}
      maskColor="rgba(2,6,23,.72)"
      style={{ background: '#0b1220' }}
    />
  </ReactFlow>;
}

export function SchemaCanvas() {
  return <div className="canvas-wrap"><ReactFlowProvider><CanvasInner /></ReactFlowProvider></div>;
}
