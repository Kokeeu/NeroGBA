// Settings modal: keyboard remap table only.
// Audio + display already live in the side docks / FsMenu, so the modal
// stays exclusive to keyboard to avoid duplicated controls.
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
        aria-label="Ajustes de teclado"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2>Teclado</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar ajustes de teclado">
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
      </div>
    </div>
  );
}
