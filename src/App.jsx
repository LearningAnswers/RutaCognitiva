import { useEffect, useState } from "react";
import ReactFlow, { Background, Controls, ReactFlowProvider, useReactFlow } from "reactflow";
import "reactflow/dist/style.css";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useGraphStore } from "./store";
import RutaNode from "./RutaNode";
import SidePanel from "./SidePanel";

const nodeTypes = { ruta: RutaNode };

function Canvas() {
  const {
    nodes,
    loaded,
    init,
    onNodesChange,
    selectedId,
    selectNode,
    addNode,
    renameNode,
    toggleStatus,
    deleteNode,
    flushSave,
  } = useGraphStore();
  const { screenToFlowPosition } = useReactFlow();
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
    if (!e.target.classList.contains("react-flow__pane")) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const id = addNode(position);
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
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <div style={{ flex: 1, minWidth: 0 }} onDoubleClick={handleDoubleClick}>
        <ReactFlow
          nodes={nodes}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_e, node) => selectNode(node.id)}
          onPaneClick={() => selectNode(null)}
          elementsSelectable={false}
          nodesConnectable={false}
          deleteKeyCode={null}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      <SidePanel
        node={panelNode}
        isRoot={selectedNode?.data.isRoot ?? false}
        autoEditTitle={selectedNode?.id === autoEditId}
        onAutoEditConsumed={() => setAutoEditId(null)}
        onClose={() => selectNode(null)}
        onRename={(titulo) => selectedNode && renameNode(selectedNode.id, titulo)}
        onToggleStatus={() => selectedNode && toggleStatus(selectedNode.id)}
        onDelete={() => selectedNode && deleteNode(selectedNode.id)}
      />
    </div>
  );
}

function App() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}

export default App;
