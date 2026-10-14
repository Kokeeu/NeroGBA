// Recent ROMs launcher (presentational, dmenu style).
// Stores namespaces only — re-selecting the same dump restores saves.
export default function RecentsBar({ recents, onRecent, onClear }) {
  if (!recents.length) return null;
  return (
    <section className="controls recents" aria-label="ROMs recientes">
      <h2>Recientes · dmenu</h2>
      {recents.map((r) => (
        <button key={r.namespace} type="button" onClick={() => onRecent(r)} title={r.system || ''}>
          {r.name}
        </button>
      ))}
      <button type="button" className="linklike" onClick={onClear}>
        Limpiar
      </button>
    </section>
  );
}
