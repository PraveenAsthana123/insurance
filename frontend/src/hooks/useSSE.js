// useSSE.js · Iter 66 · §102.8.2 (SSE alternative to WebSocket)

import { useEffect, useRef, useState } from 'react';

const API = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8001';

export function useSSE(url, onEvent) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const sourceRef = useRef(null);
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `${API}${url}`;
    const es = new EventSource(fullUrl);
    sourceRef.current = es;
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setLastEvent(data);
        cbRef.current?.(data);
      } catch (_) {}
    };
    es.addEventListener('status', (e) => {
      const data = JSON.parse(e.data);
      setLastEvent(data);
      cbRef.current?.(data);
    });
    es.addEventListener('end', () => {
      setConnected(false);
      es.close();
    });
    es.onerror = () => {
      setConnected(false);
    };
    return () => {
      es.close();
      sourceRef.current = null;
    };
  }, [url]);

  return { connected, lastEvent };
}
