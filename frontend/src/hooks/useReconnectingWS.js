// useReconnectingWS.js · Iter 72 · §102.12.7 (WebSocket disconnect recovery)

import { useEffect, useRef, useState } from 'react';

const API_HOST = (() => {
  try {
    const u = new URL(import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8001');
    return u.host;
  } catch (_) {
    return 'localhost:8001';
  }
})();

export function useReconnectingWS(path, onMessage) {
  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const [state, setState] = useState('connecting');

  useEffect(() => {
    if (!path) return;
    let alive = true;

    function connect() {
      const url = path.startsWith('ws')
        ? path
        : `ws://${API_HOST}${path}`;
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => {
          if (!alive) return;
          retryRef.current = 0;
          setState('connected');
        };
        ws.onmessage = (e) => {
          try { onMessage?.(JSON.parse(e.data)); }
          catch (_) { onMessage?.(e.data); }
        };
        ws.onclose = () => {
          if (!alive) return;
          setState('disconnected');
          retryRef.current += 1;
          const delay = Math.min(30000, 1000 * Math.pow(2, retryRef.current));
          setTimeout(connect, delay);
        };
        ws.onerror = () => setState('error');
      } catch (_) {
        setState('error');
        setTimeout(connect, 5000);
      }
    }
    connect();

    return () => {
      alive = false;
      try { wsRef.current?.close(); } catch (_) {}
    };
  }, [path, onMessage]);

  return { state, send: (msg) => wsRef.current?.send(JSON.stringify(msg)) };
}
