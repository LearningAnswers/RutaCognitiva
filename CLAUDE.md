# RutaCognitiva

App de escritorio (Tauri 2 + React 18 + Vite) para visualizar rutas de
aprendizaje como grafos.

## Convenciones del proyecto

- Puerto de desarrollo fijo: `http://127.0.0.1:1420` (definido en
  `src-tauri/tauri.conf.json` como `devUrl`). No lo reutilices para otro
  servidor mientras trabajes en este repo o en paralelo con `npm run tauri dev`.
- Dependencias JS permitidas más allá del scaffold de Tauri/Vite/React:
  `reactflow`, `zustand`, `@dagrejs/dagre`, `@tauri-apps/plugin-fs`. No agregar
  routers, frameworks CSS, linters extra ni otras dependencias sin que se pida
  explícitamente.
- El `identifier` de `tauri.conf.json` es literalmente `"rutacognitiva"` (no
  `com.rutacognitiva.app`) **a propósito**: en Tauri v2, `$APPDATA` resuelve a
  `<dataDir>/{identifier}`, así que el identifier ES el nombre de la carpeta.
  Si algún día se cambia el identifier, `$APPDATA` (y por tanto la ruta de
  `grafo.json`) cambia con él — hay que actualizar `capabilities/default.json`
  a la vez.
- El plugin `fs` de Tauri está *scoped* únicamente a `$APPDATA` (=
  `%APPDATA%\rutacognitiva\` en Windows) y sus subcarpetas, con permisos finos
  (`allow-mkdir`, `allow-exists`, `allow-read-text-file`,
  `allow-write-text-file`) en vez de `fs:default`/`fs:allow-app-*-recursive`,
  para no abrir acceso a AppConfig/AppLocalData/AppCache/AppLog. Ver
  `src-tauri/capabilities/default.json`.
- La app **no es un diagramador de flujo**: las relaciones Padre/Hijo se crean
  y quitan desde el panel lateral (chips + autocompletado), nunca arrastrando
  líneas entre nodos (`nodesConnectable={false}`, `nodesDraggable={false}`).
  Viven exclusivamente en `edges[]` (`{id, source, target}`, source=padre);
  es un DAG (múltiples padres/hijos), con validación de ciclos en el store y
  "nadie puede ser padre de `aldo`".
- **`RutaNode.jsx` DEBE llevar un `<Handle type="target">` y un
  `<Handle type="source">`, aunque sean invisibles.** React Flow no dibuja una
  arista si alguno de sus nodos no tiene handle medido en el DOM: descarta la
  arista en silencio (`EdgeRenderer`, error interno 008, `return null`) y los
  nodos sí se ven, así que parece un bug de estilo/z-index cuando no lo es.
  Por eso los handles son `opacity: 0` (NUNCA `display: none`, rompe la
  medición) + `pointerEvents: none` + `isConnectable={false}`. Verificado en
  `@reactflow/core` (`getHandle`/`getHandleBounds`) y renderizando en Chrome
  headless: sin handles 0 aristas en el DOM, con handles 1. Ver H-007 en
  `docs/HALLAZGOS.md` (rama `chore/agent-tooling`).
- El nodo también lleva `className="nopan"`: con `nodesDraggable={false}` React
  Flow deja de agregar esa clase solo, y un arrastre que empieza sobre un nodo
  paneaba todo el canvas.
- El grafo se persiste en `$APPDATA/grafo.json` (`src/persistence.js`) como un
  **array con un único objeto** `[{ version: 3, areas, nodes, edges }]`. Sin
  `sourceRef` (lo reemplazó `edges[]`); los archivos v2 se migran al leer.
- Las posiciones NO se persisten: `src/layout.js` las calcula con dagre
  (`rankdir: "LR"`) en cada cambio estructural, determinista (ids ordenados) y
  memoizado por firma de nodos+relaciones; los nodos sin relaciones van en una
  fila aparte. El deslizamiento de 300ms es una regla CSS en `index.html`.
- El autosave tiene debounce de 500ms (`src/store.js`), así que cerrar la
  ventana justo después de editar podía perder el último cambio. Por eso
  `Canvas` (en `App.jsx`) intercepta `onCloseRequested` de
  `@tauri-apps/api/window`, llama a `flushSave()` (guarda ya, sin esperar el
  debounce) y recién entonces destruye la ventana. Requiere el permiso
  `core:window:allow-destroy` en `capabilities/default.json` (no viene en
  `core:default`).
- Compilar el lado Rust (`cargo check`/`tauri dev`/`tauri build`) requiere
  usar una shell donde el `link.exe` de MSVC Build Tools esté en el PATH
  (PowerShell nativo funciona; Git Bash puede shadowear `link.exe` con el
  suyo propio y romper el link).