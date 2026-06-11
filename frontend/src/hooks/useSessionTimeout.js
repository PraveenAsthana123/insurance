// useSessionTimeout.js · Iter 72 · §102.12.12 (session timeout warning)

import { useEffect, useState, useRef, useCallback } from 'react';

export function useSessionTimeout({
  timeoutMs = 30 * 60 * 1000,   // 30 min default
  warningMs = 5 * 60 * 1000,    // warn 5 min before
  onTimeout,
} = {}) {
  const [warning, setWarning] = useState(false);
  const lastActivityRef = useRef(Date.now());

  const reset = useCallback(() => {
    lastActivityRef.current = Date.now();
    setWarning(false);
  }, []);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => document.addEventListener(e, reset));

    const tick = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= timeoutMs) {
        clearInterval(tick);
        onTimeout?.();
      } else if (elapsed >= timeoutMs - warningMs) {
        setWarning(true);
      }
    }, 30000); // check every 30s

    return () => {
      events.forEach(e => document.removeEventListener(e, reset));
      clearInterval(tick);
    };
  }, [timeoutMs, warningMs, onTimeout, reset]);

  return { warning, reset };
}
