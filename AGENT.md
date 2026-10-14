# AGENT.md — NeroGBA (emulador GBA web)

Guía de navegación y arquitectura para agentes y humanos. Si solo lees un
archivo del repo, que sea este.

## 1. Stack y comandos

- **Stack:** Vite 8 + React 19 + mGBA compilado a WASM (Emscripten) + Canvas 2D
  + WebAudio + IndexedDB (`idb-keyval`) + OPFS + `vite-plugin-pwa`.
- **Núcleo WASM:** `@wasm-gaming/mgba-wasm` servido desde `public/mgba/`
  (`mgba.js` + `mgba.wasm`). Nunca en `src/`.
- **Comandos (desde la raíz del proyecto):**
  - `npm run dev -- --host` — dev desktop + móvil en LAN.
  - `npm run lint` — `oxlint` (limpio a día de la refactorización).
  - `npm run build` / `npm run preview` — verificar build WASM + PWA.

## 2. Mapa del código — dónde está cada cosa

```
src/
  main.jsx                    # entry: StrictMode + <App/>
  App.jsx                     # ORQUESTADOR delgado: estado UI -> bridge -> UI
  App.css / index.css         # tema Frost + layout (ver DESIGN.md)
  assets/                     # logo, hero, iconos (sin ROMs)

  emulator/                   # DOMINIO: emulación y persistencia (sin JSX)
    EmulatorBridge.js         # fachada del núcleo: boot/pause/turbo/slots/.sav
    romLoader.js              # validar .gba/.gb/.gbc/.sgb/.zip + namespace sha1
    storage.js                # 4 savestates en IndexedDB + export/import .state
    recents.js                # últimas 8 ROMs (solo namespaces, nunca bytes)
    input/keyboard.js         # keymap remapeable (CONTROLS, DEFAULT_KEYMAP)

  lib/                        # INFRA genérica reutilizable (sin dominio)
    download.js               # downloadBlob(): única vía Blob -> <a> descarga
    local-storage.js          # readJSON/writeJSON/removeKey fail-soft

  hooks/                      # lógica con estado extraída de App (regla: use*)
    useToasts.js              # pila info (auto 4.5s, máx 3) + error sticky
    useFullscreen.js          # Fullscreen API + fallback pseudo (iOS Safari)

  components/                 # PRESENTACIÓN (idealmente sin lógica de negocio)
    TopBar.jsx                # waybar: brand + 01/02 + status + Cambiar/Ajustes
    LoaderHero.jsx            # pantalla 01: hero + CTA Elegir juego
    Screen.jsx                # ventana + canvas 240x160 + overlay drag&drop
    SideDocks.jsx             # LeftDocks (JUEGO+SLOTS) / RightDocks (VIDEO+SISTEMA)
    RecentsBar.jsx            # launcher dmenu de recientes
    TouchControls.jsx         # overlay táctil (solo pointer:coarse, multitáctil)
    FsMenu.jsx                # menú flotante dentro de fullscreen móvil
    SettingsModal.jsx         # tabla remapeo + volumen + filtro/aspecto/ghosting
    Toasts.jsx                # render de la pila (lógica en useToasts)

  vendor/mgba-sdk/            # FORK del SDK upstream (añade turbo). Ignorado por lint.
    mgba.sdk.js               # load/start/pause/setTurbo/saveSram/... + audio unlock
    mgba.config.js / mgba.options.js / mgba.zip.js / mgba.manifest.js

public/mgba/                  # mgba.js + mgba.wasm servidos tal cual
```

### Tabla rápida: "quiero X → voy a Y"

| Quiero…                              | Archivo(s)                                        |
| ------------------------------------ | ------------------------------------------------- |
| Arrancar/pausar/turbo/foto           | `src/emulator/EmulatorBridge.js`                  |
| Validar ROM o cambiar formatos       | `src/emulator/romLoader.js` (`ACCEPTED_EXTS`)     |
| Slots guardar/cargar/exportar        | `src/emulator/storage.js` + `EmulatorBridge`      |
| SRAM `.sav` export/import            | `EmulatorBridge.exportSram/importSram`            |
| Teclado defaults o remapeo           | `src/emulator/input/keyboard.js`                  |
| Añadir un ajuste de pantalla         | `EmulatorBridge.DEFAULT_DISPLAY` + `SideDocks` + `SettingsModal` |
| Cambiar toasts (tiempos, máx)        | `src/hooks/useToasts.js`                          |
| Cambiar fullscreen / fallback iOS    | `src/hooks/useFullscreen.js`                      |
| Mover un botón de sitio              | `src/components/SideDocks.jsx`, `TopBar.jsx`      |
| Descargar cualquier blob             | `src/lib/download.js` (NO duplicar `<a>`+blob)    |
| Guardar algo en localStorage         | `src/lib/local-storage.js` (NO try/catch manual)  |
| Turbo no va tras update del paquete  | `src/vendor/mgba-sdk/` → re-sync manual (abajo)   |
| Estética / layout / responsive       | `DESIGN.md` + `src/App.css`                       |
| Deploy / PWA / subpaths              | `vite.config.js` (`base:'./'`), `PLAN.md` §Deploy |

## 3. Arquitectura por capas (Clean + FSD pragmático)

```
┌─ components/ + App.jsx      PRESENTACIÓN (React, JSX, CSS)
│    │  solo props/handlers, sin WASM directo
├─ hooks/ + lib/              COMPOSICIÓN / INFRA (toasts, fullscreen,
│    │  descargas, localStorage fail-soft)
├─ emulator/                  DOMINIO (bridge, ROM, slots, keymap, recents)
│    │  no importa JSX ni CSS
└─ vendor/mgba-sdk/ + WASM    ADAPTADOR EXTERNO (fork aislado, re-sync manual)
```

**Reglas de dependencia:**

1. `components/` nunca importa el SDK ni toca el WASM: todo pasa por
   `EmulatorBridge` (fachada) vía props desde `App.jsx`.
2. `emulator/` nunca importa JSX/CSS. Puede usar `lib/` (descargas, storage).
3. `lib/` y `hooks/` son genéricos: prohibido importar `emulator/` o
   `vendor/` desde ahí (evita ciclos).
4. `vendor/` es zona quarantena: ignorado por lint, se toca solo para
   re-sync con upstream.

## 4. Buenas prácticas aplicadas (y por qué)

Investigación base: docs oficiales React 19 (`react.dev` — custom hooks para
reutilizar lógica), Feature-Sliced Design / Clean Architecture en frontend
(separar presentación / negocio / infra, dependencias solo hacia abajo) y
checklists 2026 de hooks (un efecto = una responsabilidad, deps completas).

1. **SRP / componentes pequeños** — `App.jsx` pasó de ~655 líneas god-component
   a orquestador delgado: `TopBar`, `LoaderHero`, `LeftDocks`/`RightDocks`,
   `RecentsBar` son presentacionales puros.
2. **DRY** — `downloadBlob()` elimina 3 bloques Blob+`<a>`+revoke duplicados
   (slots, SRAM, screenshot). `readJSON/writeJSON/removeKey` eliminan 3
   try/catch JSON duplicados (keymap, recents, display prefs).
3. **Custom hooks (`use*`)** — `useToasts` (con cleanup de timers, sin
   setState-after-unmount) y `useFullscreen` (quirks iOS encapsulados).
   Cada hook tiene una sola responsabilidad y JSDoc con su contrato.
4. **Fachada (Facade)** — `EmulatorBridge` es el único que conoce al engine:
   `boot/pause/resume/reset/setTurbo/saveSlot/loadSlot/exportSram/screenshot`.
   Cambiar de SDK = tocar 1 archivo + `vendor/`.
5. **Fail-fast + errores amables** — `validateRomFile()` y `guard()` antes de
   cada acción; `friendlyBootError()` traduce `file://` y 404 de `mgba.js`.
6. **Claves namespaced** — `gba-savestate:{ns}:{slot}`, `gba-display-v1`,
   `gba-keymap-v1`, `nerogba-recents-v1`. Namespace de ROM = `slug-sha1(12)`.
7. **Sin fugas** — object URLs con revoke a 5s, timers de toast con cleanup,
   `destroy()` del engine al desmontar.
8. **Docs como código** — cada módulo lleva cabecera de 1-4 líneas: qué es,
   en qué capa está y qué NO debe importar. UI en español, código/comentarios
   en inglés (regla del proyecto).

## 5. Flujos clave (traza rápida)

- **Boot:** picker/drop → `validateRomFile` → `fileToBytes` →
  `gbaHeaderWarning` (solo aviso) → `storageNamespaceFor` (sha1) →
  `bridge.boot({canvas, romBytes, namespace, …})` → engine `load+start` →
  `applyKeymap` → estado UI (`booted`, `paused=false`, `turbo=1`, `refreshSlots`).
  El canvas **nunca se desmonta** (se oculta con `.is-loader`).
- **Guardados:** savestates = `engine.saveState/loadState` + IndexedDB
  (`storage.js`, 4 slots ●/○). SRAM batería la persiste el SDK en OPFS
  (autosave) + export/import `.sav` live vía `saveSram/loadSram`.
- **Input:** teclado remapeable → `engine.setInput(keymap)`; táctil = KeyboardEvents
  sintéticos sobre el keymap activo (el SDK ya escucha `e.code`); gamepad
  standard lo sondea el SDK (sin código propio). Audio se desbloquea solo por
  gesto (incluido pulsar el pad).
- **Turbo 1x→2x→4x:** no existe en upstream → parche en `vendor/mgba-sdk`
  (frames fijos por tick + descarte de audio + mute forzado con restauración).
  Al actualizar `@wasm-gaming/mgba-wasm`, re-aplicar el parche a mano.
- **Fullscreen:** `useFullscreen.enter()` → Fullscreen API sobre `.fs-wrap`
  (stage+touch+menú) → fallback `.pseudo-fullscreen` en iPhone. `FsMenu` solo
  existe con `fullscreenActive`.

## 6. Reglas duras (no negociar)

1. Solo ROMs locales del usuario (picker + drag&drop). Validar ext/tamaño y
   avisar cabecera `0xB2 != 0x96`. Nunca commitear `*.gba/*.sav/*.state` ni
   `bios.bin` (ver `.gitignore`). Sin BIOS se usa el HLE de mGBA.
2. Emulación en **hilo principal** vía `EmulatorBridge` (el SDK ata canvas 2D +
   AudioContext + listeners de window; no es movible a Worker sin reescribirlo
   con OffscreenCanvas). Su loop es audio-clocked por rAF y sostiene 60fps.
3. Audio solo tras gesto de usuario. Soportar mute/vol con restauración.
4. Saves: SRAM autosave en OPFS + 4 slots savestate en IndexedDB con
   `key=sha1(rom)`. Export/import `.sav` y `.state`.
5. Input: teclado remapeable + Gamepad API + táctil solo en `pointer:coarse`.
   Defaults: Z=A X=B Enter=Start Shift=Select (ver `DEFAULT_KEYMAP`).
6. **Sin SharedArrayBuffer / COOP-COEP.** Debe funcionar sin
   cross-origin-isolation (iOS). Deploy en `dist/` sin headers especiales.
7. Español en UI, código y comentarios en inglés.
8. WASM en `public/mgba/`, URLs relativas a `document.baseURI` (funciona en
   raíz y en subpaths como GitHub Pages). `base: './'`.
9. Nuevas descargas → `downloadBlob()`. Nuevo localStorage → `readJSON/…`.
   Nueva lógica con estado compartida → hook `use*`. Sin excepciones.

## 7. Convenciones

- **Nombres:** componentes `PascalCase.jsx`, resto `camelCase.js`, hooks `use*.js`.
  Props handlers `on*` (`onSave`, `onTurbo`), estado `is*/has*` donde aplique.
- **JSDoc:** todo `lib/`, `hooks/` y `emulator/` expone `@param/@returns`.
  Componentes llevan 1 línea de responsabilidad arriba.
- **CSS:** variables en `index.css`, layout/tema en `App.css`. Z-index:
  touch 5 < menú 20/21 < toasts 30 < modal 50. Targets táctiles ≥44px.
- **Accesibilidad:** `aria-label/title` en botones de icono, `aria-pressed` en
  toggles, foco visible, contraste AA.

## 8. Cómo añadir cosas (recetas)

- **Nuevo botón de dock:** añadir en `SideDocks.jsx` (izq=juego/slots,
  der=video/sistema) + handler en `App.jsx` que llame al bridge. Si es acción
  de fullscreen móvil, replicar entrada en `FsMenu.jsx`.
- **Nuevo ajuste de pantalla:** extender `DEFAULT_DISPLAY` en
  `EmulatorBridge.js` → toggle en `RightDocks` + fila en `SettingsModal` →
  `bridge.setDisplay(key, value)` (llega a `engine.config.write`).
- **Nuevo slot:** ampliar `SLOTS` en `storage.js` (la UI itera el array).
- **Nuevo formato ROM:** ampliar `ACCEPTED_EXTS` en `romLoader.js` + `accept`
  del input en `App.jsx` + línea `.formats` en `LoaderHero.jsx`.

## 9. Vendor / re-sync del SDK

`src/vendor/mgba-sdk/` es un fork de `@wasm-gaming/mgba-wasm@0.1.1` con turbo
y `saveSram/loadSram` live. Al actualizar el paquete: diff del upstream,
re-aplicar el parche de turbo, probar `1x→2x→4x` + `.sav` + build, y anotar la
versión en `PLAN.md` Fase 5.

## 10. Verificación antes de dar por hecho

`npm run lint` limpio + `npm run build` ok + boot manual de un `.gba` propio
(60fps, pausa/turbo/audio, guardar/cargar slot, export/import `.sav`).
