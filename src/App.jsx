import { useCallback, useEffect, useRef, useState } from 'react';
import { EmulatorBridge, TURBO_LEVELS, getDisplayPrefs, setDisplayPrefs } from './emulator/EmulatorBridge.js';
import Screen from './components/Screen.jsx';
import TouchControls from './components/TouchControls.jsx';
import FsMenu from './components/FsMenu.jsx';
import Toasts from './components/Toasts.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import {
  fileToBytes,
  gbaHeaderWarning,
  storageNamespaceFor,
  validateRomFile,
} from './emulator/romLoader.js';
import { exportSlot, importSlot, SLOTS } from './emulator/storage.js';
import { addRecent, clearRecents, getRecents } from './emulator/recents.js';
import { getKeymap, setKeymap } from './emulator/input/keyboard.js';
import logoUrl from './assets/nero-icon.jpg';
import './App.css';

const NOTICE_MS = 4500;

export default function App() {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const [bridge] = useState(() => new EmulatorBridge());
  const fileInputRef = useRef(null);
  const importInputRef = useRef(null);
  const savInputRef = useRef(null);
  const toastId = useRef(0);

  const [romName, setRomName] = useState('');
  const [namespace, setNamespace] = useState('');
  const [status, setStatus] = useState('idle');
  const [booted, setBooted] = useState(false);
  const [fps, setFps] = useState(0);
  const [system, setSystem] = useState('');
  const [toasts, setToasts] = useState([]);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [display, setDisplay] = useState(getDisplayPrefs);
  const [paused, setPaused] = useState(false);
  const [turbo, setTurbo] = useState(1);
  const [slot, setSlot] = useState(1);
  const [slotsUsed, setSlotsUsed] = useState({});
  const [keymap, setKeymapState] = useState(getKeymap);
  const [rebinding, setRebinding] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [pseudoFs, setPseudoFs] = useState(false);
  const [fsMenuOpen, setFsMenuOpen] = useState(false);
  const [recents, setRecents] = useState(getRecents);
  const fullscreenActive = fullscreen || pseudoFs;
  // El ☰ vive en la fila táctil cuando hay fullscreen; en desktop la fila
  // está oculta por CSS y queda el flotante. Cuál se ve lo decide solo CSS
  // (pointer:coarse) para no desincronizar JS y media queries.
  const closeFsMenu = useCallback(() => setFsMenuOpen(false), []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (kind, text) => {
      const id = ++toastId.current;
      setToasts((prev) => [...prev.slice(-3), { id, kind, text }]);
      if (kind !== 'error') {
        setTimeout(() => dismissToast(id), NOTICE_MS);
      }
      return id;
    },
    [dismissToast],
  );

  const toastError = useCallback((text) => pushToast('error', text), [pushToast]);
  const toastInfo = useCallback((text) => pushToast('info', text), [pushToast]);

  const refreshSlots = useCallback(async (ns) => {
    if (!ns) return;
    const entries = await Promise.all(
      SLOTS.map(async (s) => [s, await bridge.slotUsed(s).catch(() => false)]),
    );
    setSlotsUsed(Object.fromEntries(entries));
  }, [bridge]);

  useEffect(() => () => bridge?.destroy(), [bridge]);

  useEffect(() => {
    const onFs = () => {
      const active = !!document.fullscreenElement;
      setFullscreen(active);
      if (!active) setFsMenuOpen(false);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Capture next keydown when rebinding a control (Escape cancels).
  useEffect(() => {
    if (!rebinding) return;
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setRebinding(null);
        return;
      }
      const next = { ...getKeymap(), [rebinding]: e.code };
      setKeymap(next);
      setKeymapState(next);
      bridge?.applyKeymap(next);
      setRebinding(null);
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [rebinding, bridge]);

  const handleFile = useCallback(
    async (file) => {
      setToasts([]);
      setFsMenuOpen(false);
      const err = validateRomFile(file);
      if (err) {
        toastError(err);
        return;
      }
      setStatus('loading');
      try {
        const bytes = await fileToBytes(file);
        const warn = gbaHeaderWarning(bytes, file.name);
        if (warn) toastInfo(warn);
        const ns = await storageNamespaceFor(file.name, bytes);
        await bridge.boot({
          canvas: canvasRef.current,
          romBytes: bytes,
          namespace: ns,
          romName: file.name,
          volume: muted ? 0 : volume,
          display,
          onFrame: setFps,
        });
        setNamespace(ns);
        setRomName(file.name);
        setSystem(bridge.system);
        setStatus('running');
        setBooted(true);
        setPaused(false);
        setTurbo(1);
        setRecents(addRecent({ name: file.name, namespace: ns, system: bridge.system }));
        await refreshSlots(ns);
      } catch (e) {
        setStatus('error');
        setBooted(false);
        toastError(e?.message || 'No se pudo arrancar la ROM.');
      }
    },
    [refreshSlots, bridge, volume, muted, display, toastError, toastInfo],
  );

  const onDisplay = (key, value) => {
    const next = { ...display, [key]: value };
    setDisplay(next);
    setDisplayPrefs(next);
    bridge?.setDisplay(key, value);
  };
  const onVolume = (v) => {
    setVolume(v);
    if (muted && v > 0) {
      setMuted(false);
      bridge?.setMuted(false);
    }
    bridge.setVolume(v);
  };
  const onToggleMute = () => {
    const next = !muted;
    setMuted(next);
    bridge?.setMuted(next);
  };
  const onTurbo = () => {
    const next = TURBO_LEVELS[(TURBO_LEVELS.indexOf(turbo) + 1) % TURBO_LEVELS.length];
    bridge?.setTurbo(next);
    setTurbo(next);
  };
  const onFullscreen = async () => {
    // Salir: tanto de Fullscreen API como del fallback iOS (pseudo).
    if (pseudoFs) {
      setPseudoFs(false);
      setFsMenuOpen(false);
      return;
    }
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFsMenuOpen(false);
        return;
      }
      const el = stageRef.current;
      if (el?.requestFullscreen) {
        await el.requestFullscreen();
        return;
      }
      // Sin Fullscreen API (iPhone Safari): fallback CSS fixed.
      setPseudoFs(true);
    } catch {
      // requestFullscreen puede fallar en iOS: usar fallback en vez de error.
      if (stageRef.current && !document.fullscreenElement) setPseudoFs(true);
      else toastError('Pantalla completa no disponible en este navegador.');
    }
  };
  const onKeymapReset = (fresh) => {
    setKeymapState(fresh);
    bridge?.applyKeymap(fresh);
    toastInfo('Teclado restablecido a defaults.');
  };
  const guard = () => {
    if (!booted) {
      toastError('Carga primero una ROM.');
      return false;
    }
    return true;
  };
  const handlePause = () => {
    bridge.pause();
    setPaused(true);
  };
  const handleResume = () => {
    bridge.resume();
    setPaused(false);
  };

  const onSave = async () => {
    if (!guard()) return;
    try {
      await bridge.saveSlot(slot);
      toastInfo(`Slot ${slot} guardado en IndexedDB.`);
      await refreshSlots(namespace);
    } catch (e) {
      toastError(e?.message || 'saveState falló.');
    }
  };
  const onLoad = async () => {
    if (!guard()) return;
    try {
      await bridge.loadSlot(slot);
      toastInfo(`Slot ${slot} cargado.`);
    } catch (e) {
      toastError(e?.message || 'loadState falló.');
    }
  };
  const onDelete = async () => {
    if (!guard()) return;
    await bridge.deleteSlotData(slot);
    toastInfo(`Slot ${slot} borrado.`);
    await refreshSlots(namespace);
  };
  const onExport = async () => {
    if (!guard()) return;
    try {
      await exportSlot(namespace, slot, romName);
    } catch (e) {
      toastError(e?.message || 'Export falló.');
    }
  };
  const onImportFile = async (file) => {
    if (!guard() || !file) return;
    try {
      await importSlot(namespace, slot, file);
      toastInfo(`Importado a slot ${slot}. Pulsa Cargar.`);
      await refreshSlots(namespace);
    } catch (e) {
      toastError(e?.message || 'Import falló.');
    }
  };
  const onExportSav = async () => {
    if (!guard()) return;
    try {
      await bridge.exportSram();
      toastInfo('Batería .sav exportada.');
    } catch (e) {
      toastError(e?.message || 'Export .sav falló.');
    }
  };
  const onImportSavFile = async (file) => {
    if (!guard() || !file) return;
    try {
      await bridge.importSram(file);
      toastInfo('.sav importado y aplicado al juego.');
    } catch (e) {
      toastError(e?.message || 'Import .sav falló.');
    }
  };
  const onRecent = (r) => {
    fileInputRef.current?.click();
    toastInfo(`Elige de nuevo ${r.name} para continuar (los guardados se conservan).`);
  };
  const onChangeGame = async () => {
    try {
      bridge.pause();
    } catch {
      /* sin juego corriendo, nada que pausar */
    }
    setPaused(true);
    setFsMenuOpen(false);
    setPseudoFs(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* salir de fullscreen es best-effort */
    }
    setStatus('idle');
    setBooted(false);
  };

  const statusText = booted
    ? `${romName} · ${system} · ${fps} fps${turbo > 1 ? ` · Turbo ${turbo}x` : ''}${paused ? ' · paused' : ''}`
    : 'Carga un .gba local para jugar en el núcleo mGBA-WASM';

  return (
    <main
      className="shell"
      onDragOver={!booted ? (e) => e.preventDefault() : undefined}
      onDrop={
        !booted
          ? (e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }
          : undefined
      }
    >
      {/* Waybar superior estilo ricing */}
      <header className="topbar" aria-label="Barra de estado">
        <div className="wb-left">
          <h1><img src={logoUrl} alt="" className="logo" aria-hidden="true" />NeroGBA</h1>
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
          <button type="button" onClick={() => setSettingsOpen(true)} title="Abrir ajustes">
            ⚙
          </button>
        </div>
      </header>

      {/* Input ROM único, siempre montado */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".gba,.gb,.gbc,.sgb,.zip"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
          e.target.value = '';
        }}
      />

      <div className={`desktop${!booted ? ' is-loader' : ''}`}>
        {/* Columna lateral izq: transporte del juego + sistema.
            Se oculta en el menú de carga para no mostrar controles deshabilitados. */}
        {booted && (
        <div className="side-stack left">
          <aside className="dock" aria-label="Transporte del juego">
            <span className="dock-label">juego</span>
            {paused ? (
              <button type="button" disabled={!booted || !paused} onClick={handleResume} title="Seguir" aria-label="Seguir">
                ▶
              </button>
            ) : (
              <button type="button" disabled={!booted || paused} onClick={handlePause} title="Pausa" aria-label="Pausa">
                ⏸
              </button>
            )}
            <button type="button" disabled={!booted} onClick={() => bridge.reset()} title="Reset" aria-label="Reset">
              ⟲
            </button>
            <button
              type="button"
              disabled={!booted}
              onClick={() => bridge.screenshot().catch((e) => toastError(e.message))}
              title="Screenshot"
              aria-label="Screenshot"
            >
              ◉
            </button>
          </aside>

          <aside className="dock" aria-label="Slots de guardado">
            <span className="dock-label">slots</span>
            <select
              value={slot}
              disabled={!booted}
              onChange={(e) => setSlot(Number(e.target.value))}
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
            <button type="button" className="txt" disabled={!booted} onClick={() => importInputRef.current?.click()}>
              Importar
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".state,.bin,application/octet-stream"
              hidden
              onChange={(e) => {
                if (e.target.files?.[0]) onImportFile(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </aside>
        </div>
        )}

        {/* El Screen/canvas vive siempre aquí para no desmontarlo:
            en carga se oculta por CSS (.is-loader) y el boot lo reutiliza. */}
        <div ref={stageRef} className={`fs-wrap${pseudoFs ? ' pseudo-fullscreen' : ''}${!booted ? ' is-loader' : ''}`}>
          {!booted && (
            <section className="loader-hero" aria-label="Cargar juego">
              <p className="loader-kicker">Sala 01 · Carga tu cartucho · ❄ nerogba frost</p>
              <h2>{status === 'loading' ? 'Colgando el lienzo…' : 'Elige tu obra para empezar'}</h2>
              <p className="loader-sub">
                {status === 'loading'
                  ? 'Arrancando el núcleo mGBA…'
                  : 'Arrastra un .gba aquí o elígelo desde tu dispositivo. Solo dumps propios, todo queda en local.'}
              </p>
              <button type="button" className="load-btn" onClick={() => fileInputRef.current?.click()} disabled={status === 'loading'}>
                {status === 'loading' ? 'Cargando…' : 'Elegir juego'}
              </button>
              <p className="formats">.gba · .gb · .gbc · .sgb · .zip</p>
            </section>
          )}
          <Screen canvasRef={canvasRef} status={booted ? status : 'idle'} onDropFile={handleFile} romName={romName} />

          {booted && (
            <TouchControls
              keymap={keymap}
              turbo={turbo}
              onTurbo={onTurbo}
              onMenu={() => setFsMenuOpen((v) => !v)}
              menuOpen={fsMenuOpen}
              showMenu={fullscreenActive}
            />
          )}

          {fullscreenActive && (
            <FsMenu
              open={fsMenuOpen}
              onToggle={() => setFsMenuOpen((v) => !v)}
              onClose={closeFsMenu}
              booted={booted}
              paused={paused}
              turbo={turbo}
              muted={muted}
              slot={slot}
              slotsUsed={slotsUsed}
              onSlotChange={setSlot}
              onPause={handlePause}
              onResume={handleResume}
              onReset={() => bridge.reset()}
              onTurbo={onTurbo}
              onScreenshot={() => bridge.screenshot().catch((e) => toastError(e.message))}
              onToggleMute={onToggleMute}
              onFullscreen={onFullscreen}
              onOpenSettings={() => {
                setFsMenuOpen(false);
                setSettingsOpen(true);
              }}
              onSave={onSave}
              onLoad={onLoad}
              onDelete={onDelete}
              onExport={onExport}
              onImportClick={() => importInputRef.current?.click()}
            />
          )}

          <Toasts toasts={toasts} onDismiss={dismissToast} />

          <SettingsModal
            open={settingsOpen}
            onClose={() => {
              setSettingsOpen(false);
              setRebinding(null);
            }}
            keymap={keymap}
            rebinding={rebinding}
            onRebind={setRebinding}
            onKeymapReset={onKeymapReset}
            volume={muted ? 0 : volume}
            onVolume={onVolume}
            display={display}
            onDisplay={onDisplay}
          />
        </div>

        {/* Columna lateral der: video + slots + batería.
            Se oculta en el menú de carga para no mostrar controles deshabilitados. */}
        {booted && (
        <div className="side-stack right">
          <aside className="dock" aria-label="Ajustes de video">
            <span className="dock-label">video</span>
            <button
              type="button"
              disabled={!booted}
              onClick={onTurbo}
              aria-pressed={turbo > 1}
              className={`pill-toggle${turbo > 1 ? ' on' : ''}`}
              title={turbo > 1 ? `Turbo ${turbo}x activo (sin audio)` : 'Activar turbo'}
            >
              {turbo > 1 ? `${turbo}x` : '1x'}
            </button>
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
            <button type="button" className="txt" disabled={!booted} onClick={() => savInputRef.current?.click()}>
              Importar .sav
            </button>
            <input
              ref={savInputRef}
              type="file"
              accept=".sav,.bin,application/octet-stream"
              hidden
              onChange={(e) => {
                if (e.target.files?.[0]) onImportSavFile(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </aside>
        </div>
        )}
      </div>

      {!booted && recents.length > 0 && (
        <section className="controls recents" aria-label="ROMs recientes">
          <h2>Recientes · dmenu</h2>
          {recents.map((r) => (
            <button key={r.namespace} type="button" onClick={() => onRecent(r)} title={r.system || ''}>
              {r.name}
            </button>
          ))}
          <button type="button" className="linklike" onClick={() => setRecents(clearRecents())}>
            Limpiar
          </button>
        </section>
      )}

      <footer className="help">
        {!booted ? (
          <>
            <p>
              Tus dumps nunca salen del dispositivo. Sin BIOS se usa el reemplazo HLE del núcleo
              mGBA-WASM.
            </p>
            <p className="legal">Usa solo dumps propios. No se incluye ninguna ROM con copyright.</p>
          </>
        ) : (
          <>
            <p>
              Gamepad standard funciona solo. Sin BIOS se usa el reemplazo HLE. SRAM de batería la
              persiste el núcleo en OPFS cada 15s (exportable como .sav).
            </p>
            <p className="legal">Usa solo dumps propios. No se incluye ninguna ROM con copyright.</p>
          </>
        )}
      </footer>
    </main>
  );
}
