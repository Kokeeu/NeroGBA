// First screen: ROM picker hero (presentational).
// Single responsibility: explain + trigger the hidden file input / drop.
export default function LoaderHero({ loading, onPick }) {
  return (
    <section className="loader-hero" aria-label="Cargar juego">
      <p className="loader-kicker">Sala 01 · Carga tu cartucho · ❄ nerogba frost</p>
      <h2>{loading ? 'Colgando el lienzo…' : 'Elige tu obra para empezar'}</h2>
      <p className="loader-sub">
        {loading
          ? 'Arrancando el núcleo mGBA…'
          : 'Arrastra un .gba aquí o elígelo desde tu dispositivo. Solo dumps propios, todo queda en local.'}
      </p>
      <button type="button" className="load-btn" onClick={onPick} disabled={loading}>
        {loading ? 'Cargando…' : 'Elegir juego'}
      </button>
      <p className="formats">.gba · .gb · .gbc · .sgb · .zip</p>
    </section>
  );
}
