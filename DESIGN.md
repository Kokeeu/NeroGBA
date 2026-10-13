# DESIGN.md - GBA Web Emulator

## Principios
Exposición Blue Period: galería clara pictórica, 60fps, mobile-first para controles. Solo CSS, sin cambios de layout ni lógica.

## Tema — Blue Period (key visual exposición)
Referencia: `Art School Students Draw Blue Period Exhibit Key` (azul ultramar + papel marfil + bermellón + pañuelo turquesa).
- Papel: `--bg #f4efe4`, `--panel #faf7ef`, `--lienzo #faf7ef`
- Tinta: `--text #141824`, `--sumi #141824` (bordes), `--muted #5a6070`, `--marco #141824`
- Ultramar: `--accent #1b2f7a` (botones), `--accent-2 #2e4a9e`
- Acentos cartel: `--cartel / --warn #e04a1f` (filetes, turbo activo, B, salir, cinta), `--turquesa #2f8f8b` (A), `--melocoton #f2c9a8`, `--err #b3261e`
- Fuente: Inter/system, mono para FPS/sub. Fondo fibra de papel (doble trama ≤4%), foco visible ultramar 3px.
- Pictórico total con gradientes CSS (sin assets): header con filete bermellón + título con subrayado pincel, stage marco lienzo con cinta de exposición y sombra dura grabada, botones con relieve (`:active` hunde), A/B con borde orgánico, `44px` mínimo táctil preservado.
- El canvas del juego sigue negro con marco tinta (el juego manda); el resto es papel.
- Canvas 240x160, escalado entero 2x/3x, `image-rendering: pixelated`, filtro HQ2x off por defecto.

## Layout Desktop
```
[Header: logo + RomPicker + FPS]
[Canvas centrado 3x + ControlsBar: pausa, turbo 2x/4x, mute, slot, screenshot]
[Footer: mapeo teclas]
```

## Layout — dos pantallas
- **Carga** (`!booted`): hero cartel (sala, CTA Elegir juego, formatos, drag&drop en todo el main) + recientes + ayuda. El `Screen`/canvas sigue montado pero oculto con `.is-loader` para que el boot lo reutilice sin rebind.
- **Emulador** (`booted`): header compacto (ROM · sistema · fps + Cambiar juego, que pausa, sale de fullscreen y vuelve a carga) + pantalla + pad táctil + transporte + slots + .sav + footer.
```
[Carga: hero + dropzone + Recientes]
[Emulador: header + canvas + touch + controles + slots + .sav]
```

## Layout Móvil (<768px, coarse)
Estilo My Boy: en vertical deck debajo de la pantalla (fila L » R con turbo central, cruceta izq + A/B en diagonal der con A grande abajo, Select/Start centrados abajo); en horizontal y en fullscreen overlay translúcido sobre el juego (L/R arriba, cruceta abajo-izq, A/B abajo-der, Select/Start abajo-centro). `touch-action: none`, multitáctil por pointerId. PWA instalable.

## Componentes
- `Screen.jsx`: aspect 3:2, letterbox, overlay "Arrastra .gba aquí".
- `ControlsBar`: iconos grandes, estados activos visibles.
- `SettingsModal`: tabla remapeo teclado, volumen slider, frame-skip toggle.
- Toasts para errores: ROM corrupta, WASM fail, audio locked.

## Accesibilidad
Botones con aria-label, foco visible, contraste AA, teclado operable sin ratón.
