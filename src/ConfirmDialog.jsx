import { useEffect } from "react";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
};

const boxStyle = {
  background: "#ffffff",
  borderRadius: 8,
  padding: 20,
  minWidth: 280,
  maxWidth: 360,
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
  fontFamily: "sans-serif",
  fontSize: 14,
  color: "#1f2937",
};

function ConfirmDialog({ message, onConfirm, onCancel }) {
  useEffect(() => {
    // Fase de captura: se ejecuta antes que el listener de Escape del
    // panel/canvas (que esta en fase de burbuja), asi que Escape cierra
    // solo este dialogo y no arrastra consigo el panel de atras.
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [onCancel]);

  return (
    <div style={overlayStyle} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={boxStyle}>
        <p style={{ margin: 0 }}>{message}</p>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
