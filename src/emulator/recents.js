// Recently played ROMs (namespaces only — ROM bytes are never stored).
// Picking a recent entry re-opens the file picker: saves are keyed by
// namespace, so re-selecting the same dump resumes slots + SRAM.
//
// Persistence via `src/lib/local-storage.js` (fail-soft).
import { readJSON, removeKey, writeJSON } from '../lib/local-storage.js';

const LS_KEY = 'nerogba-recents-v1';
const MAX_RECENTS = 8;

export function getRecents() {
  const list = readJSON(LS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function addRecent({ name, namespace, system }) {
  const playedAt = Date.now();
  const rest = getRecents().filter((r) => r.namespace !== namespace);
  const next = [{ name, namespace, system, playedAt }, ...rest].slice(0, MAX_RECENTS);
  writeJSON(LS_KEY, next);
  return next;
}

export function clearRecents() {
  removeKey(LS_KEY);
  return [];
}
