# Hallazgos persistentes

Bitacora tipo A3 minimo. Regla de promocion: si un patron aparece por **segunda vez**,
se convierte en skill (`.claude/skills/`), script o test. Un hallazgo que solo vive aqui
es conocimiento en riesgo.

## Plantilla
### H-000 · <titulo corto> · <YYYY-MM-DD>
- **Sintoma:** lo que se observo (mensaje de error literal si existe)
- **Causa raiz:** por que ocurrio (con evidencia: archivo, linea, comando)
- **Fix:** que se cambio · commit `<hash>`
- **Guardia:** que impide que vuelva (comentario en codigo / skill / script / test / nada aun)
- **Costo de redescubrirlo:** bajo / medio / alto

---

### H-001 · Scrollbar horizontal en el canvas · 2026-09-15
- **Sintoma:** scrollbar horizontal permanente en la vista del grafo, nodos cortados en el borde al redimensionar
- **Causa raiz:** `.react-flow__container` usa `position:absolute; width:100%` y se media contra un ancestro sin posicionar
- **Fix:** `position: relative` + `minHeight: 0` en el contenedor propio de `<ReactFlow>` · commit `cf08014`
- **Guardia:** comentario en el CSS + skill `third-party-css-debug`
- **Costo de redescubrirlo:** alto

### H-002 · Doble clic no llegaba al pane · 2026-09-15
- **Sintoma:** doble clic sobre el canvas vacio no creaba ningun nodo, sin error en consola
- **Causa raiz:** el `<svg>` de `<Background>` quedaba encima del pane e interceptaba el evento; el chequeo usaba `classList.contains('react-flow__pane')` en vez de `closest(...)`
- **Fix:** `e.target.closest('.react-flow__pane')` + excluir `closest('.react-flow__node')` + `zoomOnDoubleClick={false}` · commit `cf08014`
- **Guardia:** comentario en el componente + skill `third-party-css-debug`
- **Costo de redescubrirlo:** alto

### H-003 · Puerto 1420 ocupado por vite zombie · 2026-09-14
- **Sintoma:** `Port 1420 is already in use`
- **Causa raiz:** proceso vite de una sesion anterior; `strictPort` hace que falle en vez de cambiar de puerto (intencional)
- **Fix:** terminar solo el PID propio
- **Guardia:** `dev-status.ps1` + skill `windows-dev-env`
- **Costo de redescubrirlo:** medio

### H-004 · `link.exe` de Git Bash vs MSVC · 2026-09-14
- **Sintoma:** `link: extra operand` al compilar desde Git Bash
- **Causa raiz:** `/usr/bin/link` de Git tapa al linker de MSVC en el PATH
- **Fix:** compilar desde PowerShell
- **Guardia:** chequeo [3] de `dev-status.ps1` + skill `windows-dev-env`
- **Costo de redescubrirlo:** medio

### H-005 · JSON corrupto dejaba la app en blanco para siempre · 2026-09-19
- **Sintoma:** no observado en la app corriendo (encontrado por auditoria de codigo, reproducido aparte
  corrompiendo una copia de `grafo.json` y leyendo el flujo, sin arriesgar el archivo real del usuario)
- **Causa raiz:** `loadGraph()` no envolvia `JSON.parse` en try/catch; `init()` en el store se llama sin
  `.catch()` desde `App.jsx` — un JSON invalido deja la promesa rechazada sin manejar y `loaded` nunca
  llega a `true`, así que la UI se queda en el `<div>` vacio de "cargando" para siempre, sin ningun error
  visible salvo en la consola del sistema (no del webview)
- **Fix:** try/catch en `loadGraph()`; ante JSON invalido o con forma inesperada, cae a un grafo por
  defecto **en memoria** (se loggea a consola) sin sobrescribir el archivo en disco — para que un typo
  de una edicion a mano sea recuperable cerrando, corrigiendo y reabriendo. Tambien se restituye el nodo
  `aldo` si falta del archivo · commit `46fd8d3` (rama `fase-1-grafo`)
- **Guardia:** comentario en `persistence.js` + esta skill (`tauri-source-verification` para no asumir
  que un `async`/`await` sin `.catch()` en un `useEffect` es inofensivo)
- **Costo de redescubrirlo:** alto (exactamente el escenario que el checklist de verificacion manual pide probar)

### H-006 · Escape en el dialogo de confirmar cerraba tambien el panel · 2026-09-19
- **Sintoma:** no observado en la app corriendo (encontrado por auditoria de codigo)
- **Causa raiz:** el listener global de Escape en `App.jsx` (fase de burbuja, registrado al montar el
  canvas) siempre corre primero; `ConfirmDialog` no escuchaba teclado, asi que Escape deseleccionaba el
  nodo (cerrando el panel completo) en vez de solo cancelar el dialogo
- **Fix:** `ConfirmDialog` escucha Escape en fase de **captura** (corre antes que cualquier listener en
  fase de burbuja, sin importar el orden de montaje) y detiene la propagacion · commit `46fd8d3` (rama
  `fase-1-grafo`)
- **Guardia:** comentario en `ConfirmDialog.jsx`
- **Costo de redescubrirlo:** bajo (UX menor, no perdida de datos)

### H-007 · Las aristas no se dibujaban: nodos custom sin `<Handle>` · 2026-09-20
- **Sintoma:** las relaciones se crean y persisten bien (`grafo.json` con `edges` validos, ids que coinciden
  con `nodes[]`), el layout dagre las refleja, pero en el canvas **no aparece ninguna linea**; los nodos si.
  Parece un bug de estilo/z-index y no lo es.
- **Causa raiz:** `RutaNode.jsx` no tenia ningun `<Handle>` (se quitaron al hacer que la app "no sea un
  diagramador de flujo" y Fase 1B reintrodujo `edges` sin devolverlos; el spec pedia "dibujar aristas" y
  "sin handles" a la vez). En `@reactflow/core`, `EdgeRenderer` resuelve `sourceHandle`/`targetHandle` con
  `getHandle(bounds)`; sin handles en el DOM `getHandleBounds` devuelve `null`, `getHandle` devuelve `null` y
  la arista se descarta con `return null` (error interno 008), en silencio. Verificado en
  `node_modules/@reactflow/core/dist/esm/index.js` (`getHandleBounds` ~L2579, `getHandle` ~L3381,
  `EdgeRenderer` ~L3620) y **renderizando la misma pagina en Chrome headless con y sin handles**:
  sin handles 2 nodos/0 handles/0 aristas; con handles 2 nodos/4 handles/1 arista/1 flecha.
- **Fix:** un `<Handle type="target" position={Left}>` y un `<Handle type="source" position={Right}>` en
  `RutaNode.jsx`, invisibles (`opacity:0`, **nunca** `display:none`: rompe la medicion), `pointerEvents:none`,
  `isConnectable={false}`. `nodesConnectable={false}` sigue impidiendo crear relaciones arrastrando · commit
  `4f3e5c5` (rama `fase-1-grafo`)
- **Guardia:** comentario en `RutaNode.jsx` + regla en `CLAUDE.md` + `.claude/skills/react-flow` (regla 7,
  "al ocultar handles usa opacity:0, nunca display:none")
- **Costo de redescubrirlo:** alto (nada falla ni loguea en la UI; los datos y el layout son correctos)
- **Como diagnosticar la proxima vez:** abrir DevTools y buscar el error `008` de React Flow; o
  `document.querySelectorAll('.react-flow__handle').length` (0 = este bug).

### H-008 · Arrastrar desde un nodo paneaba todo el canvas · 2026-09-20
- **Sintoma:** click-y-arrastre sobre un nodo desplaza el lienzo entero en vez de no hacer nada.
- **Causa raiz:** `NodeWrapper` solo agrega la clase `nopan` cuando el nodo es arrastrable
  (`{ [noPanClassName]: isDraggable }`, `@reactflow/core` ~L3009-3015). Con `nodesDraggable={false}` el nodo
  nunca la recibe y el filtro de pan de d3-zoom (`isWrappedWithClass(event, 'nopan')`, ~L2152) no lo excluye.
- **Fix:** `className="nopan"` puesto a mano en el div de `RutaNode.jsx` (escape hatch que documenta la propia
  libreria) · commit `c13ae0e`
- **Guardia:** comentario en `RutaNode.jsx` + regla en `CLAUDE.md`
- **Costo de redescubrirlo:** medio
