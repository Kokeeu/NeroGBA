// Toast notifications as reusable stateful logic (custom hook).
// Best practice (react.dev): extract stateful logic from the container so
// App.jsx stays a thin orchestrator and the policy (max 3, info auto-dismiss,
// error sticky) is testable in one place.
import { useCallback, useEffect, useRef, useState } from 'react';

const NOTICE_MS = 4500;
const MAX_VISIBLE = 3;

/**
 * @typedef {{ id: number, kind: 'info' | 'error', text: string }} Toast
 * @returns {{
 *   toasts: Toast[],
 *   pushToast: (kind: 'info' | 'error', text: string) => number,
 *   toastInfo: (text: string) => number,
 *   toastError: (text: string) => number,
 *   dismissToast: (id: number) => void,
 *   clearToasts: () => void,
 * }}
 */
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);
  const timers = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
    setToasts([]);
  }, []);

  const pushToast = useCallback(
    (kind, text) => {
      const id = ++toastId.current;
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, kind, text }]);
      if (kind !== 'error') {
        const timer = setTimeout(() => dismissToast(id), NOTICE_MS);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismissToast],
  );

  const toastInfo = useCallback((text) => pushToast('info', text), [pushToast]);
  const toastError = useCallback((text) => pushToast('error', text), [pushToast]);

  // Cleanup pending timers on unmount (avoids setState-after-unmount warnings).
  useEffect(
    () => () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    },
    [],
  );

  return { toasts, pushToast, toastInfo, toastError, dismissToast, clearToasts };
}
