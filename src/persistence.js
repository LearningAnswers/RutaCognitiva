import { appDataDir, join } from "@tauri-apps/api/path";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

const GRAPH_FILE_NAME = "grafo.json";
const VERSION = 2;

function emptyGraph() {
  return {
    version: VERSION,
    areas: [],
    nodes: [{ id: "aldo", titulo: "Aldo", areaId: null, status: "root", sourceRef: null }],
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
    sourceRef: n.sourceRef ?? null,
  };
}

export async function loadGraph() {
  const filePath = await getGraphPath();

  if (!(await exists(filePath))) {
    const graph = emptyGraph();
    await saveGraph(graph);
    return graph;
  }

  const raw = await readTextFile(filePath);
  const parsed = JSON.parse(raw);
  const graph = Array.isArray(parsed) ? parsed[0] : parsed;

  return {
    version: VERSION,
    areas: graph.areas ?? [],
    nodes: (graph.nodes ?? []).map(normalizeNode),
  };
}

export async function saveGraph(graph) {
  const filePath = await getGraphPath();
  const payload = {
    version: VERSION,
    areas: graph.areas ?? [],
    nodes: (graph.nodes ?? []).map(normalizeNode),
  };
  await writeTextFile(filePath, JSON.stringify([payload], null, 2));
}
