import { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useGraphStore, ROOT_ID } from "./store";
import RutaNode from "./RutaNode";
import SidePanel from "./SidePanel";
import AreaMenu from "./AreaMenu";

const nodeTypes = { ruta: RutaNode };

// El gris por defecto de React Flow (#9ca3af) queda casi identico al
// color de los puntos del <Background> (#91919a) y el stroke-width
// default es 1px: la arista se pierde contra el fondo. Se sube el
// contraste y el grosor base.
const EDGE_COLOR = "#6b7280";
const EDGE_COLOR_HIGHLIGHT = "#4A90D9";
const defaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR },
  style: { stroke: EDGE_COLOR, strokeWidth: 1.5 },
};

const DIM_OPACITY = 0.25;
const DIM_TRANSITION = "opacity 250ms ease";

function App() {
  const {
    nodes,
    edges,
    areas,
    loaded,
    init,
    onNodesChange,
    selectedId,
    highlightedAreaId,
    selectNode,
    addNode,
    renameNode,
    toggleStatus,
    deleteNode,
    addRelation,
    removeRelation,
    addArea,
    updateArea,
    deleteArea,
    setNodeArea,
    toggleHighlight,
    clearHighlight,
    flushSave,
  } = useGraphStore();
  const [autoEditId, setAutoEditId] = useState(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let unlisten;
    let cancelled = false;

    appWindow
      .onCloseRequested(async (event) => {
        event.preventDefault();
        try {
          await flushSave();
        } finally {
          await appWindow.destroy();
        }
      })
      .then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [flushSave]);

  // Esc: si hay un area resaltada quita solo el resaltado; si no, cierra el
  // panel. (Los dialogos y los inputs en edicion atrapan su propio Esc antes.)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key !== "Escape") return;
      if (highlightedAreaId) clearHighlight();
      else selectNode(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [highlightedAreaId, clearHighlight, selectNode]);

  function handleDoubleClick(e) {
    // El Background es un <svg> dibujado encima del pane, así que el
    // target real suele ser ese svg/rect, no el div .react-flow__pane.
    if (!e.target.closest(".react-flow__pane")) return;
    if (e.target.closest(".react-flow__node")) return;
    const id = addNode();
    setAutoEditId(id);
  }

  const areaColorById = useMemo(() => new Map(areas.map((a) => [a.id, a.color])), [areas]);

  const nodeCounts = useMemo(() => {
    const counts = {};
    for (const n of nodes) {
      const areaId = n.data.areaId;
      if (areaId) counts[areaId] = (counts[areaId] ?? 0) + 1;
    }
    return counts;
  }, [nodes]);

  // Nodos "encendidos" mientras hay un area resaltada: los de esa area y el
  // raiz (Aldo nunca se atenua). null = no hay resaltado.
  const litIds = useMemo(() => {
    if (!highlightedAreaId) return null;
    const lit = new Set();
    for (const n of nodes) {
      if (n.id === ROOT_ID || n.data.areaId === highlightedAreaId) lit.add(n.id);
    }
    return lit;
  }, [nodes, highlightedAreaId]);

  // El color del area y el atenuado son solo de presentacion: se derivan aqui
  // y no se guardan en el store ni afectan el layout.
  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          areaColor: n.data.areaId ? areaColorById.get(n.data.areaId) ?? null : null,
          dimmed: litIds ? !litIds.has(n.id) : false,
        },
      })),
    [nodes, areaColorById, litIds]
  );

  // Resalta las relaciones del nodo seleccionado (azul) y, con un area
  // resaltada, atenua las aristas cuyos dos extremos no estan encendidos. El
  // estilo se define completo en cada arista (siempre con `transition`, si
  // no el desvanecido solo animaria en un sentido).
  const displayEdges = useMemo(
    () =>
      edges.map((e) => {
        const touchesSelected = selectedId && (e.source === selectedId || e.target === selectedId);
        const dimmed = litIds ? !(litIds.has(e.source) && litIds.has(e.target)) : false;
        const base = touchesSelected
          ? { stroke: EDGE_COLOR_HIGHLIGHT, strokeWidth: 2.5 }
          : { stroke: EDGE_COLOR, strokeWidth: 1.5 };
        return {
          ...e,
          style: { ...base, opacity: dimmed ? DIM_OPACITY : 1, transition: DIM_TRANSITION },
          ...(touchesSelected
            ? { markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR_HIGHLIGHT }, zIndex: 1 }
            : {}),
        };
      }),
    [edges, selectedId, litIds]
  );

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;
  const panelNode = selectedNode
    ? {
        id: selectedNode.id,
        titulo: selectedNode.data.titulo,
        status: selectedNode.data.status,
        areaId: selectedNode.data.areaId,
      }
    : null;

  if (!loaded) {
    return <div style={{ width: "100%", height: "100%" }} />;
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", overflow: "hidden" }}>
      <AreaMenu
        areas={areas}
        nodeCounts={nodeCounts}
        highlightedAreaId={highlightedAreaId}
        onToggleHighlight={toggleHighlight}
        onAdd={addArea}
        onUpdate={updateArea}
        onDelete={deleteArea}
      />

      <div
        style={{ flex: 1, minWidth: 0, minHeight: 0, position: "relative" }}
        onDoubleClick={handleDoubleClick}
      >
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodesChange={onNodesChange}
          onNodeClick={(_e, node) => selectNode(node.id)}
          onPaneClick={() => selectNode(null)}
          elementsSelectable={false}
          nodesConnectable={false}
          nodesDraggable={false}
          zoomOnDoubleClick={false}
          deleteKeyCode={null}
          panOnScroll
          panOnDrag
          zoomOnPinch
          zoomOnScroll={false}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      <SidePanel
        node={panelNode}
        isRoot={selectedNode?.data.isRoot ?? false}
        nodes={nodes}
        edges={edges}
        areas={areas}
        autoEditTitle={selectedNode?.id === autoEditId}
        onAutoEditConsumed={() => setAutoEditId(null)}
        onClose={() => selectNode(null)}
        onNavigate={(id) => selectNode(id)}
        onRename={(titulo) => selectedNode && renameNode(selectedNode.id, titulo)}
        onSetArea={(areaId) => selectedNode && setNodeArea(selectedNode.id, areaId)}
        onToggleStatus={() => selectedNode && toggleStatus(selectedNode.id)}
        onDelete={() => selectedNode && deleteNode(selectedNode.id)}
        onAddRelation={addRelation}
        onRemoveRelation={removeRelation}
      />
    </div>
  );
}

export default App;
