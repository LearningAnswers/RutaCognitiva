---
name: windows-dev-env
description: Diagnóstico seguro del entorno de desarrollo Windows de este repo Tauri (puertos, procesos zombie, toolchain MSVC). Usar SIEMPRE antes de matar cualquier proceso node, vite, cargo o rutacognitiva.exe, y cuando `tauri dev` o `cargo` fallen con "Port 1420 is already in use", "EADDRINUSE", "link: extra operand", "LNK1104: cannot open file", "Access is denied" al recompilar, o errores del linker MSVC. Incluye un script que distingue procesos de este repo de procesos ajenos (harness, otras herramientas).
---

# Entorno de desarrollo Windows

## Regla principal
**Nunca matar un proceso sin confirmar que pertenece a este repo.** El nombre del proceso
(`node.exe`, `cargo.exe`) no basta: el harness del agente, VS Code y otras herramientas
también corren node. La prueba de pertenencia es la `CommandLine` del proceso, que debe
contener la ruta raíz del repo.

## Procedimiento

1. Ejecuta el diagnóstico (solo lectura):
   ```powershell
   powershell -ExecutionPolicy Bypass -File .claude\skills\windows-dev-env\scripts\dev-status.ps1
   ```
   Reporta: quién escucha en 1420/1421, padre y línea de comandos de cada PID, clasificación
   PROPIO / AJENO, procesos del repo aún vivos, y qué `link` resuelve primero en el PATH.
2. Si hay procesos PROPIOS huérfanos, límpialos con el mismo script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .claude\skills\windows-dev-env\scripts\dev-status.ps1 -Kill
   ```
   `-Kill` solo termina procesos cuya línea de comandos contiene la ruta del repo.
3. Si algo en 1420 es AJENO: **detente y repórtalo**. No lo mates.
4. Vuelve a ejecutar el diagnóstico y confirma que 1420 está libre antes de relanzar.

## Diagnósticos conocidos

| Síntoma | Causa | Acción |
|---|---|---|
| `Port 1420 is already in use` | Vite zombie de una sesión anterior. `vite.config.js` usa `strictPort`, así que falla en lugar de cambiar de puerto: es intencional, no lo "arregles" cambiando el puerto | Paso 2 |
| `link: extra operand` | En Git Bash, `/usr/bin/link` (coreutils) tapa al `link.exe` de MSVC | Compilar desde PowerShell o Developer PowerShell for VS |
| `LNK1104: cannot open file ...rutacognitiva.exe` o `Access is denied` al recompilar | La app de una corrida anterior sigue abierta y bloquea el .exe | Paso 1; cerrar la ventana o `-Kill` |
| `tauri dev` arranca pero la ventana carga en blanco | Vite no levantó o levantó en otro proceso | Paso 1, revisar quién escucha 1420 |

## Salida esperada
Antes de terminar cualquier proceso, reporta la tabla del script (PID, padre, clasificación).
Después, reporta la evidencia de que el puerto quedó libre.
