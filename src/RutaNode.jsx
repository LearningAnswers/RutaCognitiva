import { Handle, Position } from "reactflow";

// React Flow NO dibuja una arista si alguno de sus dos nodos no tiene un
// <Handle> del tipo correspondiente: EdgeRenderer busca los handles medidos
// en el DOM y, si `sourceHandle`/`targetHandle` quedan en null, descarta la
// arista en silencio (error interno 008). Por eso los nodos llevan un
// handle "source" (derecha, el hijo cuelga de aqui) y uno "target"
// (izquierda) para el layout LR. Son solo puntos de anclaje: invisibles
// (opacity:0, NO display:none, que rompe la medicion) y sin interaccion.
// Que nadie pueda crear relaciones arrastrando lo sigue garantizando
// nodesConnectable={false} en <ReactFlow>.
const anchorStyle = { opacity: 0, pointerEvents: "none" };

// areaColor llega SIEMPRE como #RRGGBB valido (persistence.js y el store lo
// garantizan), por eso se le puede pegar un sufijo de alfa de 2 digitos.
// dimmed lo calcula App.jsx para el resaltado por area (el raiz nunca).
function RutaNode({ data, selected }) {
  const { titulo, status, isRoot, areaColor, dimmed } = data;
  const isCompleted = status === "completed";

  const style = {
    position: "relative",
    padding: "10px 16px",
    minWidth: 140,
    borderRadius: 8,
    fontSize: 13,
    textAlign: "center",
    fontFamily: "sans-serif",
    transition:
      "background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease, opacity 250ms ease",
    cursor: "pointer",
    opacity: dimmed ? 0.25 : 1,
  };

  if (isRoot) {
    style.background = "#ffffff";
    style.border = "3px solid #374151";
    style.color = "#1f2937";
  } else if (isCompleted && areaColor) {
    // Iluminado con el color del area: tinte suave, borde solido y glow.
    style.background = `${areaColor}1f`;
    style.border = `1.5px solid ${areaColor}`;
    style.color = "#1f2937";
    style.boxShadow = `0 0 0 3px ${areaColor}22, 0 0 14px ${areaColor}66`;
  } else if (isCompleted) {
    // Completado sin area: acento neutro (el ambar de siempre).
    style.background = "#fff7ed";
    style.border = "1.5px solid #d97706";
    style.color = "#7c2d12";
    style.boxShadow = "0 0 0 3px rgba(217, 119, 6, 0.12)";
  } else {
    style.background = "#ffffff";
    style.border = "1px solid #9ca3af";
    style.color = "#374151";
    // Pendiente con area: franja izquierda del color del area.
    if (areaColor) style.borderLeft = `5px solid ${areaColor}`;
  }

  if (selected) {
    style.outline = "2px solid #4A90D9";
    style.outlineOffset = 2;
  }

  // "nopan": con nodesDraggable=false, React Flow deja de agregar esta
  // clase automaticamente (solo la agrega si el nodo es arrastrable), asi
  // que un click-y-arrastre que empieza sobre el nodo cae al pane y
  // panea todo el canvas. Se agrega a mano porque es exactamente el
  // escape hatch que documenta el propio código fuente de la libreria.
  return (
    <div className="nopan" style={style}>
      <Handle type="target" position={Position.Left} isConnectable={false} style={anchorStyle} />
      {titulo}
      <Handle type="source" position={Position.Right} isConnectable={false} style={anchorStyle} />
    </div>
  );
}

export default RutaNode;
