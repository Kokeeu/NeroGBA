# DESIGN.md - GBA Web Emulator

## Principios
Apariencia consola real, oscuro gamer, 60fps, mobile-first para controles.

## Tema
- bg `#0b0e14`, panel `#151b26`, accent `#7c5cff`, text `#e8ecf1`
- Fuente: Inter/system, mono para FPS.
- Canvas 240x160, escalado entero 2x/3x, `image-rendering: pixelated`, filtro HQ2x off por defecto.

## Layout Desktop
```
[Header: logo + RomPicker + FPS]
[Canvas centrado 3x + ControlsBar: pausa, turbo 2x/4x, mute, slot, screenshot]
[Footer: mapeo teclas]
```

## Layout Móvil (<768px)
Canvas full-width arriba, D-pad izquierda + A/B derecha abajo (44px min touch), L/R hombros arriba, Start/Select centro. `touch-action: none`. PWA instalable.

## Componentes
- `Screen.jsx`: aspect 3:2, letterbox, overlay "Arrastra .gba aquí".
- `ControlsBar`: iconos grandes, estados activos visibles.
- `SettingsModal`: tabla remapeo teclado, volumen slider, frame-skip toggle.
- Toasts para errores: ROM corrupta, WASM fail, audio locked.

## Accesibilidad
Botones con aria-label, foco visible, contraste AA, teclado operable sin ratón.
