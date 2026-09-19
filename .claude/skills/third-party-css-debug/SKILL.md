---
name: third-party-css-debug
description: Procedimiento para depurar problemas de layout, scroll, z-index o eventos (clics, doble clic, hover) causados por el DOM o CSS de librerías de terceros, especialmente React Flow. Usar SIEMPRE antes de modificar estilos cuando aparezca un scrollbar inesperado, un elemento que no recibe clics o doble clic, un canvas en blanco, desalineaciones, o cuando la tentación sea agregar overflow:hidden, z-index o !important "para ver si se arregla".
---

# Depuración DOM/CSS de terceros

## Contexto del repo
- El proyecto usa **`reactflow` v11** (paquete legado), no `@xyflow/react` v12.
  Las clases `.react-flow__*` existen en ambos, pero APIs e imports difieren.
  **No migrar de paquete como efecto secundario de un fix de CSS.** Si una solución
  requiere v12, reportarlo y detenerse: la migración es una fase propia.
- Los estilos base se importan desde `reactflow/dist/style.css`. El orden de ese import
  frente a los estilos propios determina qué regla gana.

## Regla principal
No se ajusta CSS a ciegas. Primero se identifica, en el DOM compilado real, **qué elemento**
causa el síntoma y **qué regla** lo provoca. Solo entonces se escribe el fix mínimo.

## Procedimiento

1. **Abrir DevTools del webview** (build de dev: clic derecho → Inspeccionar, o Ctrl+Shift+I).
2. **Si el problema es de eventos** (clic/doble clic no llega), en la consola:
   ```js
   // Pasa el mouse sobre el punto problemático y ejecuta con las coordenadas:
   document.elementsFromPoint(x, y).map(e => e.tagName + '.' + [...e.classList].join('.'))
   ```
   El primer elemento es el que recibe el evento. Si no es el esperado, revisar su
   `pointer-events`, `z-index` y orden en el DOM.
3. **Si el problema es de tamaño o scroll**, recorrer la cadena de ancestros:
   ```js
   let el = document.querySelector('.react-flow__container');
   while (el) { const s = getComputedStyle(el);
     console.log(el.className || el.tagName, s.position, s.width, s.height, s.overflow);
     el = el.parentElement; }
   ```
   Un `position:absolute; width:100%` se mide contra el ancestro posicionado más cercano,
   no contra el padre directo.
4. **Aplicar el fix mínimo en el sitio correcto** (normalmente el contenedor propio, no las
   clases de la librería) y **dejar un comentario con el porqué** en esa línea.
5. **Registrar el caso** en `docs/HALLAZGOS.md`.

## Casos resueltos en este repo (referencia)
- **Scrollbar horizontal**: `.react-flow__container` usa `position:absolute; width:100%`;
  sin un ancestro posicionado con tamaño definido, desborda. Fix en el contenedor propio.
- **Doble clic no llegaba al pane**: el `<svg>` de `<Background>` quedaba por encima del
  pane e interceptaba el evento. Diagnosticado con `elementsFromPoint`.

## Prohibido sin justificación escrita
`overflow:hidden` en `body`/`#root`, `!important`, `z-index` arbitrarios, o sobrescribir
clases `.react-flow__*` globalmente. Si se usan, el comentario debe decir qué síntoma
resuelven y por qué no había alternativa.
