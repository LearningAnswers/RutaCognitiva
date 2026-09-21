import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

const OPEN_WIDTH = 240;
const CLOSED_WIDTH = 44;
const DEFAULT_NEW_COLOR = "#4A90D9";

const iconButton = {
  border: "none",
  background: "none",
  cursor: "pointer",
  color: "#9ca3af",
  fontSize: 14,
  lineHeight: 1,
  padding: "4px 5px",
};

// Nombre + color nativo (<input type="color">), tanto para agregar como editar.
// Enter guarda, Esc cancela (sin llegar al listener global que cierra el panel).
function AreaForm({ initialNombre, initialColor, onSubmit, onCancel }) {
  const [nombre, setNombre] = useState(initialNombre);
  const [color, setColor] = useState(initialColor);
  const canSave = nombre.trim().length > 0;

  function submit() {
    if (canSave) onSubmit(nombre.trim(), color);
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 6, padding: "6px 0" }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          aria-label="Color del área"
          style={{
            width: 28,
            height: 28,
            padding: 0,
            border: "1px solid #d1d5db",
            borderRadius: 4,
            background: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
        />
        <input
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Nombre del área"
          style={{
            flex: 1,
            minWidth: 0,
            boxSizing: "border-box",
            padding: "4px 6px",
            fontSize: 13,
            border: "1px solid #d1d5db",
            borderRadius: 4,
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" onClick={submit} disabled={!canSave}>
          Guardar
        </button>
      </div>
    </div>
  );
}

function AreaMenu({ areas, nodeCounts, highlightedAreaId, onToggleHighlight, onAdd, onUpdate, onDelete }) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  return (
    <div
      style={{
        width: open ? OPEN_WIDTH : CLOSED_WIDTH,
        flexShrink: 0,
        height: "100%",
        boxSizing: "border-box",
        background: "#ffffff",
        borderRight: "1px solid #e5e7eb",
        fontFamily: "sans-serif",
        color: "#1f2937",
        overflowX: "hidden",
        overflowY: "auto",
        padding: open ? "16px 12px" : "16px 0",
        transition: "width 200ms ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: open ? "space-between" : "center" }}>
        {open && <span style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>Áreas</span>}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Colapsar menú de áreas" : "Expandir menú de áreas"}
          title={open ? "Colapsar" : "Áreas"}
          style={{ ...iconButton, fontSize: 18 }}
        >
          {open ? "‹" : "›"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 8 }}>
          {areas.length === 0 && !adding && (
            <div style={{ fontSize: 12, color: "#9ca3af", padding: "4px 6px" }}>Aún no hay áreas.</div>
          )}

          {areas.map((area) => {
            if (editingId === area.id) {
              return (
                <AreaForm
                  key={area.id}
                  initialNombre={area.nombre}
                  initialColor={area.color}
                  onSubmit={(nombre, color) => {
                    onUpdate(area.id, { nombre, color });
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              );
            }

            const active = highlightedAreaId === area.id;
            return (
              <div
                key={area.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  marginTop: 2,
                  borderRadius: 6,
                  background: active ? `${area.color}22` : "transparent",
                }}
              >
                <button
                  type="button"
                  onClick={() => onToggleHighlight(area.id)}
                  aria-pressed={active}
                  title={active ? "Quitar resaltado" : "Resaltar esta área en el canvas"}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    padding: "6px",
                    textAlign: "left",
                    font: "inherit",
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: "inherit",
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: area.color,
                      flexShrink: 0,
                      boxShadow: active ? `0 0 0 2px ${area.color}55` : "none",
                    }}
                  />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {area.nombre}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>
                    {nodeCounts[area.id] ?? 0}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(area.id)}
                  aria-label={`Editar ${area.nombre}`}
                  title="Editar"
                  style={iconButton}
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(area)}
                  aria-label={`Eliminar ${area.nombre}`}
                  title="Eliminar"
                  style={iconButton}
                >
                  ×
                </button>
              </div>
            );
          })}

          {adding ? (
            <AreaForm
              initialNombre=""
              initialColor={DEFAULT_NEW_COLOR}
              onSubmit={(nombre, color) => {
                onAdd(nombre, color);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              style={{
                marginTop: 8,
                border: "none",
                background: "none",
                color: "#4A90D9",
                fontSize: 12,
                cursor: "pointer",
                padding: "4px 6px",
              }}
            >
              + Nueva área
            </button>
          )}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`¿Eliminar el área "${confirmDelete.nombre}"? Sus ${
            nodeCounts[confirmDelete.id] ?? 0
          } nodo(s) quedarán sin área (los nodos no se eliminan).`}
          onConfirm={() => {
            onDelete(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

export default AreaMenu;
