import { create } from "zustand";
import { applyNodeChanges } from "reactflow";
import { loadGraph, saveGraph, isHexColor, DEFAULT_AREA_COLOR } from "./persistence";
import { computeLayout } from "./layout";

export const ROOT_ID = "aldo";
const AUTOSAVE_DELAY = 500;

let saveTimer = null;
let saveQueue = Promise.resolve();

function genId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
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
  }));
}

function toRawEdges(rfEdges) {
  return rfEdges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
}

// DFS desde el hijo propuesto buscando al padre propuesto: si lo encuentra,
// agregar parentId->childId cerraria un ciclo.
function wouldCreateCycle(parentId, childId, edges) {
  if (parentId === childId) return true;
  const visited = new Set();
  const stack = [childId];
  while (stack.length) {
    const current = stack.pop();
    if (current === parentId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const e of edges) {
      if (e.source === current) stack.push(e.target);
    }
  }
  return false;
}

// Recalcula posiciones con dagre (via layout.js, memoizado por estructura)
// y las aplica sobre los nodos actuales. Nunca toca `edges` en si.
function relayout(nodes, edges) {
  const positions = computeLayout(
    nodes.map((n) => n.id),
    edges
  );
  return nodes.map((n) => (positions[n.id] ? { ...n, position: positions[n.id] } : n));
}

// Encadena cada guardado sobre el anterior: si un autosave todavia esta
// escribiendo en disco cuando dispara el siguiente (o un flushSave al
// cerrar la ventana), evita que dos escrituras concurrentes se crucen.
// Un fallo (permiso revocado, disco lleno) se registra en consola en vez
// de quedar como una promesa rechazada sin manejar.
function persist(get) {
  const { version, areas, nodes, edges } = get();
  const snapshot = { version, areas, nodes: toRawNodes(nodes), edges: toRawEdges(edges) };
  saveQueue = saveQueue.catch(() => {}).then(() =>
    saveGraph(snapshot).catch((err) => {
      console.error("No se pudo guardar grafo.json:", err);
    })
  );
  return saveQueue;
}

function scheduleAutosave(get) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persist(get);
  }, AUTOSAVE_DELAY);
}

export const useGraphStore = create((set, get) => ({
  version: 3,
  areas: [],
  nodes: [],
  edges: [],
  selectedId: null,
  // Resaltado por area: solo visual, NO se persiste ni toca el layout.
  highlightedAreaId: null,
  loaded: false,

  init: async () => {
    const graph = await loadGraph();
    const rfNodes = graph.nodes.map((n) => toRfNode(n, { x: 0, y: 0 }));
    const rfEdges = graph.edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
    set({
      areas: graph.areas ?? [],
      nodes: relayout(rfNodes, rfEdges),
      edges: rfEdges,
      loaded: true,
    });
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

  addNode: () => {
    const id = genId("n");
    const newNode = toRfNode({ id, titulo: "Nuevo nodo", areaId: null, status: "pending" }, { x: 0, y: 0 });
    newNode.selected = true;
    const nodes = relayout(
      get().nodes.map((n) => (n.selected ? { ...n, selected: false } : n)).concat(newNode),
      get().edges
    );
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
    const edges = get().edges.filter((e) => e.source !== id && e.target !== id);
    const nodes = relayout(
      get().nodes.filter((n) => n.id !== id),
      edges
    );
    set((state) => ({
      nodes,
      edges,
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
    scheduleAutosave(get);
  },

  // source = padre, target = hijo. Nadie puede ser padre de ROOT_ID.
  addRelation: (parentId, childId) => {
    if (childId === ROOT_ID) return { ok: false, reason: "root-target" };
    if (parentId === childId) return { ok: false, reason: "self" };
    const rawEdges = toRawEdges(get().edges);
    if (rawEdges.some((e) => e.source === parentId && e.target === childId)) {
      return { ok: false, reason: "duplicate" };
    }
    if (wouldCreateCycle(parentId, childId, rawEdges)) return { ok: false, reason: "cycle" };

    const edges = [...get().edges, { id: genId("e"), source: parentId, target: childId }];
    set({ nodes: relayout(get().nodes, edges), edges });
    scheduleAutosave(get);
    return { ok: true };
  },

  removeRelation: (edgeId) => {
    const edges = get().edges.filter((e) => e.id !== edgeId);
    set({ nodes: relayout(get().nodes, edges), edges });
    scheduleAutosave(get);
  },

  // ---- Areas de conocimiento (ninguna de estas acciones toca el layout) ----

  addArea: (nombre, color) => {
    const trimmed = (nombre ?? "").trim();
    if (!trimmed) return null;
    const id = genId("a");
    const area = { id, nombre: trimmed, color: isHexColor(color) ? color : DEFAULT_AREA_COLOR };
    set({ areas: [...get().areas, area] });
    scheduleAutosave(get);
    return id;
  },

  updateArea: (id, { nombre, color }) => {
    const trimmed = (nombre ?? "").trim();
    if (!trimmed) return false;
    set({
      areas: get().areas.map((a) =>
        a.id === id ? { ...a, nombre: trimmed, color: isHexColor(color) ? color : a.color } : a
      ),
    });
    scheduleAutosave(get);
    return true;
  },

  // Nunca elimina nodos: los del area quedan con areaId null.
  deleteArea: (id) => {
    set((state) => ({
      areas: state.areas.filter((a) => a.id !== id),
      nodes: state.nodes.map((n) => (n.data.areaId === id ? { ...n, data: { ...n.data, areaId: null } } : n)),
      highlightedAreaId: state.highlightedAreaId === id ? null : state.highlightedAreaId,
    }));
    scheduleAutosave(get);
  },

  // areaId null = "Sin area". El nodo raiz no tiene area.
  setNodeArea: (nodeId, areaId) => {
    if (nodeId === ROOT_ID) return;
    if (areaId !== null && !get().areas.some((a) => a.id === areaId)) return;
    set({
      nodes: get().nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, areaId } } : n)),
    });
    scheduleAutosave(get);
  },

  // Solo un area resaltada a la vez; volver a pulsar la misma la apaga.
  toggleHighlight: (areaId) => {
    set({ highlightedAreaId: get().highlightedAreaId === areaId ? null : areaId });
  },

  clearHighlight: () => set({ highlightedAreaId: null }),

  flushSave: () => {
    clearTimeout(saveTimer);
    return persist(get);
  },
}));
