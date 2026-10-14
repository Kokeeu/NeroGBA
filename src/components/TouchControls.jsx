// Touch overlay for coarse pointers (phones/tablets).
// Layout estilo My Boy: fila L [☰ ⛶] R, cruceta + A/B y Select/Start.
// Drives the emulator by dispatching synthetic KeyboardEvents through the
// active keymap — the SDK already listens on window for keydown/keyup by
// e.code, so no extra input plumbing is needed. CSS hides this on fine
// pointers; it only renders while a game is booted. El turbo vive dentro
// del menú ☰ (FsMenu); en el deck queda ⛶ para acceso rápido.
import { useRef } from 'react';

function press(code) {
  window.dispatchEvent(new KeyboardEvent('keydown', { code }));
}

function release(code) {
  window.dispatchEvent(new KeyboardEvent('keyup', { code }));
}

function TouchButton({ action, label, code, className = '' }) {
  const held = useRef(false);
  const down = (e) => {
    e.preventDefault();
    if (held.current) return;
    held.current = true;
    press(code);
  };
  const up = (e) => {
    e.preventDefault();
    if (!held.current) return;
    held.current = false;
    release(code);
  };
  return (
    <button
      type="button"
      aria-label={action}
      className={`tbtn ${className}`}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

export default function TouchControls({ keymap, onMenu, menuOpen = false, showMenu = false, onFullscreen, fullscreenActive = false }) {
  const c = (action) => keymap[action];
  return (
    <section className="touch" aria-label="Controles táctiles">
      <div className="tshoulders">
        <TouchButton action="L" label="L" code={c('p1.l')} className="tshoulder" />
        <div className="tcenter">
          {showMenu && (
            <button
              type="button"
              className="tbtn tmenu"
              onClick={onMenu}
              aria-expanded={menuOpen}
              aria-label="Abrir menú"
              title="Menú"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          )}
          {onFullscreen && (
            <button
              type="button"
              className="tbtn tfullscreen"
              onClick={onFullscreen}
              aria-pressed={fullscreenActive}
              aria-label={fullscreenActive ? 'Salir de pantalla completa' : 'Pantalla completa'}
              title={fullscreenActive ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              ⛶
            </button>
          )}
        </div>
        <TouchButton action="R" label="R" code={c('p1.r')} className="tshoulder" />
      </div>
      <div className="tmain">
        <div className="dpad" aria-label="Cruceta">
          <span />
          <TouchButton action="up" label="▲" code={c('p1.up')} />
          <span />
          <TouchButton action="left" label="◀" code={c('p1.left')} />
          <span />
          <TouchButton action="right" label="▶" code={c('p1.right')} />
          <span />
          <TouchButton action="down" label="▼" code={c('p1.down')} />
          <span />
        </div>
        <div className="ab" aria-label="Botones A B">
          <TouchButton action="B" label="B" code={c('p1.b')} className="tround" />
          <TouchButton action="A" label="A" code={c('p1.a')} className="tround" />
        </div>
      </div>
      <div className="tstart">
        <TouchButton action="select" label="SELECT" code={c('p1.select')} className="tsmall" />
        <TouchButton action="start" label="START" code={c('p1.start')} className="tsmall" />
      </div>
    </section>
  );
}
