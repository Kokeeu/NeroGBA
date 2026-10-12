// Remappable keyboard layout. Keys are KeyboardEvent.code values.
// Actions use the SDK convention: 'p1.a', 'p1.b', 'p1.start', ...
// Gamepad polling stays inside the SDK (standard mapping, no config needed).

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
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_KEYMAP };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_KEYMAP, ...parsed };
  } catch {
    return { ...DEFAULT_KEYMAP };
  }
}

export function setKeymap(map) {
  localStorage.setItem(LS_KEY, JSON.stringify(map));
}

export function resetKeymap() {
  localStorage.removeItem(LS_KEY);
  return { ...DEFAULT_KEYMAP };
}
