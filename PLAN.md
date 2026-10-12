# PLAN.md - Emulador GBA Web

Base: `C:\Users\jason\OneDrive\Desktop\Emulador\` (Vite + React 19, vacía al inicio).
Núcleo elegido: mGBA-WASM. ROMs: solo locales. Plataforma: desktop + móvil. MVP: pausa/turbo/audio + input completo + guardados.

## Fase 0 - Scaffold (0.5d) — DONE
- [x] `npm create vite@latest . -- --template react` en `Emulador/`
- [x] `npm i idb-keyval vite-plugin-pwa`
- [x] Crear AGENT.md / DESIGN.md / PLAN.md

## Fase 1 - Spike WASM (1d) — DONE (pendiente boot con ROM real del usuario)
- [x] Evaluado: `@wasm-gaming/mgba-wasm@0.1.1` (sin threads/COOP-COEP, ~810KB, SDK load/start/pause/saveState/screenshot) vs `@thenick775/mgba-wasm` (requiere COOP-COEP, descartado por iOS).
- [x] `npm i @wasm-gaming/mgba-wasm`, copiado `mgba.js/wasm` a `public/mgba/` (servido 200, `application/wasm` verificado en preview :4173).
- [x] `src/emulator/romLoader.js` (validación ext/tamaño, warning cabecera 0xB2, namespace sha1) + `src/emulator/core.js` (wrapper load con jsUrl/wasmUrl explícitos).
- [x] `src/App.jsx` spike: picker + drag&drop, canvas 240x160 pixelated, pausa/seguir/reset/screenshot/savestate slot 1, volumen, fps, avisos. `npm run build` ok.

## Fase 2 - Bridge + Slots + Input (1d) — DONE
- [x] `src/emulator/EmulatorBridge.js`: boot/pause/resume/reset/screenshot/save-load slots/volumen/keymap. Hilo principal (SDK no movible a Worker: documentado en AGENT.md).
- [x] `src/emulator/storage.js`: 4 slots savestate en IndexedDB (idb-keyval) + export/import `.state`. SRAM batería la persiste el SDK en OPFS.
- [x] `src/emulator/input/keyboard.js`: mapa remapeable persistido en localStorage, aplicado vía `engine.setInput`. Gamepad standard ya lo sondea el SDK.
- [x] `App.jsx`: selector slots 1-4 con indicadores ●/○, guardar/cargar/borrar/exportar/importar, editor de teclado por captura, pausa/reset/screenshot/volumen/fps.

## Fase 3 - Screen + Audio (1d) — DONE
- [x] Render y audio los gestiona el SDK (blit a canvas + AudioWorklet con resample, unlock por gesto). Sin `audio.js` propio: documentado.
- [x] `src/components/Screen.jsx`: stage + canvas + overlay + drag&drop.
- [x] `src/components/ControlsBar.jsx`: pausa/seguir/reset/screenshot + volumen/mute + filtro (pixelado/suave) + aspecto (nativo/4:3) + ghosting LCD, todo en vivo vía `config.write`.
- [x] `EmulatorBridge`: prefs de display persistidas (`gba-display-v1`), mute con restauración de volumen, `lint` limpio + `build` ok.

## Fase 4 - Input (0.5d) — DONE en Fase 2
- [x] `keyboard.js` remapeable (defaults Z=A X=B Enter=Start Shift=Select).
- [x] Gamepad standard: lo sondea el SDK cada frame, sin código propio.
- [ ] `touch.jsx` overlay solo `pointer:coarse` → pasa a Fase 7 (móvil).

## Fase 5 - Controles MVP (0.5d) — PARCIAL (hecho en Fases 2-3)
- [x] `ControlsBar.jsx`: pausa, screenshot PNG, selector slots.
- [ ] Turbo 2x/4x: el SDK no expone multiplicador (loop interno máx. 5 frames/tick). Requiere patch del SDK o rAF propio → aparcado.

## Fase 6 - Saves (0.5d) — DONE en Fase 2
- [x] `storage.js`: 4 slots savestate en IndexedDB + export/import `.state`. SRAM en OPFS por el SDK (autosave 15s + al pausar).

## Fase 7 - Móvil / PWA (1d) — DONE
- [x] `src/components/TouchControls.jsx`: D-pad + A/B + L/R + Start/Select vía KeyboardEvents sintéticos sobre el keymap activo (el SDK ya escucha `e.code` en window). Solo con juego arrancado, oculto en punteros finos vía `@media (pointer: coarse)`, `touch-action: none`, multitáctil por pointerId.
- [x] Responsive: canvas full-width en <768px, editor de teclado oculto en móvil, viewport-fit=cover.
- [x] PWA: `vite-plugin-pwa` (autoUpdate) + manifest GBA Web + `pwa-icon.svg`. `build` genera `sw.js` + `manifest.webmanifest` (200 en preview).

## Deploy (Vercel / Netlify / GitHub Pages) — DONE
- [x] `base: './'` + manifest (`scope`, `start_url`, icono) relativo + `public/.nojekyll`.
- [x] Verificado bajo subpath `/repo/` (simula Pages): index, assets, `mgba.js`, `mgba.wasm`, manifest → 200. La URL absoluta antigua `/mgba/...` da 404 ahí (por eso fallaba).
- Vercel/Netlify (raíz + HTTPS): sin config extra, sin COOP/COEP. Desplegar `dist/` (`npm run build`).

## Fixes
- [x] `const bridge = bridge` (TDZ al abrir juego) — eliminado, `bridge` a deps.
- [x] `mgba: failed to load script: /mgba/mgba.js` — URLs relativas a `document.baseURI` (funciona en subpaths) + error legible que indica usar `npm run dev/preview` en vez de file://.
## Verificación
- `npm run dev -- --host`, `npm run build` ok.
- 60fps, recarga conserva SRAM, Lighthouse móvil >85, Chrome + Safari.
