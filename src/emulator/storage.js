// Savestate slots persisted in IndexedDB via idb-keyval.
// Key: `gba-savestate:{namespace}:{slot}` (slot 1..4).
// SRAM battery saves are handled by the SDK itself (OPFS sram.bin).
//
// Architecture: infraestructura de persistencia (IndexedDB).
// La descarga a archivo vive en `src/lib/download.js` (DRY).
import { del, get, set } from 'idb-keyval';
import { downloadBlob } from '../lib/download.js';

export const SLOTS = [1, 2, 3, 4];

const keyFor = (namespace, slot) => `gba-savestate:${namespace}:${slot}`;

export async function writeSlot(namespace, slot, bytes) {
  // Store a copy so later heap growth can't detach the view.
  await set(keyFor(namespace, slot), new Uint8Array(bytes));
}

export async function readSlot(namespace, slot) {
  const data = await get(keyFor(namespace, slot));
  return data ? new Uint8Array(data) : null;
}

export async function slotHasData(namespace, slot) {
  return (await readSlot(namespace, slot)) !== null;
}

export async function deleteSlot(namespace, slot) {
  await del(keyFor(namespace, slot));
}

export async function exportSlot(namespace, slot, romName) {
  const bytes = await readSlot(namespace, slot);
  if (!bytes) throw new Error(`Slot ${slot} vacío.`);
  downloadBlob(bytes, `${romName || 'gba'}-slot${slot}.state`);
}

export async function importSlot(namespace, slot, file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length === 0) throw new Error('Archivo de savestate vacío.');
  await writeSlot(namespace, slot, bytes);
}
