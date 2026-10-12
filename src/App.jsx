import { useCallback, useEffect, useRef, useState } from 'react';
import { EmulatorBridge, TURBO_LEVELS, getDisplayPrefs, setDisplayPrefs } from './emulator/EmulatorBridge.js';
import Screen from './components/Screen.jsx';
import ControlsBar from './components/ControlsBar.jsx';
import TouchControls from './components/TouchControls.jsx';
import {
  fileToBytes,
  gbaHeaderWarning,
  storageNamespaceFor,
  validateRomFile,
} from './emulator/romLoader.js';
import { exportSlot, importSlot, SLOTS } from './emulator/storage.js';
import { CONTROLS, DEFAULT_KEYMAP, getKeymap, setKeymap } from './emulator/input/keyboard.js';
import './App.css';

export default function App() {
  const canvasRef = useRef(null);
  const [bridge] = useState(() => new EmulatorBridge());
  const importInputRef = useRef(null);

  const [romName, setRomName] = useState('');
  const [namespace, setNamespace] = useState('');
  const [status, setStatus] = useState('idle');
  const [booted, setBooted] = useState(false);
  const [fps, setFps] = useState(0);
  const [system, setSystem] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [display, setDisplay] = useState(getDisplayPrefs);
  const [paused, setPaused] = useState(false);
  const [turbo, setTurbo] = useState(1);
  const [slot, setSlot] = useState(1);
  const [slotsUsed, setSlotsUsed] = useState({});
  const [keymap, setKeymapState] = useState(getKeymap);
  const [rebinding, setRebinding] = useState(null);

  const refreshSlots = useCallback(async (ns) => {
    if (!ns) return;
    const entries = await Promise.all(
      SLOTS.map(async (s) => [s, await bridge.slotUsed(s).catch(() => false)]),
    );
    setSlotsUsed(Object.fromEntries(entries));
  }, [bridge]);

  useEffect(() => () => bridge?.destroy(), [bridge]);

  // Capture next keydown when rebinding a control.
  useEffect(() => {
    if (!rebinding) return;
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
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
      setError('');
      setNotice('');
      const err = validateRomFile(file);
      if (err) {
        setError(err);
        return;
      }
      setStatus('loading');
      try {
        const bytes = await fileToBytes(file);
        const warn = gbaHeaderWarning(bytes, file.name);
        if (warn) setNotice(warn);
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
        await refreshSlots(ns);
      } catch (e) {
        setStatus('error');
        setBooted(false);
        setError(e?.message || 'No se pudo arrancar la ROM.');
      }
    },
    [refreshSlots, bridge, volume, muted, display],
  );

  const onDisplay = (key, value) => {
    const next = { ...display, [key]: value };
    setDisplay(next);
    setDisplayPrefs(next);
    bridge?.setDisplay(key, value);
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
  const guard = () => {
    if (!booted) {
      setError('Carga primero una ROM.');
      return false;
    }
    return true;
  };

  const onSave = async () => {
    if (!guard()) return;
    try {
      await bridge.saveSlot(slot);
      setNotice(`Slot ${slot} guardado en IndexedDB.`);
      await refreshSlots(namespace);
    } catch (e) {
      setError(e?.message || 'saveState falló.');
    }
  };
  const onLoad = async () => {
    if (!guard()) return;
    try {
      await bridge.loadSlot(slot);
      setNotice(`Slot ${slot} cargado.`);
    } catch (e) {
      setError(e?.message || 'loadState falló.');
    }
  };
  const onDelete = async () => {
    if (!guard()) return;
    await bridge.deleteSlotData(slot);
    setNotice(`Slot ${slot} borrado.`);
    await refreshSlots(namespace);
  };
  const onExport = async () => {
    if (!guard()) return;
    try {
      await exportSlot(namespace, slot, romName);
    } catch (e) {
      setError(e?.message || 'Export falló.');
    }
  };
  const onImportFile = async (file) => {
    if (!guard() || !file) return;
    try {
      await importSlot(namespace, slot, file);
      setNotice(`Importado a slot ${slot}. Pulsa Cargar.`);
      await refreshSlots(namespace);
    } catch (e) {
      setError(e?.message || 'Import falló.');
    }
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
          type="file"
          accept=".gba,.gb,.gbc,.sgb,.zip"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </header>

      <Screen canvasRef={canvasRef} status={status} onDropFile={handleFile} />

      {booted && <TouchControls keymap={keymap} />}

      {(error || notice) && (
        <div className="notices">
          {error && <p className="err">{error}</p>}
          {notice && <p className="warn">{notice}</p>}
        </div>
      )}

      <ControlsBar
        booted={booted}
        paused={paused}
        turbo={turbo}
        volume={volume}
        muted={muted}
        display={display}
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
        onScreenshot={() => bridge.screenshot().catch((e) => setError(e.message))}
        onVolume={(v) => {
          setVolume(v);
          if (muted && v > 0) {
            setMuted(false);
            bridge?.setMuted(false);
          }
          bridge.setVolume(v);
        }}
        onToggleMute={onToggleMute}
        onDisplay={onDisplay}
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

      <section className="controls keymap">
        <h2>Teclado</h2>
        {CONTROLS.map((action) => (
          <button
            key={action}
            type="button"
            className={rebinding === action ? 'rebind' : ''}
            onClick={() => setRebinding(action)}
            title={`Default: ${DEFAULT_KEYMAP[action]}`}
          >
            {action.replace('p1.', '')}: {rebinding === action ? 'pulsa tecla…' : keymap[action]}
          </button>
        ))}
      </section>

      <footer className="help">
        <p>
          Gamepad standard funciona solo. Sin BIOS se usa el reemplazo HLE. SRAM de batería la
          persiste el núcleo en OPFS cada 15s.
        </p>
        <p className="legal">Usa solo dumps propios. No se incluye ninguna ROM con copyright.</p>
      </footer>
    </main>
  );
}
