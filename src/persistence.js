import { appDataDir, join } from "@tauri-apps/api/path";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

const GRAPH_FILE_NAME = "grafo.json";
const VERSION = 3;
const ROOT_NODE = { id: "aldo", titulo: "Aldo", areaId: null, status: "root" };

function emptyGraph() {
  return { version: VERSION, areas: [], nodes: [{ ...ROOT_NODE }], edges: [] };
}

async function getGraphPath() {
  const dir = await appDataDir();
  await mkdir(dir, { recursive: true });
  return join(dir, GRAPH_FILE_NAME);
}

function normalizeNode(n) {
  return {
    id: n.id,
    titulo: n.titulo,
    areaId: n.areaId ?? null,
    status: n.status,
  };
}

function normalizeEdge(e) {
  return { id: e.id, source: e.source, target: e.target };
}

// El nodo raiz nunca deberia faltar (no es borrable desde la UI), pero el
// archivo se puede editar a mano: si "aldo" no esta, se restituye.
function ensureRootNode(nodes) {
  return nodes.some((n) => n.id === "aldo") ? nodes : [{ ...ROOT_NODE }, ...nodes];
}

// Una relacion solo tiene sentido si ambos extremos existen como nodo real;
// protege contra un archivo editado a mano que deje una relacion colgada.
function pruneDanglingEdges(edges, nodes) {
  const ids = new Set(nodes.map((n) => n.id));
  return edges.filter((e) => ids.has(e.source) && ids.has(e.target));
}

export async function loadGraph() {
  const filePath = await getGraphPath();

  if (!(await exists(filePath))) {
    const graph = emptyGraph();
    try {
      await saveGraph(graph);
    } catch (err) {
      console.error(`No se pudo crear ${filePath}:`, err);
    }
    return graph;
  }

  try {
    const raw = await readTextFile(filePath);
    const parsed = JSON.parse(raw);
    const graph = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!graph || typeof graph !== "object") {
      throw new Error("El contenido de grafo.json no tiene la forma esperada");
    }

    const nodes = ensureRootNode((graph.nodes ?? []).map(normalizeNode));
    const edges = pruneDanglingEdges((graph.edges ?? []).map(normalizeEdge), nodes);

    return {
      version: VERSION,
      areas: Array.isArray(graph.areas) ? graph.areas : [],
      nodes,
      edges,
    };
  } catch (err) {
    // No se sobrescribe el archivo aqui: si el JSON esta corrupto por una
    // edicion a mano, el usuario puede cerrar, corregirlo y reabrir sin
    // haber perdido nada. Solo se usa un grafo por defecto EN MEMORIA para
    // esta sesion (y no se guarda hasta que el usuario edite algo).
    console.error(
      `${filePath} no se pudo leer (JSON invalido o con forma inesperada). Se usa un grafo por defecto en memoria sin tocar el archivo:`,
      err
    );
    return emptyGraph();
  }
}

export async function saveGraph(graph) {
  const filePath = await getGraphPath();
  const nodes = ensureRootNode((graph.nodes ?? []).map(normalizeNode));
  const edges = pruneDanglingEdges((graph.edges ?? []).map(normalizeEdge), nodes);
  const payload = {
    version: VERSION,
    areas: Array.isArray(graph.areas) ? graph.areas : [],
    nodes,
    edges,
  };
  await writeTextFile(filePath, JSON.stringify([payload], null, 2));
}
