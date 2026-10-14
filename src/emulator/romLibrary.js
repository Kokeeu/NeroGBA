// Local ROM library persisted in IndexedDB via idb-keyval.
// Key: `gba-rom:{namespace}` -> { name, bytes, byteLength, savedAt }.
// Index: `gba-rom:index` -> { [namespace]: { name, byteLength, savedAt } }.
//
// Privacy: same guarantee as savestates — per-browser, per-origin, local only.
// No backend exists, so bytes never leave the device. Other visitors of a
// deployed build get their own empty library.
// Saves (slots/SRAM) are keyed by namespace and survive ROM deletion.
//
// Quota policy (explicit, no silent LRU eviction):
// - MAX_SAVED_ROMS entries, MAX_LIBRARY_BYTES total.
// - saveRom() validates limits BEFORE writing and throws LibraryFullError
//   so the UI can toast "biblioteca llena, borra una ROM".
// - requestPersistence() asks for persistent storage (matters on iOS Safari).
import { del, get, set } from 'idb-keyval';
import { MAX_ROM_BYTES } from './romLoader.js';

export const MAX_SAVED_ROMS = 8;
export const MAX_LIBRARY_BYTES = 256 * 1024 * 1024;

const INDEX_KEY = 'gba-rom:index';
const keyFor = (namespace) => `gba-rom:${namespace}`;

export class LibraryFullError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LibraryFullError';
  }
}

/** Best-effort: ask the browser not to evict site storage (iOS Safari). */
export async function requestPersistence() {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // best-effort
  }
}

/** @returns {Promise<Record<string, {name:string,byteLength:number,savedAt:number}>>} */
export async function listRoms() {
  try {
    const index = await get(INDEX_KEY);
    return index && typeof index === 'object' ? { ...index } : {};
  } catch {
    return {};
  }
}

export async function hasRom(namespace) {
  if (!namespace) return false;
  const index = await listRoms();
  return namespace in index;
}

/** @returns {Promise<{name:string,bytes:Uint8Array}|null>} */
export async function getRom(namespace) {
  if (!namespace) return null;
  try {
    const entry = await get(keyFor(namespace));
    if (!entry?.bytes) return null;
    return { name: entry.name, bytes: new Uint8Array(entry.bytes) };
  } catch {
    return null;
  }
}

function quotaMessage() {
  return (
    `Biblioteca llena (máx. ${MAX_SAVED_ROMS} ROMs o ` +
    `${Math.round(MAX_LIBRARY_BYTES / 1048576)}MB). Borra una ROM para guardar otra.`
  );
}

/**
 * Persist a ROM dump. Validates size + quota before writing.
 * @param {string} namespace storage namespace (sha1-based, see romLoader.js)
 * @param {string} name original filename
 * @param {Uint8Array} bytes ROM bytes (a copy is stored)
 * @throws {LibraryFullError} when count/size limits would be exceeded
 * @throws {Error} when the ROM itself exceeds MAX_ROM_BYTES
 */
export async function saveRom(namespace, name, bytes) {
  if (!namespace) throw new Error('Sin namespace de ROM.');
  if (!bytes?.length) throw new Error('ROM vacía.');
  if (bytes.length > MAX_ROM_BYTES) throw new Error('Archivo demasiado grande (>32MB).');
  const index = await listRoms();
  const isUpdate = namespace in index;
  const count = Object.keys(index).length;
  if (!isUpdate && count >= MAX_SAVED_ROMS) throw new LibraryFullError(quotaMessage());
  const used = Object.values(index).reduce((acc, e) => acc + (e.byteLength || 0), 0);
  const prev = isUpdate ? index[namespace].byteLength || 0 : 0;
  if (used - prev + bytes.length > MAX_LIBRARY_BYTES) throw new LibraryFullError(quotaMessage());
  try {
    // Store a copy so later heap growth can't detach the view.
    await set(keyFor(namespace), { name, bytes: new Uint8Array(bytes), savedAt: Date.now() });
  } catch (e) {
    if (e?.name === 'QuotaExceededError' || /quota/i.test(e?.message || '')) {
      throw new LibraryFullError(quotaMessage());
    }
    throw e;
  }
  await set(INDEX_KEY, {
    ...index,
    [namespace]: { name, byteLength: bytes.length, savedAt: Date.now() },
  });
  return bytes.length;
}

/**
 * Delete ROM bytes. Savestates/SRAM (keyed by namespace) are preserved.
 * @returns {Promise<void>}
 */
export async function deleteRom(namespace) {
  if (!namespace) return;
  try {
    await del(keyFor(namespace));
  } catch {
    // best-effort
  }
  const index = await listRoms();
  if (namespace in index) {
    const { [namespace]: _dropped, ...rest } = index;
    try {
      await set(INDEX_KEY, rest);
    } catch {
      // best-effort
    }
  }
}

/**
 * Storage usage for the library footer.
 * @returns {Promise<{roms:number,bytes:number}>}
 */
export async function getLibraryUsage() {
  const index = await listRoms();
  const entries = Object.values(index);
  return {
    roms: entries.length,
    bytes: entries.reduce((acc, e) => acc + (e.byteLength || 0), 0),
  };
}
