// Transport bar. Volume/display live settings live in SettingsModal;
// here only transport + mute + fullscreen + a shortcut to settings.
export default function ControlsBar({
  booted,
  paused,
  turbo,
  muted,
  fullscreen,
  onPause,
  onResume,
  onReset,
  onTurbo,
  onScreenshot,
  onToggleMute,
  onFullscreen,
  onOpenSettings,
}) {
  return (
    <section className="controls">
      <button type="button" disabled={!booted || paused} onClick={onPause}>
        Pausa
      </button>
      <button type="button" disabled={!booted || !paused} onClick={onResume}>
        Seguir
      </button>
      <button type="button" disabled={!booted} onClick={onReset}>
        Reset
      </button>
      <button
        type="button"
        disabled={!booted}
        onClick={onTurbo}
        aria-pressed={turbo > 1}
        title={turbo > 1 ? `Turbo ${turbo}x activo (sin audio)` : 'Activar turbo'}
      >
        Turbo {turbo > 1 ? `${turbo}x` : '1x'}
      </button>
      <button type="button" disabled={!booted} onClick={onScreenshot}>
        Screenshot
      </button>
      <button type="button" disabled={!booted} onClick={onToggleMute}>
        {muted ? 'Unmute' : 'Mute'}
      </button>
      <button
        type="button"
        disabled={!booted}
        onClick={onFullscreen}
        aria-pressed={fullscreen}
        title="Pantalla completa del escenario"
      >
        {fullscreen ? 'Salir ⛶' : '⛶'}
      </button>
      <button type="button" onClick={onOpenSettings}>
        Ajustes
      </button>
    </section>
  );
}
