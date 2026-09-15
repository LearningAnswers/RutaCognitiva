import { create } from "zustand";
import { applyNodeChanges } from "reactflow";
import { loadGraph, saveGraph } from "./persistence";

export const ROOT_ID = "aldo";
const AUTOSAVE_DELAY = 500;

let saveTimer = null;

function genId() {
  return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function defaultPosition(index) {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return { x: 80 + col * 220, y: 80 + row * 140 };
}

function toRfNode(rawNode, position) {
  return {
    id: rawNode.id,
    type: "ruta",
    position,
    selected: false,
    data: {
      titulo: rawNode.titulo,
      status: rawNode.status,
      areaId: rawNode.areaId ?? null,
      sourceRef: rawNode.sourceRef ?? null,
      isRoot: rawNode.id === ROOT_ID,
    },
  };
}

function toRawNodes(rfNodes) {
  return rfNodes.map((n) => ({
    id: n.id,
    titulo: n.data.titulo,
    areaId: n.data.areaId,
    status: n.data.status,
    sourceRef: n.data.sourceRef,
  }));
}

function persist(get) {
  const { version, areas, nodes } = get();
  return saveGraph({ version, areas, nodes: toRawNodes(nodes) });
}

function scheduleAutosave(get) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persist(get);
  }, AUTOSAVE_DELAY);
}

export const useGraphStore = create((set, get) => ({
  version: 2,
  areas: [],
  nodes: [],
  selectedId: null,
  loaded: false,

  init: async () => {
    const graph = await loadGraph();
    const nodes = graph.nodes.map((n, i) => toRfNode(n, defaultPosition(i)));
    set({ areas: graph.areas ?? [], nodes, loaded: true });
  },

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  selectNode: (id) => {
    set({
      selectedId: id,
      nodes: get().nodes.map((n) => (n.selected === (n.id === id) ? n : { ...n, selected: n.id === id })),
    });
  },

  addNode: (position) => {
    const id = genId();
    const newNode = toRfNode(
      { id, titulo: "Nuevo nodo", areaId: null, status: "pending", sourceRef: null },
      position
    );
    newNode.selected = true;
    const nodes = get().nodes.map((n) => (n.selected ? { ...n, selected: false } : n)).concat(newNode);
    set({ nodes, selectedId: id });
    scheduleAutosave(get);
    return id;
  },

  renameNode: (id, titulo) => {
    if (id === ROOT_ID) return;
    const trimmed = titulo.trim();
    if (!trimmed) return;
    set({
      nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, titulo: trimmed } } : n)),
    });
    scheduleAutosave(get);
  },

  toggleStatus: (id) => {
    if (id === ROOT_ID) return;
    set({
      nodes: get().nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, status: n.data.status === "completed" ? "pending" : "completed" } }
          : n
      ),
    });
    scheduleAutosave(get);
  },

  deleteNode: (id) => {
    if (id === ROOT_ID) return;
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
    scheduleAutosave(get);
  },

  flushSave: () => {
    clearTimeout(saveTimer);
    return persist(get);
  },
}));
