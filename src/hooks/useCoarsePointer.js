// Coarse-pointer detection: true on phones/tablets (touch), false on desktop.
// Single place to keep JS gating in sync with CSS `@media (pointer: coarse)`.
// Used to show the ☰ mobile menu outside fullscreen and hide side docks.
import { useEffect, useState } from 'react';

/**
 * @returns {boolean} true while the primary pointer is coarse (touch)
 */
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(pointer: coarse)');
    const onChange = (e) => setCoarse(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return coarse;
}
