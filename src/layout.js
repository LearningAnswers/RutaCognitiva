import dagre from "@dagrejs/dagre";

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 56;

let cache = { signature: null, positions: null };

function signatureOf(nodeIds, edges) {
  const nodePart = [...nodeIds].sort().join(",");
  const edgePart = edges
    .map((e) => `${e.source}>${e.target}`)
    .sort()
    .join(",");
  return `${nodePart}|${edgePart}`;
}

// Layout determinista (dagre, rankdir LR) para la parte conectada del
// grafo; los nodos sin ninguna relacion (huerfanos) se acomodan aparte, en
// una fila propia debajo, para que sigan siendo visibles y no se mezclen
// con el arbol principal. El orden de entrada a dagre se fija ordenando
// ids alfabeticamente (nunca se depende del orden de iteracion de un
// array/Set/Map), asi el mismo grafo siempre produce el mismo acomodo.
// Memoizado por firma de {nodos, relaciones}: no recalcula si la
// estructura no cambio (evita parpadeo en renders donde solo cambio un
// titulo/estado/seleccion, que no llaman a esta funcion de todas formas).
export function computeLayout(nodeIds, edges) {
  const signature = signatureOf(nodeIds, edges);
  if (cache.signature === signature) return cache.positions;

  const sortedIds = [...nodeIds].sort();
  const connectedIds = new Set();
  for (const e of edges) {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  }
  const connected = sortedIds.filter((id) => connectedIds.has(id));
  const orphans = sortedIds.filter((id) => !connectedIds.has(id));

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 90 });

  for (const id of connected) {
    g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  const sortedEdges = [...edges].sort((a, b) => {
    const ka = `${a.source}>${a.target}`;
    const kb = `${b.source}>${b.target}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  for (const e of sortedEdges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const positions = {};
  let maxY = 0;
  for (const id of connected) {
    const { x, y } = g.node(id);
    positions[id] = { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 };
    maxY = Math.max(maxY, positions[id].y);
  }

  const orphanRowY = connected.length ? maxY + NODE_HEIGHT + 80 : 0;
  orphans.forEach((id, i) => {
    positions[id] = { x: 80 + i * (NODE_WIDTH + 40), y: orphanRowY };
  });

  cache = { signature, positions };
  return positions;
}
