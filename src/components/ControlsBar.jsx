// Transport + live audio/video settings. All display options apply to the
// running game via engine.config (no reboot needed).
export default function ControlsBar({
  booted,
  paused,
  volume,
  muted,
  display,
  onPause,
  onResume,
  onReset,
  onScreenshot,
  onVolume,
  onToggleMute,
  onDisplay,
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
      <button type="button" disabled={!booted} onClick={onScreenshot}>
        Screenshot
      </button>
      <label className="vol">
        Vol
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => onVolume(Number(e.target.value))}
        />
      </label>
      <button type="button" disabled={!booted} onClick={onToggleMute}>
        {muted ? 'Unmute' : 'Mute'}
      </button>
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
  );
}
