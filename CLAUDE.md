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
- El grafo se persiste en `$APPDATA/grafo.json` (`src/persistence.js`) como un
  **array con un único objeto** `[{ version, areas, nodes, edges }]` — así lo
  especificó el modelo de datos original; no es un objeto plano en la raíz.
- Las posiciones de los nodos (drag) son solo de UI y no se persisten; se
  recalculan con dagre (`rankdir: "LR"`, `src/layout.js`) cada vez que cambia
  la estructura del grafo (agregar/eliminar nodo o arista).
- Compilar el lado Rust (`cargo check`/`tauri dev`/`tauri build`) requiere
  usar una shell donde el `link.exe` de MSVC Build Tools esté en el PATH
  (PowerShell nativo funciona; Git Bash puede shadowear `link.exe` con el
  suyo propio y romper el link).