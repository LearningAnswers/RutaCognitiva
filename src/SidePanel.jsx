import { useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

const PANEL_WIDTH = 340;

function SidePanel({ node, isRoot, autoEditTitle, onAutoEditConsumed, onRename, onToggleStatus, onDelete, onClose }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
    if (node) onRename(titleDraft);
    setEditingTitle(false);
  }

  function cancelTitle() {
    if (node) setTitleDraft(node.titulo);
    setEditingTitle(false);
  }

  const isCompleted = node?.status === "completed";

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
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") cancelTitle();
              }}
              onBlur={commitTitle}
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
          message={`¿Eliminar "${node.titulo}"?`}
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
