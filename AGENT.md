# AGENT.md - Emulador GBA Web

## Stack
Vite 8 + React 19 + mGBA (C -> WASM via Emscripten) + Web Worker + Canvas + WebAudio + IndexedDB (idb-keyval) + vite-plugin-pwa.

## Carpeta base
`C:\Users\jason\OneDrive\Desktop\Emulador\` — proyecto nuevo, no usar `vite-project/` (solo referencia).

## Comandos
- `npm run dev -- --host` — dev desktop + móvil en LAN
- `npm run build` / `npm run preview` — verificar build WASM
- WASM en `public/mgba.*`, nunca en `src/`.

## Estructura objetivo
```
src/emulator/ (EmulatorBridge.js, romLoader.js, storage.js, input/keyboard.js)
src/components/ (Screen.jsx, ControlsBar.jsx, TouchControls.jsx)
public/ (mgba.wasm, mgba.js glue Emscripten)
```

## Reglas duras
1. Solo ROMs locales `.gba` del usuario (input file + drag&drop). Validar header 0x96. Nunca incluir ROMs ni `bios.bin` con copyright. Usar BIOS open-source de mGBA.
2. Emulación en hilo principal vía `src/emulator/EmulatorBridge.js` (el SDK ata canvas 2D + AudioContext + listeners de window: no es movible a Worker sin reescribirlo con OffscreenCanvas). Su loop interno es audio-clocked por rAF y sostiene 60fps.
3. Audio desbloqueado solo por gesto de usuario. Soportar mute/vol.
4. Saves: SRAM autosave 5s + 4 slots savestate en IndexedDB key=sha1(rom). Export/import `.sav`.
5. Input: teclado remapeable + Gamepad API + táctil (solo `pointer:coarse`). Defaults: Z=A X=B Enter=Start Shift=Select.
6. No exigir SharedArrayBuffer / COOP-COEP. Debe funcionar sin cross-origin-isolation (iOS).
7. Español en UI, código y comentarios en inglés.
8. No commitear `node_modules/`, `.sav`, `.gba`, `bios.bin`.
