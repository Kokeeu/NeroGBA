// Lifecycle wrapper around the vendored mGBA engine instance
// (src/vendor/mgba-sdk/mgba.sdk.js, forked from @wasm-gaming/mgba-wasm
// to add fast-forward turbo — upstream exposes no speed API).
// NOTE: the SDK binds canvas 2D + AudioContext + window listeners, so it
// intentionally runs on the main thread (no Worker). Its internal loop is
// audio-clocked via rAF and holds 60fps without blocking UI.
import { load } from '../vendor/mgba-sdk/mgba.sdk.js';
import { deleteSlot, readSlot, slotHasData, writeSlot } from './storage.js';
import { getKeymap } from './input/keyboard.js';

export const TURBO_LEVELS = [1, 2, 4];

export const DEFAULT_DISPLAY = {
  renderFilter: 'pixelated',
  aspect: 'native',
  interframeBlending: false,
};

const DISPLAY_LS_KEY = 'gba-display-v1';

export function getDisplayPrefs() {
  try {
    const raw = localStorage.getItem(DISPLAY_LS_KEY);
    if (!raw) return { ...DEFAULT_DISPLAY };
    return { ...DEFAULT_DISPLAY, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_DISPLAY };
  }
}

export function setDisplayPrefs(prefs) {
  localStorage.setItem(DISPLAY_LS_KEY, JSON.stringify(prefs));
}

// Asset URLs resolved against the page, not the domain root, so the app
// also works served from a subpath (e.g. /Emulador/). Absolute '/mgba/...'
// breaks there with "failed to load script".
function assetUrl(path) {
  return new URL(path, document.baseURI).href;
}

function friendlyBootError(e) {
  const detail = e?.message || String(e);
  if (window.location.protocol === 'file:') {
    return (
      'No se puede arrancar desde file:// (el navegador bloquea el .wasm). ' +
      'Sirve la app con `npm run dev` o `npm run preview` dentro de Emulador/ y abre la URL http:// que muestra la terminal.'
    );
  }
  if (detail.includes('failed to load script')) {
    return (
      'No se encontró el núcleo WASM (mgba.js). Comprueba que ejecutas el servidor en la carpeta Emulador/ ' +
      '(`npm run dev` o `npm run preview`) y que existe public/mgba/mgba.js. Detalle: ' +
      detail
    );
  }
  return detail;
}

export class EmulatorBridge {
  constructor() {
    this.engine = null;
    this.namespace = '';
    this.romName = '';
    this.muted = false;
    this.preMuteVolume = 1;
    this.turbo = 1;
  }

  get booted() {
    return !!this.engine;
  }

  get system() {
    return this.engine?.system || '';
  }

  async boot({ canvas, romBytes, namespace, romName, volume = 1, display, onFrame }) {
    this.destroy();
    const d = { ...DEFAULT_DISPLAY, ...(display || {}) };
    let engine;
    try {
      engine = await load({
        canvasEl: canvas,
        assets: { rom: romBytes },
        options: {
          system: 'auto',
          renderFilter: d.renderFilter,
          aspect: d.aspect,
          interframeBlending: d.interframeBlending,
          volume,
          gamepads: true,
          logLevel: 'error',
          escMenu: false,
        },
        persist: 'opfs',
        storageNamespace: namespace,
        onEvent: (e) => {
          if (e?.type === 'frame' && typeof e.fps === 'number') onFrame?.(Math.round(e.fps));
        },
        jsUrl: assetUrl('mgba/mgba.js'),
        wasmUrl: assetUrl('mgba/mgba.wasm'),
      });
    } catch (e) {
      throw new Error(friendlyBootError(e));
    }
    engine.setInput(getKeymap());
    engine.setTurbo(1);
    engine.start();
    this.engine = engine;
    this.namespace = namespace;
    this.romName = romName;
    this.turbo = 1;
    return engine;
  }

  pause() {
    this.engine?.pause();
  }

  resume() {
    this.engine?.resume();
  }

  reset() {
    this.engine?.reset();
  }

  setVolume(v) {
    this.preMuteVolume = v;
    if (!this.muted) this.engine?.config.write('volume', v);
  }

  setMuted(muted) {
    this.muted = muted;
    this.engine?.config.write('volume', muted ? 0 : this.preMuteVolume);
  }

  setDisplay(key, value) {
    this.engine?.config.write(key, value);
  }

  setTurbo(level) {
    const next = TURBO_LEVELS.includes(level) ? level : 1;
    this.turbo = next;
    this.engine?.setTurbo(next);
    return next;
  }

  applyKeymap(map) {
    this.engine?.setInput(map);
  }

  async saveSlot(slot) {
    if (!this.engine) throw new Error('Sin emulador arrancado.');
    const bytes = await this.engine.saveState();
    await writeSlot(this.namespace, slot, bytes);
    return bytes.length;
  }

  async loadSlot(slot) {
    if (!this.engine) throw new Error('Sin emulador arrancado.');
    const bytes = await readSlot(this.namespace, slot);
    if (!bytes) throw new Error(`Slot ${slot} vacío.`);
    await this.engine.loadState(bytes);
  }

  async slotUsed(slot) {
    return slotHasData(this.namespace, slot);
  }

  async deleteSlotData(slot) {
    return deleteSlot(this.namespace, slot);
  }

  async screenshot() {
    if (!this.engine) throw new Error('Sin emulador arrancado.');
    const blob = await this.engine.screenshot();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.romName || 'gba'}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  destroy() {
    try {
      this.engine?.destroy();
    } catch {
      // best-effort
    }
    this.engine = null;
  }
}
