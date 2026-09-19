---
name: verification-protocol
description: Protocolo de cierre de tarea para este repo que separa lo verificado con evidencia de lo que solo el humano puede validar (sensación de UI, fluidez, alineación, iluminado visual). Usar SIEMPRE al terminar una fase o tarea, antes de decir "listo", "funciona", "arreglado" o hacer commit final, y al reportar resultados al orquestador.
---

# Protocolo de verificación y límites de observación

## Por qué existe
El agente puede demostrar que algo compila, que un archivo tiene cierto contenido o que un
puerto está libre. No puede percibir si una transición se siente fluida o si un nodo se ve
alineado. Mezclar ambas cosas en un "listo" destruye la confianza en todos los reportes.
Si está instalada la skill `verification-before-completion`, aplícala para la parte
verificable; esta skill agrega la separación explícita y el formato de entrega.

## Evidencia verificable disponible en este repo
- Compilación Rust: `cargo check --manifest-path src-tauri/Cargo.toml`
- Build de frontend: `npx vite build`
- Persistencia: contenido de `grafo.json` en la ruta confirmada por la skill
  `tauri-source-verification` (leer el archivo, no suponer)
- Entorno: salida de `dev-status.ps1` (skill `windows-dev-env`)
- Historial: `git status`, `git diff --stat`, `git log --oneline -5`
- Consola del webview (errores de ACL, excepciones), si hay acceso vía DevTools/MCP

## Formato obligatorio de cierre

```
## Verificado (con evidencia)
- <afirmación> — <comando ejecutado en ESTE turno> → <resultado relevante>

## Requiere validación humana
- [ ] <qué mirar> — Pasos: <1. abrir… 2. hacer clic en… 3. debería verse…>

## No verificado / supuestos
- <lo que no se pudo comprobar y por qué>

## Alcance
- Archivos tocados: <n> (límite de la fase: <n>). Desviaciones: <ninguna | cuál y por qué>
```

## Reglas
- Una afirmación sin comando ejecutado en este turno va a "No verificado".
- Cada ítem de validación humana debe ser ejecutable por alguien que no vio la sesión.
- Plataformas: solo Windows está validado. No afirmar nada sobre macOS/Linux.
