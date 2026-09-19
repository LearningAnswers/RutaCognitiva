---
name: tauri-source-verification
description: Verifica el comportamiento real de Tauri v2 leyendo el código fuente de la versión instalada (crates en ~/.cargo/registry y paquetes en node_modules/@tauri-apps) y los manifiestos ACL generados, en vez de confiar en ejemplos o blogs. Usar SIEMPRE que se toquen rutas de datos (appDataDir, BaseDirectory, $APPDATA), capabilities o permisos (fs:default, fs:scope, core:window:*), eventos de ventana (onCloseRequested, close, destroy), o cuando algo "no hace nada" sin error visible, aparezca "not allowed by ACL", "forbidden path" o "Command ... not allowed". También antes de afirmar qué incluye un permiso por defecto.
---

# Verificación de Tauri en la fuente instalada

## Por qué existe esta skill
Tauri v2 falla en silencio en los puntos donde más duele: permisos del ACL y rutas.
Un comando rechazado dentro del propio código de Tauri no lanza error visible en la UI;
la acción simplemente no ocurre. La documentación y los ejemplos a veces describen otra
versión. La única fuente confiable es el código instalado en esta máquina.

## Procedimiento

1. **Fija la versión exacta** antes de leer nada:
   ```powershell
   Select-String -Path src-tauri\Cargo.lock -Pattern '^name = "tauri"' -Context 0,1
   Get-Content node_modules\@tauri-apps\api\package.json | Select-String '"version"'
   ```
2. **Localiza la fuente**:
   ```powershell
   Get-ChildItem "$env:USERPROFILE\.cargo\registry\src\*\tauri-2.*" -Directory
   Get-ChildItem "$env:USERPROFILE\.cargo\registry\src\*\tauri-plugin-fs-*" -Directory
   ```
   JS: `node_modules/@tauri-apps/api/` (p. ej. `window.js`) y `node_modules/@tauri-apps/plugin-fs/`.
3. **Para permisos, lee primero el manifiesto generado** (autoridad local, refleja exactamente
   lo que compila este proyecto): `src-tauri/gen/schemas/acl-manifests.json`.
   Busca el identificador (`"default"` dentro de `fs`, `core:window`, etc.) y lista qué
   permisos incluye realmente. No asumas que `core:default` o `fs:default` cubren algo.
4. **Para rutas**, lee `src/path/desktop.rs` del crate `tauri` de la versión fijada y compara
   con `identifier` en `src-tauri/tauri.conf.json`.
5. **Registra** cada comportamiento confirmado en `references/verificado.md` con versión,
   archivo fuente y fecha. Si la versión cambió desde la última entrada, re-verifica.

## Trampas conocidas (verificar, no asumir)

- **Cerrar ventana con `onCloseRequested`.** Al registrar el handler, Tauri deja de cerrar de
  forma nativa y, si no se llama `preventDefault()`, el JS invoca `destroy()` por su cuenta.
  Llamar `destroy()` explícitamente tras `preventDefault()` tiene el mismo requisito:
  **`core:window:allow-destroy`** en la capability. `core:default` no lo incluye.
  Síntoma sin el permiso: la X, Alt+F4 y el cierre desde la barra de tareas no hacen nada.
  Evidencia: el error `not allowed by ACL` solo aparece en la consola del webview.
- **No llamar `close()` dentro del handler de `onCloseRequested`**: vuelve a emitir el evento.
  Para cerrar tras guardar, usar `destroy()` (con el permiso anterior).
- **`$APPDATA` en scopes de fs** ya resuelve a `dataDir()/{identifier}`. Un scope como
  `$APPDATA/rutacognitiva` apunta a una **subcarpeta** dentro del directorio del identifier,
  no a `%APPDATA%\rutacognitiva`. Confirmar contra `desktop.rs` y contra dónde aparece
  realmente el archivo en disco.
- **Errores de ACL solo se ven en DevTools** (clic derecho → Inspeccionar en build de dev).
  Revisar la consola antes de concluir que "el código no se ejecuta".

## Salida esperada al usar esta skill
Toda afirmación sobre comportamiento de Tauri se reporta con: versión, archivo fuente
leído (ruta), y la línea o bloque relevante resumido. Si no se pudo leer la fuente, decirlo
explícitamente y marcar la afirmación como no verificada.
