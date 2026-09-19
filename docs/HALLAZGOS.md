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

### H-001 · Scrollbar horizontal en el canvas · <fecha>
- **Sintoma:** scrollbar horizontal permanente en la vista del grafo
- **Causa raiz:** `.react-flow__container` usa `position:absolute; width:100%` y se media contra un ancestro sin posicionar
- **Fix:** `position: relative` en el contenedor propio · commit `<hash>`
- **Guardia:** comentario en el CSS + skill `third-party-css-debug`
- **Costo de redescubrirlo:** alto

### H-002 · Doble clic no llegaba al pane · <fecha>
- **Sintoma:** doble clic sobre el canvas no disparaba el handler
- **Causa raiz:** el `<svg>` de `<Background>` quedaba encima del pane e interceptaba el evento
- **Fix:** <completar> · commit `<hash>`
- **Guardia:** comentario en el componente + skill `third-party-css-debug`
- **Costo de redescubrirlo:** alto

### H-003 · Puerto 1420 ocupado por vite zombie · <fecha>
- **Sintoma:** `Port 1420 is already in use`
- **Causa raiz:** proceso vite de una sesion anterior; `strictPort` hace que falle en vez de cambiar de puerto (intencional)
- **Fix:** terminar solo el PID propio
- **Guardia:** `dev-status.ps1` + skill `windows-dev-env`
- **Costo de redescubrirlo:** medio

### H-004 · `link.exe` de Git Bash vs MSVC · <fecha>
- **Sintoma:** `link: extra operand` al compilar desde Git Bash
- **Causa raiz:** `/usr/bin/link` de Git tapa al linker de MSVC en el PATH
- **Fix:** compilar desde PowerShell
- **Guardia:** chequeo [3] de `dev-status.ps1` + skill `windows-dev-env`
- **Costo de redescubrirlo:** medio
