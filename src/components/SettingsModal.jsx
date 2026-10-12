// Settings modal: keyboard remap table + volume + display prefs.
// Remap capture itself lives in App (window keydown listener); the modal
// only renders the table and forwards actions.
import { useEffect, useRef } from 'react';
import { CONTROLS, DEFAULT_KEYMAP, resetKeymap } from '../emulator/input/keyboard.js';

export default function SettingsModal({
  open,
  onClose,
  keymap,
  rebinding,
  onRebind,
  onKeymapReset,
  volume,
  onVolume,
  display,
  onDisplay,
}) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onResetKeys = () => {
    const fresh = resetKeymap();
    onKeymapReset(fresh);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Ajustes"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2>Ajustes</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar ajustes">
            ×
          </button>
        </header>

        <section className="modal-sec">
          <h3>Teclado</h3>
          <div className="keygrid">
            {CONTROLS.map((action) => (
              <button
                key={action}
                type="button"
                className={rebinding === action ? 'rebind' : ''}
                onClick={() => onRebind(action)}
                title={`Default: ${DEFAULT_KEYMAP[action]}`}
              >
                {action.replace('p1.', '')}:{' '}
                {rebinding === action ? 'pulsa tecla…' : keymap[action]}
              </button>
            ))}
          </div>
          <button type="button" className="linklike" onClick={onResetKeys}>
            Restablecer defaults
          </button>
        </section>

        <section className="modal-sec">
          <h3>Audio</h3>
          <label className="vol">
            Volumen
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => onVolume(Number(e.target.value))}
            />
          </label>
        </section>

        <section className="modal-sec">
          <h3>Pantalla</h3>
          <label>
            Filtro
            <select
              value={display.renderFilter}
              onChange={(e) => onDisplay('renderFilter', e.target.value)}
            >
              <option value="pixelated">Pixelado</option>
              <option value="smooth">Suave</option>
            </select>
          </label>
          <label>
            Aspecto
            <select value={display.aspect} onChange={(e) => onDisplay('aspect', e.target.value)}>
              <option value="native">Nativo</option>
              <option value="4:3">4:3</option>
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={display.interframeBlending}
              onChange={(e) => onDisplay('interframeBlending', e.target.checked)}
            />
            Ghosting LCD
          </label>
        </section>
      </div>
    </div>
  );
}
