// Side docks (presentational): desktop side columns, mobile pill carousel.
// Split of the former inline JSX in App.jsx — same behavior, single place to
// evolve JUEGO / SLOTS / VIDEO / SISTEMA. See DESIGN.md "Docks".
import { SLOTS } from '../emulator/storage.js';

/** Left column: transport (JUEGO) + savestates (SLOTS). */
export function LeftDocks({
  booted,
  paused,
  onPause,
  onResume,
  onReset,
  onScreenshot,
  slot,
  slotsUsed,
  onSlotChange,
  onSave,
  onLoad,
  onDelete,
  onExport,
  onImportClick,
}) {
  return (
    <div className="side-stack left">
      <aside className="dock" aria-label="Transporte del juego">
        <span className="dock-label">juego</span>
        {paused ? (
          <button type="button" disabled={!booted || !paused} onClick={onResume} title="Seguir" aria-label="Seguir">
            ▶
          </button>
        ) : (
          <button type="button" disabled={!booted || paused} onClick={onPause} title="Pausa" aria-label="Pausa">
            ⏸
          </button>
        )}
        <button type="button" disabled={!booted} onClick={onReset} title="Reset" aria-label="Reset">
          ⟲
        </button>
        <button type="button" disabled={!booted} onClick={onScreenshot} title="Screenshot" aria-label="Screenshot">
          ◉
        </button>
      </aside>

      <aside className="dock" aria-label="Slots de guardado">
        <span className="dock-label">slots</span>
        <select
          value={slot}
          disabled={!booted}
          onChange={(e) => onSlotChange(Number(e.target.value))}
          aria-label="Slot de guardado"
          title="Slot de guardado"
        >
          {SLOTS.map((s) => (
            <option key={s} value={s}>
              {s} {slotsUsed[s] ? '●' : '○'}
            </option>
          ))}
        </select>
        <button type="button" className="txt" disabled={!booted} onClick={onSave}>
          Guardar
        </button>
        <button type="button" className="txt" disabled={!booted} onClick={onLoad}>
          Cargar
        </button>
        <button type="button" className="txt" disabled={!booted} onClick={onDelete}>
          Borrar
        </button>
        <button type="button" className="txt" disabled={!booted} onClick={onExport}>
          Exportar
        </button>
        <button type="button" className="txt" disabled={!booted} onClick={onImportClick}>
          Importar
        </button>
      </aside>
    </div>
  );
}

/** Right column: video prefs (VIDEO) + system (SISTEMA: audio/fullscreen/.sav). */
export function RightDocks({
  booted,
  turbo,
  turboPref = 2,
  onTurbo,
  onTurboPref,
  display,
  onDisplay,
  muted,
  volume,
  onVolume,
  onToggleMute,
  fullscreenActive,
  onFullscreen,
  onExportSav,
  onImportSavClick,
  romSaved = false,
  onSaveRom,
  onOpenSettings,
}) {
  return (
    <div className="side-stack right">
      <aside className="dock" aria-label="Ajustes de video">
        <span className="dock-label">video</span>
        <button
          type="button"
          disabled={!booted}
          onClick={onTurbo}
          aria-pressed={turbo > 1}
          className={`pill-toggle${turbo > 1 ? ' on' : ''}`}
          title={turbo > 1 ? `Turbo ${turbo}x activo, pulsa para volver a 1x` : `Activar turbo ${turboPref}x`}
        >
          {turbo > 1 ? `${turbo}x` : `${turboPref}x`}
        </button>
        <select
          value={turboPref}
          onChange={(e) => onTurboPref?.(Number(e.target.value))}
          aria-label="Velocidad de turbo"
          title="Velocidad de turbo (2x, 4x o 10x)"
        >
          <option value={2}>2x</option>
          <option value={4}>4x</option>
          <option value={10}>10x</option>
        </select>
        <button
          type="button"
          onClick={() => onDisplay('renderFilter', display.renderFilter === 'pixelated' ? 'smooth' : 'pixelated')}
          title={`Filtro: ${display.renderFilter}`}
          aria-label="Cambiar filtro"
        >
          ◐
        </button>
        <button
          type="button"
          onClick={() => onDisplay('aspect', display.aspect === 'native' ? '4:3' : 'native')}
          title={`Aspecto: ${display.aspect}`}
          aria-label="Cambiar aspecto"
        >
          ▭
        </button>
        <button
          type="button"
          onClick={() => onDisplay('interframeBlending', !display.interframeBlending)}
          aria-pressed={!!display.interframeBlending}
          title="Ghosting LCD"
          aria-label="Ghosting LCD"
        >
          ◑
        </button>
      </aside>

      <aside className="dock" aria-label="Sistema">
        <span className="dock-label">sistema</span>
        <button
          type="button"
          disabled={!booted}
          onClick={onToggleMute}
          aria-pressed={muted}
          title={muted ? 'Activar audio' : 'Silenciar'}
          aria-label={muted ? 'Activar audio' : 'Silenciar'}
        >
          {muted ? '♪̸' : '♪'}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          disabled={!booted}
          onChange={(e) => onVolume(Number(e.target.value))}
          aria-label="Volumen"
          title="Volumen"
        />
        <button
          type="button"
          className="txt"
          onClick={onFullscreen}
          aria-pressed={fullscreenActive}
          title="Pantalla completa del escenario"
        >
          {fullscreenActive ? 'Salir ⛶' : '⛶ Pantalla'}
        </button>
        <button type="button" className="txt" disabled={!booted} onClick={onExportSav}>
          Exportar .sav
        </button>
        <button type="button" className="txt" disabled={!booted} onClick={onImportSavClick}>
          Importar .sav
        </button>
        <button
          type="button"
          className="txt"
          disabled={!booted || romSaved}
          onClick={onSaveRom}
          title={romSaved ? 'Esta ROM ya está en la biblioteca local' : 'Guardar la ROM en este navegador (biblioteca local)'}
        >
          {romSaved ? '● En biblioteca' : 'Guardar .gba'}
        </button>
        <button
          type="button"
          className="txt"
          onClick={onOpenSettings}
          title="Ver y remapear controles de teclado"
          aria-label="Abrir ajustes de teclado"
        >
          ⌨ Teclado
        </button>
      </aside>
    </div>
  );
}
