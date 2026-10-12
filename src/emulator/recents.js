// Recently played ROMs (namespaces only — ROM bytes are never stored).
// Picking a recent entry re-opens the file picker: saves are keyed by
// namespace, so re-selecting the same dump resumes slots + SRAM.
const LS_KEY = 'nerogba-recents-v1';
const MAX_RECENTS = 8;

export function getRecents() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addRecent({ name, namespace, system }) {
  try {
    const playedAt = Date.now();
    const rest = getRecents().filter((r) => r.namespace !== namespace);
    const next = [{ name, namespace, system, playedAt }, ...rest].slice(0, MAX_RECENTS);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return getRecents();
  }
}

export function clearRecents() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // best-effort
  }
  return [];
}
