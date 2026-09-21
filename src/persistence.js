import { appDataDir, join } from "@tauri-apps/api/path";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

const GRAPH_FILE_NAME = "grafo.json";
const VERSION = 3;
const ROOT_NODE = { id: "aldo", titulo: "Aldo", areaId: null, status: "root" };

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
export const DEFAULT_AREA_COLOR = "#6b7280";

export function isHexColor(value) {
  return typeof value === "string" && HEX_COLOR.test(value);
}

// Areas de ejemplo (editables/borrables desde el menu). Solo se siembran al
// CREAR un grafo.json nuevo; un archivo existente nunca se toca.
const SEED_AREAS = [
  { id: "estadistica", nombre: "Estadística", color: "#4A90D9" },
  { id: "programacion", nombre: "Programación", color: "#7B61FF" },
  { id: "matematicas", nombre: "Matemáticas", color: "#E67E22" },
  { id: "idiomas", nombre: "Idiomas", color: "#27AE60" },
];

function emptyGraph() {
  return {
    version: VERSION,
    areas: SEED_AREAS.map((a) => ({ ...a })),
    nodes: [{ ...ROOT_NODE }],
    edges: [],
  };
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

// Un archivo editado a mano puede traer areas invalidas: se descartan las que
// no tienen id/nombre utilizables o repiten id, y un color que no sea #RRGGBB
// cae al gris neutro (asi la UI siempre puede fiarse de que es un hex valido).
function normalizeAreas(areas) {
  if (!Array.isArray(areas)) return [];
  const seen = new Set();
  const result = [];
  for (const a of areas) {
    if (!a || typeof a.id !== "string" || !a.id || seen.has(a.id)) continue;
    const nombre = typeof a.nombre === "string" ? a.nombre.trim() : "";
    if (!nombre) continue;
    seen.add(a.id);
    result.push({ id: a.id, nombre, color: isHexColor(a.color) ? a.color : DEFAULT_AREA_COLOR });
  }
  return result;
}

// El nodo raiz nunca deberia faltar (no es borrable desde la UI), pero el
// archivo se puede editar a mano: si "aldo" no esta, se restituye.
function ensureRootNode(nodes) {
  return nodes.some((n) => n.id === "aldo") ? nodes : [{ ...ROOT_NODE }, ...nodes];
}

// areaId solo es valido si apunta a un area que existe; el raiz nunca tiene area.
function sanitizeNodeAreas(nodes, areas) {
  const areaIds = new Set(areas.map((a) => a.id));
  return nodes.map((n) => ({
    ...n,
    areaId: n.id !== "aldo" && areaIds.has(n.areaId) ? n.areaId : null,
  }));
}

// Una relacion solo tiene sentido si ambos extremos existen como nodo real;
// protege contra un archivo editado a mano que deje una relacion colgada.
function pruneDanglingEdges(edges, nodes) {
  const ids = new Set(nodes.map((n) => n.id));
  return edges.filter((e) => ids.has(e.source) && ids.has(e.target));
}

function buildGraph(graph) {
  const areas = normalizeAreas(graph.areas);
  const nodes = sanitizeNodeAreas(ensureRootNode((graph.nodes ?? []).map(normalizeNode)), areas);
  const edges = pruneDanglingEdges((graph.edges ?? []).map(normalizeEdge), nodes);
  return { version: VERSION, areas, nodes, edges };
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
    return buildGraph(graph);
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
  await writeTextFile(filePath, JSON.stringify([buildGraph(graph)], null, 2));
}
