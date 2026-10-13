import { useCallback, useEffect, useRef, useState } from 'react';
import { EmulatorBridge, TURBO_LEVELS, getDisplayPrefs, setDisplayPrefs } from './emulator/EmulatorBridge.js';
import Screen from './components/Screen.jsx';
import ControlsBar from './components/ControlsBar.jsx';
import TouchControls from './components/TouchControls.jsx';
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
  const [recents, setRecents] = useState(getRecents);
  const fullscreenActive = fullscreen || pseudoFs;

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
    const onFs = () => setFullscreen(!!document.fullscreenElement);
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
      return;
    }
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
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

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>NeroGBA</h1>
          <p className="sub">
            {romName ? `${romName} · ${system} · ${fps} fps${turbo > 1 ? ` · Turbo ${turbo}x` : ''}` : 'Carga un .gba local para jugar en el núcleo mGBA-WASM'}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".gba,.gb,.gbc,.sgb,.zip"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFile(e.target.files[0]);
            e.target.value = '';
          }}
        />
      </header>

      <div ref={stageRef} className={`fs-wrap${pseudoFs ? ' pseudo-fullscreen' : ''}`}>
        <Screen canvasRef={canvasRef} status={status} onDropFile={handleFile} />

        {booted && <TouchControls keymap={keymap} />}

        {fullscreenActive && (
          <button type="button" className="fs-exit" onClick={onFullscreen} aria-label="Salir de pantalla completa">
            Salir ⛶
          </button>
        )}
      </div>

      <Toasts toasts={toasts} onDismiss={dismissToast} />

      {!booted && recents.length > 0 && (
        <section className="controls recents" aria-label="ROMs recientes">
          <h2>Recientes</h2>
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

      <ControlsBar
        booted={booted}
        paused={paused}
        turbo={turbo}
        muted={muted}
        fullscreen={fullscreenActive}
        onPause={() => {
          bridge.pause();
          setPaused(true);
        }}
        onResume={() => {
          bridge.resume();
          setPaused(false);
        }}
        onReset={() => bridge.reset()}
        onTurbo={onTurbo}
        onScreenshot={() => bridge.screenshot().catch((e) => toastError(e.message))}
        onToggleMute={onToggleMute}
        onFullscreen={onFullscreen}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <section className="controls">
        <label>
          Slot
          <select value={slot} onChange={(e) => setSlot(Number(e.target.value))}>
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {s} {slotsUsed[s] ? '●' : '○'}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onSave}>
          Guardar
        </button>
        <button type="button" onClick={onLoad}>
          Cargar
        </button>
        <button type="button" onClick={onDelete}>
          Borrar
        </button>
        <button type="button" onClick={onExport}>
          Exportar
        </button>
        <button type="button" onClick={() => importInputRef.current?.click()}>
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
      </section>

      <section className="controls" aria-label="Batería SRAM">
        <h2>Batería (.sav)</h2>
        <button type="button" onClick={onExportSav}>
          Exportar .sav
        </button>
        <button type="button" onClick={() => savInputRef.current?.click()}>
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
      </section>

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

      <footer className="help">
        <p>
          Gamepad standard funciona solo. Sin BIOS se usa el reemplazo HLE. SRAM de batería la
          persiste el núcleo en OPFS cada 15s (exportable como .sav).
        </p>
        <p className="legal">Usa solo dumps propios. No se incluye ninguna ROM con copyright.</p>
      </footer>
    </main>
  );
}
