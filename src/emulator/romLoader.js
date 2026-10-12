// Validates local ROM files and converts them to bytes for the WASM core.
// Never fetches ROMs remotely. Only user-supplied dumps.

export const ACCEPTED_EXTS = ['.gba', '.gb', '.gbc', '.sgb', '.zip'];
const MAX_ROM_BYTES = 32 * 1024 * 1024;

export function validateRomFile(file) {
  if (!file) return 'No se eligió archivo.';
  const name = file.name.toLowerCase();
  const okExt = ACCEPTED_EXTS.some((ext) => name.endsWith(ext));
  if (!okExt) return `Extensión no válida. Usa: ${ACCEPTED_EXTS.join(', ')}`;
  if (file.size === 0) return 'El archivo está vacío.';
  if (file.size > MAX_ROM_BYTES) return 'Archivo demasiado grande (>32MB).';
  return null;
}

export async function fileToBytes(file) {
  return new Uint8Array(await file.arrayBuffer());
}

// GBA header sanity check: byte at 0xB2 must be 0x96.
// Warning only — the WASM core does the real validation on boot.
export function gbaHeaderWarning(bytes, filename) {
  if (!filename.toLowerCase().endsWith('.gba')) return null;
  if (bytes.length < 0xc0) return 'El .gba es demasiado pequeño para ser válido.';
  if (bytes[0xb2] !== 0x96)
    return 'Cabecera GBA sospechosa (0xB2 != 0x96). El núcleo lo validará al arrancar.';
  return null;
}

export async function storageNamespaceFor(filename, bytes) {
  const clean = filename
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .slice(0, 40) || 'rom';
  try {
    const digest = await crypto.subtle.digest('SHA-1', bytes);
    const hex = [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 12);
    return `${clean}-${hex}`;
  } catch {
    return `${clean}-${bytes.length}`;
  }
}
