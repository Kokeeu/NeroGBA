// Menú móvil + fullscreen (dentro de .fs-wrap, que es el target de
// Fullscreen API + fallback pseudo). En móvil coarse también se usa fuera
// de fullscreen: contiene las columnas JUEGO/SLOTS/VIDEO/SISTEMA + .sav.
// El turbo vive aquí dentro, no en el deck táctil.
import { useEffect } from 'react';
import { SLOTS } from '../emulator/storage.js';

export default function FsMenu({
  open,
  onToggle,
  onClose,
  booted,
  paused,
  turbo,
  muted,
  slot,
  slotsUsed,
  display,
  volume = 1,
  fullscreenActive = false,
  romSaved = false,
  onSlotChange,
  onPause,
  onResume,
  onReset,
  onTurbo,
  onScreenshot,
  onToggleMute,
  onDisplay,
  onVolume,
  onFullscreen,
  onOpenSettings,
  onSave,
  onLoad,
  onDelete,
  onExport,
  onImportClick,
  onExportSav,
  onImportSavClick,
  onSaveRom,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Ejecuta la acción y cierra, salvo toggles rápidos (turbo/mute).
  const act = (fn, keepOpen = false) => () => {
    fn?.();
    if (!keepOpen) onClose();
  };

  return (
    <div className="fs-menu">
      <button
        type="button"
        className="fs-menu-btn"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="fs-menu-panel"
        aria-label="Abrir menú"
      >
        {open ? '✕' : '☰'}
      </button>

      {open && (
        <>
          <div className="fs-menu-backdrop" onClick={onClose} aria-hidden="true" />
          <div id="fs-menu-panel" className="fs-menu-panel" role="menu" aria-label="Menú">
            <section className="fs-sec">
              <h3>Juego</h3>
              <div className="fs-grid">
                {paused ? (
                  <button type="button" disabled={!booted || !paused} onClick={act(onResume)}>
                    Seguir
                  </button>
                ) : (
                  <button type="button" disabled={!booted || paused} onClick={act(onPause)}>
                    Pausa
                  </button>
                )}
                <button type="button" disabled={!booted} onClick={act(onReset)}>
                  Reset
                </button>
                <button type="button" disabled={!booted} onClick={act(onScreenshot)}>
                  Screenshot
                </button>
                <button type="button" disabled={!booted} onClick={act(onToggleMute, true)}>
                  {muted ? 'Unmute' : 'Mute'}
                </button>
              </div>
            </section>

            <section className="fs-sec">
              <h3>Video</h3>
              <div className="fs-grid">
                <button type="button" disabled={!booted} onClick={act(onTurbo, true)}>
                  Turbo {turbo > 1 ? `${turbo}x` : '1x'}
                </button>
                {onDisplay && (
                  <>
                    <button type="button" onClick={act(() => onDisplay('renderFilter', display?.renderFilter === 'pixelated' ? 'smooth' : 'pixelated'), true)}>
                      Filtro: {display?.renderFilter === 'pixelated' ? 'pixel' : 'suave'}
                    </button>
                    <button type="button" onClick={act(() => onDisplay('aspect', display?.aspect === 'native' ? '4:3' : 'native'), true)}>
                      Aspecto: {display?.aspect ?? 'nativo'}
                    </button>
                    <button
                      type="button"
                      onClick={act(() => onDisplay('interframeBlending', !display?.interframeBlending), true)}
                    >
                      Ghosting {display?.interframeBlending ? 'ON' : 'OFF'}
                    </button>
                  </>
                )}
              </div>
              {onVolume && (
                <label className="fs-slotrow">
                  Vol
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    disabled={!booted}
                    onChange={(e) => onVolume(Number(e.target.value))}
                    aria-label="Volumen"
                  />
                </label>
              )}
            </section>

            <section className="fs-sec">
              <h3>Slots</h3>
              <label className="fs-slotrow">
                Slot
                <select value={slot} onChange={(e) => onSlotChange(Number(e.target.value))}>
                  {SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {s} {slotsUsed[s] ? '●' : '○'}
                    </option>
                  ))}
                </select>
              </label>
              <div className="fs-grid">
                <button type="button" disabled={!booted} onClick={act(onSave)}>
                  Guardar
                </button>
                <button type="button" disabled={!booted} onClick={act(onLoad)}>
                  Cargar
                </button>
                <button type="button" disabled={!booted} onClick={act(onDelete)}>
                  Borrar
                </button>
                <button type="button" disabled={!booted} onClick={act(onExport)}>
                  Exportar
                </button>
                <button type="button" disabled={!booted} onClick={act(onImportClick)}>
                  Importar
                </button>
              </div>
            </section>

            <section className="fs-sec">
              <h3>Sistema</h3>
              <div className="fs-grid">
                <button type="button" onClick={act(onOpenSettings)}>
                  Ajustes
                </button>
                <button type="button" className={fullscreenActive ? 'fs-leave' : ''} onClick={act(onFullscreen)}>
                  {fullscreenActive ? 'Salir ⛶' : 'Pantalla ⛶'}
                </button>
                {onExportSav && (
                  <button type="button" disabled={!booted} onClick={act(onExportSav)}>
                    Exportar .sav
                  </button>
                )}
                {onImportSavClick && (
                  <button type="button" disabled={!booted} onClick={act(onImportSavClick)}>
                    Importar .sav
                  </button>
                )}
                {onSaveRom && (
                  <button type="button" disabled={!booted || romSaved} onClick={act(onSaveRom)}>
                    {romSaved ? '● En biblioteca' : 'Guardar .gba'}
                  </button>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
