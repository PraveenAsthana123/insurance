// useMemoryMonitor.js · Iter 72 · §102.12.11 (memory leak detector)

import { useEffect, useState } from 'react';

const API = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8001';

function report(value, extra = {}) {
  try {
    fetch(`${API}/api/v1/frontend-telemetry/vital`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionStorage.getItem('vitals-session') || 'unknown',
        metric: 'MEMORY_HEAP',
        value,
        url: window.location.pathname,
        user_agent: navigator.userAgent,
        event_payload: extra,
      }),
    });
  } catch (_) { /* swallow */ }
}

export function useMemoryMonitor({ intervalMs = 60000, warnThresholdMb = 200 } = {}) {
  const [heap, setHeap] = useState(null);
  const [warning, setWarning] = useState(false);
  useEffect(() => {
    if (!performance.memory) return; // Chromium only
    let baseline = null;
    const tick = setInterval(() => {
      const usedMb = performance.memory.usedJSHeapSize / (1024 * 1024);
      setHeap(usedMb);
      if (baseline === null) baseline = usedMb;
      const growth = usedMb - baseline;
      if (growth > warnThresholdMb) {
        setWarning(true);
        report(usedMb, { growth, baseline });
      } else {
        setWarning(false);
      }
    }, intervalMs);
    return () => clearInterval(tick);
  }, [intervalMs, warnThresholdMb]);
  return { heap, warning };
}
