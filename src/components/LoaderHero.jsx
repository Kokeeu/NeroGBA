// First screen: ROM picker hero (presentational).
// Single responsibility: explain + trigger the hidden file input / drop.
import logoUrl from '../assets/nero-icon.png';

export default function LoaderHero({ loading, onPick }) {
  return (
    <section className="loader-hero" aria-label="Cargar juego">
      <img src={logoUrl} alt="" aria-hidden="true" className="hero-ball-icon" width="110" height="110" decoding="async" />
      <p className="loader-kicker" aria-label="Juega tus favoritos de Game Boy Advance, 100% local">
        <span className="kicker-track" aria-hidden="true">
          <span>juega tus favoritos de game boy advance&nbsp;&nbsp;·&nbsp;&nbsp;100% local&nbsp;&nbsp;·&nbsp;&nbsp;</span>
          <span>juega tus favoritos de game boy advance&nbsp;&nbsp;·&nbsp;&nbsp;100% local&nbsp;&nbsp;·&nbsp;&nbsp;</span>
        </span>
      </p>
      <h2>{loading ? 'Colgando el lienzo…' : 'Elige tu obra para empezar'}</h2>
      <p className="loader-sub">
        {loading
          ? 'Arrancando el núcleo mGBA…'
          : 'Arrastra un .gba aquí o elígelo desde tu dispositivo. Todo queda en local.'}
      </p>
      <button type="button" className="load-btn" onClick={onPick} disabled={loading}>
        {loading ? 'Cargando…' : 'Elegir juego'}
      </button>
      <p className="formats">.gba · .gb · .gbc · .sgb · .zip</p>
    </section>
  );
}
