// Top waybar (presentational): brand + screen switch + status + navigation.
// No emulation logic here — everything arrives via props (composition over
// god-components). See DESIGN.md "Waybar".
export default function TopBar({ logoUrl, booted, statusText, onChangeGame, onOpenSettings }) {
  return (
    <header className="topbar" aria-label="Barra de estado">
      <div className="wb-left">
        <h1>
          <img src={logoUrl} alt="" className="logo" aria-hidden="true" width="52" height="52" decoding="async" />
          <span className="brand">NeroGBA</span>
        </h1>
        <div className="ws-group" role="status" aria-label="Pantalla actual">
          <span className={`ws${!booted ? ' active' : ''}`}>01 carga</span>
          <span className={`ws${booted ? ' active' : ''}`}>02 juego</span>
        </div>
      </div>
      <div className="wb-center">
        <span className="wb-status" title={statusText}>
          {statusText}
        </span>
      </div>
      <div className="wb-right tray">
        {booted && (
          <button type="button" onClick={onChangeGame} title="Volver a la pantalla de carga">
            Cambiar juego
          </button>
        )}
        <button type="button" onClick={onOpenSettings} title="Abrir ajustes">
          ⚙
        </button>
      </div>
    </header>
  );
}
