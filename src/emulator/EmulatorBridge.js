// Lifecycle wrapper around the vendored mGBA engine instance
// (src/vendor/mgba-sdk/mgba.sdk.js, forked from @wasm-gaming/mgba-wasm
// to add fast-forward turbo — upstream exposes no speed API).
// NOTE: the SDK binds canvas 2D + AudioContext + window listeners, so it
// intentionally runs on the main thread (no Worker). Its internal loop is
// audio-clocked via rAF and holds 60fps without blocking UI.
import { load } from '../vendor/mgba-sdk/mgba.sdk.js';
import { deleteSlot, readSlot, slotHasData, writeSlot } from './storage.js';
import { getKeymap } from './input/keyboard.js';
import { downloadBlob } from '../lib/download.js';
import { readJSON, writeJSON } from '../lib/local-storage.js';

export const TURBO_LEVELS = [1, 2, 4, 10];

// Preferred turbo speed (2x / 4x / 10x). The turbo button toggles 1x <-> pref,
// so you never cycle through the other speeds. Persisted like display prefs.
export const TURBO_OPTIONS = [2, 4, 10];

const TURBO_PREF_LS_KEY = 'gba-turbo-pref-v1';

export function getTurboPref() {
  const parsed = readJSON(TURBO_PREF_LS_KEY, 2);
  return TURBO_OPTIONS.includes(parsed) ? parsed : 2;
}

export function setTurboPref(pref) {
  if (!TURBO_OPTIONS.includes(pref)) return;
  writeJSON(TURBO_PREF_LS_KEY, pref);
}

export const DEFAULT_DISPLAY = {
  renderFilter: 'pixelated',
  aspect: 'native',
  interframeBlending: false,
};

const DISPLAY_LS_KEY = 'gba-display-v1';

export function getDisplayPrefs() {
  const parsed = readJSON(DISPLAY_LS_KEY, null);
  if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_DISPLAY };
  return { ...DEFAULT_DISPLAY, ...parsed };
}

export function setDisplayPrefs(prefs) {
  writeJSON(DISPLAY_LS_KEY, prefs);
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

  savName() {
    const base = (this.romName || 'gba').replace(/\.[^.]+$/, '') || 'gba';
    return `${base}.sav`;
  }

  async exportSram() {
    if (!this.engine) throw new Error('Sin emulador arrancado.');
    const bytes = await this.engine.saveSram();
    if (!bytes) throw new Error('Este juego no tiene guardado de batería.');
    downloadBlob(bytes, this.savName());
    return bytes.length;
  }

  async importSram(file) {
    if (!this.engine) throw new Error('Sin emulador arrancado.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!bytes.length) throw new Error('Archivo .sav vacío.');
    await this.engine.loadSram(bytes);
    return bytes.length;
  }

  async screenshot() {
    if (!this.engine) throw new Error('Sin emulador arrancado.');
    const blob = await this.engine.screenshot();
    downloadBlob(blob, `${this.romName || 'gba'}.png`, 'image/png');
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
