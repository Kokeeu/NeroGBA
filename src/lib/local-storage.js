// Safe localStorage JSON helpers.
// Best practice: isolate I/O side effects + fail-soft (private mode / quota).
// Replaces the 3 duplicated try/catch JSON blocks in
// keyboard.js, recents.js and EmulatorBridge display prefs.

/**
 * Read and parse a JSON value from localStorage.
 * @template T
 * @param {string} key storage key
 * @param {T} fallback value returned on miss / parse error
 * @returns {T}
 */
export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Stringify and persist a value. Best-effort (never throws).
 * @param {string} key storage key
 * @param {unknown} value JSON-serializable value
 * @returns {void}
 */
export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota / private mode: persistence is best-effort, app keeps running.
  }
}

/**
 * Remove a key. Best-effort (never throws).
 * @param {string} key storage key
 * @returns {void}
 */
export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // best-effort
  }
}
