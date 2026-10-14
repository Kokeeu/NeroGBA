// Fullscreen orchestration: Fullscreen API + iOS fallback (pseudo-fullscreen).
// Best practice: encapsulate the platform quirk (iPhone Safari has no
// requestFullscreen on arbitrary elements) behind one hook so App.jsx only
// calls `enter() / exit() / toggle()` and reads `active`.
import { useCallback, useEffect, useState } from 'react';

/**
 * @param {import('react').RefObject<HTMLElement>} stageRef wrapper to fullscreen
 * @param {(text: string) => void} [onError] error sink (toast)
 */
export function useFullscreen(stageRef, onError) {
  const [native, setNative] = useState(false);
  const [pseudo, setPseudo] = useState(false);
  const active = native || pseudo;

  useEffect(() => {
    const onChange = () => setNative(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const exit = useCallback(async () => {
    setPseudo(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // best-effort: salir nunca debe romper la sesión de juego
    }
  }, []);

  const enter = useCallback(async () => {
    if (pseudo) {
      setPseudo(false);
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
      // iPhone Safari: fallback CSS fixed (.pseudo-fullscreen).
      setPseudo(true);
    } catch {
      if (stageRef.current && !document.fullscreenElement) setPseudo(true);
      else onError?.('Pantalla completa no disponible en este navegador.');
    }
  }, [stageRef, pseudo, onError]);

  return { native, pseudo, active, enter, exit, setPseudo };
}
