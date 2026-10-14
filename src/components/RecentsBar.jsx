// ROM library launcher (presentational, dmenu style).
// Vertical list, one ROM per row. Entries saved in IndexedDB boot instantly
// (●); others re-open the file picker (○) — saves are keyed by namespace
// either way. Every row has a removal action:
// - ● "Borrar": deletes ROM bytes from this browser (saves are preserved).
// - ○ "Quitar": removes the entry from the list (nothing was stored).
export default function RecentsBar({ recents, library = {}, onBootSaved, onRecent, onDeleteRom, onRemoveRecent }) {
  if (!recents.length) return null;
  return (
    <section className="controls recents" aria-label="Biblioteca y ROMs recientes">
      <h2>Biblioteca · dmenu</h2>
      {recents.map((r) => {
        const saved = !!library[r.namespace];
        const meta = library[r.namespace];
        return (
          <span key={r.namespace} className="recent-row">
            <button
              type="button"
              className="recent-main"
              onClick={() => (saved ? onBootSaved(r) : onRecent(r))}
              title={saved ? 'En biblioteca: arranca directo' : `${r.system || ''} · no guardada, hay que re-elegir el archivo`}
            >
              <span className="recent-dot" aria-hidden="true">
                {saved ? '●' : '○'}
              </span>
              <span className="recent-label">
                {r.name}
                {saved && meta ? ` · ${(meta.byteLength / 1048576).toFixed(1)}MB` : ''}
              </span>
            </button>
            {saved ? (
              <button
                type="button"
                className="linklike"
                onClick={() => onDeleteRom(r)}
                title="Borrar ROM de este navegador (los guardados se conservan)"
                aria-label={`Borrar ${r.name} de la biblioteca`}
              >
                Borrar
              </button>
            ) : (
              <button
                type="button"
                className="linklike"
                onClick={() => onRemoveRecent(r)}
                title="Quitar de la lista"
                aria-label={`Quitar ${r.name} de la lista`}
              >
                Quitar
              </button>
            )}
          </span>
        );
      })}
    </section>
  );
}
