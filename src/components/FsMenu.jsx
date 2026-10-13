// Menú flotante para fullscreen móvil (dentro de .fs-wrap, que es el
// target de Fullscreen API + fallback pseudo). Incluye transporte,
// slots y ajustes/salir. Batería .sav queda fuera a propósito.
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
  onSlotChange,
  onPause,
  onResume,
  onReset,
  onTurbo,
  onScreenshot,
  onToggleMute,
  onFullscreen,
  onOpenSettings,
  onSave,
  onLoad,
  onDelete,
  onExport,
  onImportClick,
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
        aria-label="Abrir menú de pantalla completa"
      >
        {open ? '✕' : '☰'}
      </button>

      {open && (
        <>
          <div className="fs-menu-backdrop" onClick={onClose} aria-hidden="true" />
          <div id="fs-menu-panel" className="fs-menu-panel" role="menu" aria-label="Menú pantalla completa">
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
                <button type="button" disabled={!booted} onClick={act(onTurbo, true)}>
                  Turbo {turbo > 1 ? `${turbo}x` : '1x'}
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
                <button type="button" className="fs-leave" onClick={act(onFullscreen)}>
                  Salir ⛶
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
