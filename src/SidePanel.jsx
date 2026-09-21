import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

const PANEL_WIDTH = 340;

const ADD_RELATION_ERRORS = {
  cycle: "Esa relación crearía un ciclo.",
  "root-target": "El nodo raíz no puede tener padres.",
  duplicate: "Esa relación ya existe.",
  self: "Un nodo no puede relacionarse consigo mismo.",
};

function RelationSection({ label, relations, allNodes, excludeId, onNavigate, onRemove, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const excludeIds = new Set([excludeId, ...relations.map((r) => r.nodeId)]);
  const q = query.trim().toLowerCase();
  const candidates = q
    ? allNodes.filter((n) => !excludeIds.has(n.id) && n.data.titulo.toLowerCase().includes(q))
    : [];

  function handlePick(candidateId) {
    const result = onAdd(candidateId);
    if (!result.ok) {
      setError(ADD_RELATION_ERRORS[result.reason] ?? "No se pudo crear la relación.");
      return;
    }
    setQuery("");
    setAdding(false);
    setError(null);
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" }}>{label}</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {relations.map(({ edgeId, nodeId }) => {
          const n = allNodes.find((x) => x.id === nodeId);
          return (
            <span
              key={edgeId}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 999,
                background: "#f3f4f6",
                fontSize: 12,
                color: "#374151",
              }}
            >
              <button
                type="button"
                onClick={() => onNavigate(nodeId)}
                style={{ border: "none", background: "none", cursor: "pointer", padding: 0, font: "inherit", color: "inherit" }}
              >
                {n?.data.titulo ?? nodeId}
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove({ edgeId, nodeId })}
                aria-label="Quitar relación"
                style={{ border: "none", background: "none", cursor: "pointer", padding: 0, color: "#9ca3af", fontSize: 13, lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>

      {adding ? (
        <div style={{ marginTop: 6 }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setAdding(false);
                setQuery("");
                setError(null);
              }
            }}
            onBlur={() => {
              if (!query.trim()) setAdding(false);
            }}
            placeholder="Buscar nodo..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "4px 6px",
              fontSize: 13,
              border: "1px solid #d1d5db",
              borderRadius: 4,
            }}
          />
          {candidates.length > 0 && (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 4, marginTop: 2, maxHeight: 140, overflowY: "auto", background: "#fff" }}>
              {candidates.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePick(n.id)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", border: "none", background: "none", cursor: "pointer", fontSize: 13 }}
                >
                  {n.data.titulo}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{ marginTop: 6, border: "none", background: "none", color: "#4A90D9", fontSize: 12, cursor: "pointer", padding: 0 }}
        >
          + agregar
        </button>
      )}

      {error && <div style={{ marginTop: 4, fontSize: 11, color: "#b91c1c" }}>{error}</div>}

      {confirmRemove && (
        <ConfirmDialog
          message={`¿Quitar la relación con "${allNodes.find((n) => n.id === confirmRemove.nodeId)?.data.titulo ?? confirmRemove.nodeId}"?`}
          onConfirm={() => {
            onRemove(confirmRemove.edgeId);
            setConfirmRemove(null);
          }}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}

// Selector de area con la muestra de color de cada opcion (un <select>
// nativo no puede mostrar colores). La lista va en flujo normal, no
// flotante, para no quedar recortada por el scroll del panel.
function AreaSelect({ areas, value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = areas.find((a) => a.id === value) ?? null;

  function choose(areaId) {
    onChange(areaId);
    setOpen(false);
  }

  const optionStyle = (selected) => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "6px 8px",
    border: "none",
    background: selected ? "#f3f4f6" : "none",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
    fontSize: 13,
    color: "#374151",
  });

  const swatch = (color) => (
    <span
      style={{
        width: 12,
        height: 12,
        borderRadius: 3,
        flexShrink: 0,
        background: color ?? "transparent",
        border: color ? "none" : "1px dashed #9ca3af",
      }}
    />
  );

  return (
    <div
      style={{ marginTop: 20 }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" }}>Área</div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          ...optionStyle(false),
          border: "1px solid #d1d5db",
          borderRadius: 6,
          background: "#ffffff",
        }}
      >
        {swatch(current?.color)}
        <span style={{ flex: 1 }}>{current ? current.nombre : "Sin área"}</span>
        <span style={{ color: "#9ca3af", fontSize: 11 }}>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            marginTop: 4,
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            maxHeight: 180,
            overflowY: "auto",
            background: "#ffffff",
          }}
        >
          <button type="button" role="option" aria-selected={!current} onClick={() => choose(null)} style={optionStyle(!current)}>
            {swatch(null)}
            <span>Sin área</span>
          </button>
          {areas.map((a) => (
            <button
              key={a.id}
              type="button"
              role="option"
              aria-selected={a.id === value}
              onClick={() => choose(a.id)}
              style={optionStyle(a.id === value)}
            >
              {swatch(a.color)}
              <span>{a.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SidePanel({
  node,
  isRoot,
  nodes,
  edges,
  areas,
  autoEditTitle,
  onAutoEditConsumed,
  onNavigate,
  onRename,
  onSetArea,
  onToggleStatus,
  onDelete,
  onAddRelation,
  onRemoveRelation,
  onClose,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const skipBlurRef = useRef(false);

  useEffect(() => {
    if (!node) return;
    setTitleDraft(node.titulo);
    setConfirmingDelete(false);
    if (autoEditTitle) {
      setEditingTitle(true);
      onAutoEditConsumed?.();
    } else {
      setEditingTitle(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id]);

  function commitTitle() {
    skipBlurRef.current = true;
    if (node) onRename(titleDraft);
    setEditingTitle(false);
  }

  function cancelTitle() {
    skipBlurRef.current = true;
    if (node) setTitleDraft(node.titulo);
    setEditingTitle(false);
  }

  function handleTitleBlur() {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    commitTitle();
  }

  const isCompleted = node?.status === "completed";
  const parentRelations = node ? edges.filter((e) => e.target === node.id).map((e) => ({ edgeId: e.id, nodeId: e.source })) : [];
  const childRelations = node ? edges.filter((e) => e.source === node.id).map((e) => ({ edgeId: e.id, nodeId: e.target })) : [];
  const relationCount = parentRelations.length + childRelations.length;

  return (
    <div
      style={{
        width: PANEL_WIDTH,
        flexShrink: 0,
        height: "100%",
        background: "#ffffff",
        borderLeft: "1px solid #e5e7eb",
        boxSizing: "border-box",
        padding: 24,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        fontFamily: "sans-serif",
        color: "#1f2937",
        transform: node ? "translateX(0)" : `translateX(${PANEL_WIDTH}px)`,
        transition: "transform 200ms ease",
        pointerEvents: node ? "auto" : "none",
        position: "relative",
      }}
    >
      {node && (
        <>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              border: "none",
              background: "none",
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
              color: "#9ca3af",
            }}
          >
            ×
          </button>

          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") {
                  e.stopPropagation();
                  cancelTitle();
                }
              }}
              onBlur={handleTitleBlur}
              style={{
                fontSize: 20,
                fontWeight: 600,
                padding: "4px 6px",
                marginTop: 4,
                marginRight: 24,
                border: "1px solid #d1d5db",
                borderRadius: 4,
                boxSizing: "border-box",
                width: "100%",
              }}
            />
          ) : (
            <h2
              onClick={() => !isRoot && setEditingTitle(true)}
              style={{
                fontSize: 20,
                fontWeight: 600,
                margin: "4px 24px 0 0",
                padding: "4px 6px",
                cursor: isRoot ? "default" : "text",
                borderRadius: 4,
              }}
              title={isRoot ? undefined : "Click para editar"}
            >
              {node.titulo}
            </h2>
          )}

          {!isRoot && <AreaSelect key={node.id} areas={areas} value={node.areaId} onChange={onSetArea} />}

          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, textTransform: "uppercase" }}>
              Estado
            </div>
            {isRoot ? (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>No aplica para el nodo raíz.</div>
            ) : (
              <button
                type="button"
                onClick={onToggleStatus}
                style={{
                  padding: "6px 14px",
                  fontSize: 13,
                  borderRadius: 6,
                  cursor: "pointer",
                  border: isCompleted ? "1.5px solid #d97706" : "1px solid #9ca3af",
                  background: isCompleted ? "#fff7ed" : "#f9fafb",
                  color: isCompleted ? "#7c2d12" : "#374151",
                }}
              >
                {isCompleted ? "Completado" : "Pendiente"}
              </button>
            )}
          </div>

          {!isRoot && (
            <RelationSection
              key={`padres-${node.id}`}
              label="Padres"
              relations={parentRelations}
              allNodes={nodes}
              excludeId={node.id}
              onNavigate={onNavigate}
              onRemove={onRemoveRelation}
              onAdd={(candidateId) => onAddRelation(candidateId, node.id)}
            />
          )}

          <RelationSection
            key={`hijos-${node.id}`}
            label="Hijos"
            relations={childRelations}
            allNodes={nodes}
            excludeId={node.id}
            onNavigate={onNavigate}
            onRemove={onRemoveRelation}
            onAdd={(candidateId) => onAddRelation(node.id, candidateId)}
          />

          <div style={{ marginTop: "auto", paddingTop: 24 }}>
            {isRoot ? (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>El nodo raíz no se puede eliminar.</div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                style={{
                  border: "1px solid #fca5a5",
                  background: "none",
                  color: "#b91c1c",
                  fontSize: 12,
                  padding: "6px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Eliminar nodo
              </button>
            )}
          </div>
        </>
      )}

      {confirmingDelete && node && (
        <ConfirmDialog
          message={`¿Eliminar "${node.titulo}"? Se eliminarán también sus ${relationCount} relación(es).`}
          onConfirm={() => {
            setConfirmingDelete(false);
            onDelete();
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

export default SidePanel;
