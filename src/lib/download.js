// Shared browser-download helper (SRP: single place for Blob -> <a> download).
// Used by savestates (storage.js), SRAM (EmulatorBridge) and screenshots.
// Best practice: DRY + auto-revoke object URLs to avoid memory leaks.

/**
 * Download bytes or a Blob as a file.
 * @param {Uint8Array | Blob} data bytes to download
 * @param {string} filename target filename (e.g. "game.sav")
 * @param {string} [mime] MIME type when `data` is raw bytes
 * @returns {void}
 */
export function downloadBlob(data, filename, mime = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
