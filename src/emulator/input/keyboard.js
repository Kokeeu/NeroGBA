// Remappable keyboard layout. Keys are KeyboardEvent.code values.
// Actions use the SDK convention: 'p1.a', 'p1.b', 'p1.start', ...
// Gamepad polling stays inside the SDK (standard mapping, no config needed).
//
// Persistence via `src/lib/local-storage.js` (fail-soft).
import { readJSON, removeKey, writeJSON } from '../../lib/local-storage.js';

export const CONTROLS = [
  'p1.up',
  'p1.down',
  'p1.left',
  'p1.right',
  'p1.a',
  'p1.b',
  'p1.l',
  'p1.r',
  'p1.start',
  'p1.select',
];

export const DEFAULT_KEYMAP = {
  'p1.up': 'ArrowUp',
  'p1.down': 'ArrowDown',
  'p1.left': 'ArrowLeft',
  'p1.right': 'ArrowRight',
  'p1.a': 'KeyX',
  'p1.b': 'KeyZ',
  'p1.l': 'KeyA',
  'p1.r': 'KeyS',
  'p1.start': 'Enter',
  'p1.select': 'ShiftRight',
};

const LS_KEY = 'gba-keymap-v1';

export function getKeymap() {
  const parsed = readJSON(LS_KEY, null);
  if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_KEYMAP };
  return { ...DEFAULT_KEYMAP, ...parsed };
}

export function setKeymap(map) {
  writeJSON(LS_KEY, map);
}

export function resetKeymap() {
  removeKey(LS_KEY);
  return { ...DEFAULT_KEYMAP };
}
