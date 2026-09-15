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
- La app **no es un diagramador de flujo**: no hay aristas ni conexiones entre
  nodos (los handles de React Flow están deshabilitados). Las relaciones se
  declararán como propiedades del nodo en fases posteriores — por ahora cada
  nodo reserva `"sourceRef": null` para eso.
- El grafo se persiste en `$APPDATA/grafo.json` (`src/persistence.js`) como un
  **array con un único objeto** `[{ version: 2, areas, nodes }]` — sin `edges`.
  `nodes[].sourceRef` siempre presente (reservado, hoy `null`).
- Las posiciones de los nodos son solo de UI y no se persisten: al cargar se
  ubican en una grilla simple por índice (`defaultPosition` en `src/store.js`).
  No hay layout automático (no se usa `@dagrejs/dagre`, aunque sigue instalado
  por si se necesita en una fase futura).
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