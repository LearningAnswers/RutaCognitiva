import { useEffect, useState } from "react";
import ReactFlow, { Background, Controls, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useGraphStore } from "./store";
import RutaNode from "./RutaNode";
import SidePanel from "./SidePanel";

const nodeTypes = { ruta: RutaNode };
const defaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed, color: "#9ca3af" },
  style: { stroke: "#9ca3af" },
};

function App() {
  const {
    nodes,
    edges,
    loaded,
    init,
    onNodesChange,
    selectedId,
    selectNode,
    addNode,
    renameNode,
    toggleStatus,
    deleteNode,
    addRelation,
    removeRelation,
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

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") selectNode(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectNode]);

  function handleDoubleClick(e) {
    // El Background es un <svg> dibujado encima del pane, así que el
    // target real suele ser ese svg/rect, no el div .react-flow__pane.
    if (!e.target.closest(".react-flow__pane")) return;
    if (e.target.closest(".react-flow__node")) return;
    const id = addNode();
    setAutoEditId(id);
  }

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;
  const panelNode = selectedNode
    ? { id: selectedNode.id, titulo: selectedNode.data.titulo, status: selectedNode.data.status }
    : null;

  if (!loaded) {
    return <div style={{ width: "100%", height: "100%" }} />;
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", overflow: "hidden" }}>
      <div
        style={{ flex: 1, minWidth: 0, minHeight: 0, position: "relative" }}
        onDoubleClick={handleDoubleClick}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
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
        autoEditTitle={selectedNode?.id === autoEditId}
        onAutoEditConsumed={() => setAutoEditId(null)}
        onClose={() => selectNode(null)}
        onNavigate={(id) => selectNode(id)}
        onRename={(titulo) => selectedNode && renameNode(selectedNode.id, titulo)}
        onToggleStatus={() => selectedNode && toggleStatus(selectedNode.id)}
        onDelete={() => selectedNode && deleteNode(selectedNode.id)}
        onAddRelation={addRelation}
        onRemoveRelation={removeRelation}
      />
    </div>
  );
}

export default App;
