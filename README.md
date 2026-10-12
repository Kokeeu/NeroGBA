# NeroGBA

Emulador de Game Boy Advance en el navegador. Vite + React 19 + mGBA compilado a WASM. Sin backend, sin COOP/COEP, funciona en desktop y móvil (PWA instalable).

> Usa solo dumps propios. Este repo no incluye ninguna ROM con copyright ni `bios.bin` (se usa el reemplazo HLE de mGBA).

## Funciones (v1.0)

- Carga local `.gba/.gb/.gbc/.sgb/.zip` por picker o drag & drop, con validación de cabecera.
- Núcleo mGBA-WASM: 60fps, canvas 240x160 pixelado, audio por gesto de usuario, volumen + mute.
- Pausa / seguir / reset / screenshot PNG.
- Turbo 1x→2x→4x (fast-forward sin audio; SDK vendorizado en `src/vendor/mgba-sdk/`, re-sync manual al actualizar `@wasm-gaming/mgba-wasm`).
- Guardados: SRAM de batería en OPFS (autosave) + 4 slots de savestate en IndexedDB con export/import `.state`.
- Input: teclado remapeable (Z=A, X=B, Enter=Start, Shift=Select por defecto), gamepad standard automático, controles táctiles en `pointer: coarse` con multitáctil.
- Display en vivo: filtro pixelado/suave, aspecto nativo/4:3, ghosting LCD. Prefs persistidas.
- PWA: instalable, funciona offline tras primera carga.

## Uso

1. Abre la app (URL de Netlify).
2. Pulsa el picker o arrastra tu `.gba` al canvas.
3. Juega: teclado / mando / táctil. `Guardar` escribe el slot en IndexedDB.

## Desarrollo

```bash
npm install
npm run dev -- --host   # dev desktop + móvil en LAN
npm run lint            # oxlint
npm run build           # build prod a dist/
npm run preview         # servir dist/ para verificar WASM + PWA
```

WASM servido desde `public/mgba/mgba.js` + `public/mgba/mgba.wasm` (URLs relativas a `document.baseURI` para que funcione en raíz y en subpaths).

## Deploy

- Netlify: conectado a `main`, publica `dist/` (`npm run build`). Sin headers COOP/COEP.
- `base: './'` + `public/.nojekyll`: el mismo build vale para Netlify/Vercel (raíz) y GitHub Pages (subpath).

## Stack

Vite 8 · React 19 · `@wasm-gaming/mgba-wasm` · `idb-keyval` · `vite-plugin-pwa` · Canvas 2D · WebAudio · IndexedDB/OPFS.

## Legal

Solo ROMs locales del usuario. Nunca se commitean `*.gba`, `*.sav`, `*.state` ni `bios.bin` (ver `.gitignore`).
