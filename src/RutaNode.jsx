function RutaNode({ data, selected }) {
  const { titulo, status, isRoot } = data;
  const isCompleted = status === "completed";

  const style = {
    padding: "10px 16px",
    minWidth: 140,
    borderRadius: 8,
    fontSize: 13,
    textAlign: "center",
    fontFamily: "sans-serif",
    transition: "background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
    cursor: "pointer",
  };

  if (isRoot) {
    style.background = "#ffffff";
    style.border = "3px solid #374151";
    style.color = "#1f2937";
  } else if (isCompleted) {
    style.background = "#fff7ed";
    style.border = "1.5px solid #d97706";
    style.color = "#7c2d12";
    style.boxShadow = "0 0 0 3px rgba(217, 119, 6, 0.12)";
  } else {
    style.background = "#ffffff";
    style.border = "1px solid #9ca3af";
    style.color = "#374151";
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
      {titulo}
    </div>
  );
}

export default RutaNode;
