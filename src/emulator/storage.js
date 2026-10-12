// Savestate slots persisted in IndexedDB via idb-keyval.
// Key: `gba-savestate:{namespace}:{slot}` (slot 1..4).
// SRAM battery saves are handled by the SDK itself (OPFS sram.bin).
import { del, get, set } from 'idb-keyval';

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
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${romName || 'gba'}-slot${slot}.state`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function importSlot(namespace, slot, file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length === 0) throw new Error('Archivo de savestate vacío.');
  await writeSlot(namespace, slot, bytes);
}
