# DESIGN.md - GBA Web Emulator

## Principios
NeroGBA Frost: estética celeste kawaii de la referencia `Graphic Design — Shizuku.jpg` + ricing de Linux (waybar, docks, playerbar). 60fps, mobile-first para controles. Solo CSS + reorden ligero de JSX, sin cambios de lógica de emulación.

## Tema — NeroGBA Frost (reemplaza Blue Period)
Referencia: fondo sky celeste + cards blancas translúcidas + pills `TOKYO, JAPAN` + toggles `ON OFF` + tipografía gigante `LOVE / NEROGBA / 03` + playerbar `<< || >>`. Sin copiar la ilustración anime (copyright): todo el fondo es CSS.
- Fondo: `--bg #bfe3f8`, `--bg-2 #e8f6ff`, gradiente sky + dot-grid 22px + blobs blanco/rosa/celeste (`background-attachment: fixed`).
- Panel vidrio: `--panel rgba(255,255,255,.68)` + `backdrop-blur 14px`, `--lienzo rgba(255,255,255,.85)`, borde `1px rgba(255,255,255,.85)` + `outline 1px rgba(15,37,64,.12)`, sombra `--glow 0 8px 32px rgba(30,155,215,.22)`.
- Tinta: `--text / --sumi / --marco #0f2540` (navy, contrasta AA sobre blanco), `--muted #4a6a8a`, `--err #c2274b`.
- Acentos: `--accent #1e9bd7` (botones primarios, waybar), `--accent-2 #7dd0f5`, `--pink / --cartel #ff8fc0` (bubbles CUTE!, turbo ON, toggles), `--melocoton #ffd3e8`.
- Fuentes: Inter/system para UI, `ui-monospace` para waybar/fps/slots (vibe terminal ricing). Foco visible celeste 3px.
- Formas: pills `999px` para waybar/playerbar, cards `18-24px`, ventana stage con titlebar (dots rosa/celeste/blanco + `romName`).
- Canvas del juego sigue negro con marco navy + glow celeste (el juego manda); el resto es vidrio frost.
- Canvas 240x160, escalado entero 2x/3x, `image-rendering: pixelated`, filtro HQ2x off por defecto.
- Tipografía mural solo CSS: `LOVE` vertical outline en `.stage::before`, `NEROGBA · 03` en `.stage::after`, `NEROGBA` outline en `.loader-hero::before`. `pointer-events: none`, nunca tapa el canvas.

## Layout Desktop — ricing grid
```
[Waybar: NeroGBA + switch 01 carga | 02 juego · rom·sys·fps·turbo · Cambiar juego ⚙]
[Lat-izq: JUEGO ⏸/▶ ⟲ ◉ + SLOTS sel+5 | Stage | Lat-der: VIDEO turbo+3 + SISTEMA ♪ vol ⛶ sav×2]
[Recientes + footer]
```
- **Waybar** (`.topbar` sticky): switch segmentado `01 carga / 02 juego` en un solo grupo (activo = navy sólido), centro `.wb-status` mono con `rom · sys · fps · turbo · paused`, derecha solo navegación (Cambiar juego + Ajustes). Sin controles de juego: no duplica nada.
- **Docks** (`.side-stack` izq/der sticky con scroll interno, un solo toggle visible cada vez). Izq: `JUEGO` = transporte (pausa O seguir según estado, reset, screenshot) + `SLOTS` = select + Guardar/Cargar/Borrar/Exportar/Importar. Der: `VIDEO` = turbo `1x/2x/4x` pill ON navy, filtro pixelado/suave, aspecto nativo/4:3, ghosting LCD + `SISTEMA` = mute, slider volumen, fullscreen y batería Exportar/Importar .sav (2 docks por lado para simetría). Espejan `Inverter / Velocidade / Filtros / ON OFF` de la imagen.
- **Docks bajos** (`.dock-row` grid): tres mini-docks con etiqueta mono como los laterales. `SISTEMA` = `ControlsBar.playerbar` (mute + slider volumen + fullscreen, sin panel propio dentro), `SLOTS` = select + Guardar/Cargar/Borrar/Exportar/Importar, `BATERÍA` = Exportar/Importar .sav. En móvil colapsan a 1 columna.
- **Stage-ventana** (`.stage-window`): titlebar + `.stage` negro con mural LOVE + canvas centrado 3x.
- **Toasts** como speech-bubbles blancas con colita (`CUTE! / Add to cart` vibe): info borde celeste, error borde rojo.

## Layout — dos pantallas
- **Carga** (`!booted`): waybar con `01 carga` activo + hero frost (kicker pill `Sala 01 · Carga tu cartucho · ❄ nerogba frost`, CTA Elegir juego navy pill, formatos mono, drag&drop en todo el main) + recientes como launcher dmenu + ayuda. El `Screen`/canvas sigue montado pero oculto con `.is-loader` (ahora oculta `.stage-window`) para que el boot lo reutilice sin rebind.
- **Emulador** (`booted`): waybar con `02 juego` activo + pilas laterales + ventana + touch + footer.

## Layout Móvil (<900px / <768px, coarse)
- Grid colapsa a 1 columna: docks pasan a carrusel horizontal pill (`.dock` row, sin labels), waybar se envuelve (status a fila propia).
- Estilo My Boy intacto: en vertical deck vidrio debajo de la pantalla (fila L » R con turbo central, cruceta izq + A/B en diagonal der con A grande abajo, Select/Start centrados abajo); en horizontal y en fullscreen overlay translúcido sobre el juego (arriba L a la izq, R a la der y pareja menú+turbo centrada como SELECT/START, sin blur de fondo). `touch-action: none`, multitáctil por pointerId. Botones táctiles navy vidrio, B rosa radial, A celeste radial (A grande abajo). PWA instalable.

## Componentes
- `Screen.jsx`: ventana `.stage-window` + `.win-bar` (dots + `romName`) + `.stage` + canvas + overlay "Arrastra .gba aquí".
- `App.jsx`: waybar + `.desktop` (pila-izq + `.fs-wrap` + pila-der) + recientes + footer. Sistema/slots/.sav viven en los docks laterales. Lógica de boot/slots/sav/keymap/fullscreen intacta.
- `SettingsModal`: tabla remapeo teclado (mono pills), volumen slider, filtro/aspecto/ghosting. Sección Audio/Pantalla/Teclado con headers mono celestes.
- `FsMenu`: panel vidrio blanco 96%, botones blancos con leave rosa. Solo en fullscreen. En fullscreen se quita la titlebar pero se conserva el stage azul oscuro + murales + marco del canvas: solo juego + touch + botón ☰.
- Toasts para errores: ROM corrupta, WASM fail, audio locked — bubbles con colita, errores sticky con cierre navy circular.

## Accesibilidad
Botones con aria-label/title, foco visible, contraste AA (navy sobre blanco/vidrio), teclado operable sin ratón. Docks usan `aria-pressed` en toggles. Targets 44px mínimo preservados. Fondos decorativos con `pointer-events: none` y `aria-hidden` donde aplica.
