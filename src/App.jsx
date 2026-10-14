// App — thin orchestrator (container) for NeroGBA.
//
// Architecture (see AGENT.md):
// - Domain/infra lives in `src/emulator/` (bridge, ROM validation, saves).
// - Reusable side-effect helpers live in `src/lib/` + `src/hooks/`.
// - Presentational UI lives in `src/components/` (TopBar, docks, modals).
// This file only wires state -> bridge -> UI. No CSS, no WASM details here.
import { useCallback, useEffect, useRef, useState } from 'react';
import { EmulatorBridge, TURBO_LEVELS, getDisplayPrefs, setDisplayPrefs } from './emulator/EmulatorBridge.js';
import Screen from './components/Screen.jsx';
import TouchControls from './components/TouchControls.jsx';
import FsMenu from './components/FsMenu.jsx';
import Toasts from './components/Toasts.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import TopBar from './components/TopBar.jsx';
import LoaderHero from './components/LoaderHero.jsx';
import RecentsBar from './components/RecentsBar.jsx';
import { LeftDocks, RightDocks } from './components/SideDocks.jsx';
import { useToasts } from './hooks/useToasts.js';
import { useFullscreen } from './hooks/useFullscreen.js';
import {
  fileToBytes,
  gbaHeaderWarning,
  storageNamespaceFor,
  validateRomFile,
} from './emulator/romLoader.js';
import { exportSlot, importSlot, SLOTS } from './emulator/storage.js';
import {
  deleteRom,
  getRom,
  hasRom,
  listRoms,
  requestPersistence,
  saveRom,
} from './emulator/romLibrary.js';
import { addRecent, getRecents, removeRecent } from './emulator/recents.js';
import { getKeymap, setKeymap } from './emulator/input/keyboard.js';
import logoUrl from './assets/nero-icon.png';
import './App.css';

export default function App() {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const [bridge] = useState(() => new EmulatorBridge());
  const fileInputRef = useRef(null);
  const importInputRef = useRef(null);
  const savInputRef = useRef(null);
  // Bytes de la ROM en juego: se retienen para "Guardar .gba" en biblioteca.
  // Se liberan al cambiar de juego. (~32MB máx., ver romLoader MAX_ROM_BYTES).
  const romBytesRef = useRef(null);

  // --- UI state (local; game truth lives inside the bridge/engine) ---
  const [romName, setRomName] = useState('');
  const [namespace, setNamespace] = useState('');
  const [status, setStatus] = useState('idle');
  const [booted, setBooted] = useState(false);
  const [fps, setFps] = useState(0);
  const [system, setSystem] = useState('');
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
  const [fsMenuOpen, setFsMenuOpen] = useState(false);
  const [recents, setRecents] = useState(getRecents);
  // Biblioteca local de ROMs (IndexedDB): { [namespace]: {name, byteLength, savedAt} }
  const [library, setLibrary] = useState({});
  const [romSaved, setRomSaved] = useState(false);

  // --- Cross-cutting concerns extracted to hooks (SRP) ---
  const { toasts, toastInfo, toastError, dismissToast, clearToasts } = useToasts();
  const fs = useFullscreen(stageRef, toastError);
  const fullscreenActive = fs.active;
  // El ☰ vive en la fila táctil cuando hay fullscreen; en desktop la fila
  // está oculta por CSS y queda el flotante. Cuál se ve lo decide solo CSS
  // (pointer:coarse) para no desincronizar JS y media queries.
  const closeFsMenu = useCallback(() => setFsMenuOpen(false), []);

  const refreshSlots = useCallback(async (ns) => {
    if (!ns) return;
    const entries = await Promise.all(
      SLOTS.map(async (s) => [s, await bridge.slotUsed(s).catch(() => false)]),
    );
    setSlotsUsed(Object.fromEntries(entries));
  }, [bridge]);

  const refreshLibrary = useCallback(async () => {
    const index = await listRoms();
    setLibrary(index);
    if (namespace) setRomSaved(namespace in index);
  }, [namespace]);

  useEffect(() => () => bridge?.destroy(), [bridge]);

  // Biblioteca: pedir persistencia + cargar índice al montar (y refrescar
  // tras cada boot, ya que refreshLibrary depende del namespace activo).
  // Carga async desde IndexedDB (sistema externo): los setState ocurren
  // tras await, no es un render en cascada.
  useEffect(() => {
    requestPersistence();
    // oxlint-disable-next-line react/set-state-in-effect
    refreshLibrary();
  }, [refreshLibrary]);

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

  // --- Boot (bytes -> WASM -> UI state). Shared by picker and library. ---
  const bootFromBytes = useCallback(
    async (bytes, name) => {
      clearToasts();
      setFsMenuOpen(false);
      setStatus('loading');
      try {
        const warn = gbaHeaderWarning(bytes, name);
        if (warn) toastInfo(warn);
        const ns = await storageNamespaceFor(name, bytes);
        await bridge.boot({
          canvas: canvasRef.current,
          romBytes: bytes,
          namespace: ns,
          romName: name,
          volume: muted ? 0 : volume,
          display,
          onFrame: setFps,
        });
        romBytesRef.current = bytes;
        setNamespace(ns);
        setRomName(name);
        setSystem(bridge.system);
        setStatus('running');
        setBooted(true);
        setPaused(false);
        setTurbo(1);
        setRomSaved(await hasRom(ns).catch(() => false));
        setRecents(addRecent({ name, namespace: ns, system: bridge.system }));
        await refreshSlots(ns);
      } catch (e) {
        romBytesRef.current = null;
        setStatus('error');
        setBooted(false);
        toastError(e?.message || 'No se pudo arrancar la ROM.');
      }
    },
    [refreshSlots, bridge, volume, muted, display, toastError, toastInfo, clearToasts],
  );

  const handleFile = useCallback(
    async (file) => {
      const err = validateRomFile(file);
      if (err) {
        clearToasts();
        setFsMenuOpen(false);
        toastError(err);
        return;
      }
      await bootFromBytes(await fileToBytes(file), file.name);
    },
    [bootFromBytes, clearToasts, toastError],
  );

  // Arranque directo desde la biblioteca (sin re-elegir el archivo).
  const handleBootSaved = useCallback(
    async (recent) => {
      const entry = await getRom(recent.namespace);
      if (!entry) {
        toastInfo(`Elige de nuevo ${recent.name} para continuar (los guardados se conservan).`);
        fileInputRef.current?.click();
        return;
      }
      await bootFromBytes(entry.bytes, entry.name);
    },
    [bootFromBytes, toastInfo],
  );

  // --- Display / audio / turbo ---
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
  const onKeymapReset = (fresh) => {
    setKeymapState(fresh);
    bridge?.applyKeymap(fresh);
    toastInfo('Teclado restablecido a defaults.');
  };

  // --- Guards + transport ---
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
  const handleScreenshot = () => bridge.screenshot().catch((e) => toastError(e.message));

  // --- Savestates (IndexedDB) + SRAM (.sav) ---
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

  // --- Biblioteca local de ROMs (IndexedDB, explícita) ---
  const onSaveToLibrary = async () => {
    if (!guard() || !romBytesRef.current) return;
    try {
      const mb = await saveRom(namespace, romName, romBytesRef.current);
      setRomSaved(true);
      await refreshLibrary();
      toastInfo(`ROM guardada en este navegador (${(mb / 1048576).toFixed(1)}MB).`);
    } catch (e) {
      toastError(e?.message || 'No se pudo guardar la ROM.');
    }
  };
  const onDeleteRom = async (recent) => {
    await deleteRom(recent.namespace);
    await refreshLibrary();
    toastInfo(`${recent.name} borrada de este navegador (los guardados se conservan).`);
  };
  const onRemoveRecent = (recent) => {
    setRecents(removeRecent(recent.namespace));
  };

  // --- Navigation ---
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
    romBytesRef.current = null;
    setRomSaved(false);
    setPaused(true);
    setFsMenuOpen(false);
    await fs.exit();
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
      <TopBar
        logoUrl={logoUrl}
        booted={booted}
        statusText={statusText}
        onChangeGame={onChangeGame}
        onOpenSettings={() => setSettingsOpen(true)}
      />

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
      {/* Inputs ocultos de import (slots + .sav): viven aquí para servir
          tanto a los docks desktop como al FsMenu móvil. */}
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

      <div className={`desktop${!booted ? ' is-loader' : ''}`}>
        {booted && (
          <LeftDocks
            booted={booted}
            paused={paused}
            onPause={handlePause}
            onResume={handleResume}
            onReset={() => bridge.reset()}
            onScreenshot={handleScreenshot}
            slot={slot}
            slotsUsed={slotsUsed}
            onSlotChange={setSlot}
            onSave={onSave}
            onLoad={onLoad}
            onDelete={onDelete}
            onExport={onExport}
            onImportClick={() => importInputRef.current?.click()}
          />
        )}

        {/* El Screen/canvas vive siempre aquí para no desmontarlo:
            en carga se oculta por CSS (.is-loader) y el boot lo reutiliza. */}
        <div ref={stageRef} className={`fs-wrap${fs.pseudo ? ' pseudo-fullscreen' : ''}${!booted ? ' is-loader' : ''}`}>
          {!booted && (
            <LoaderHero loading={status === 'loading'} onPick={() => fileInputRef.current?.click()} />
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
              onScreenshot={handleScreenshot}
              onToggleMute={onToggleMute}
              onFullscreen={fs.enter}
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

        {booted && (
          <RightDocks
            booted={booted}
            turbo={turbo}
            onTurbo={onTurbo}
            display={display}
            onDisplay={onDisplay}
            muted={muted}
            volume={volume}
            onVolume={onVolume}
            onToggleMute={onToggleMute}
            fullscreenActive={fullscreenActive}
            onFullscreen={fs.enter}
            onExportSav={onExportSav}
            onImportSavClick={() => savInputRef.current?.click()}
            romSaved={romSaved}
            onSaveRom={onSaveToLibrary}
          />
        )}
      </div>

      {!booted && (
        <RecentsBar
          recents={recents}
          library={library}
          onBootSaved={handleBootSaved}
          onRecent={onRecent}
          onDeleteRom={onDeleteRom}
          onRemoveRecent={onRemoveRecent}
        />
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
