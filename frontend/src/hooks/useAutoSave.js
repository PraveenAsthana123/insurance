// useAutoSave.js · Iter 64 · §102.1 (form state auto-save)
// Saves draft to localStorage + POST /api/v1/drafts every N ms.

import { useEffect, useRef } from 'react';

const API = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8001';

export function useAutoSave(key, value, options = {}) {
  const {
    debounceMs = 1000,
    remoteEndpoint = `${API}/api/v1/drafts/${encodeURIComponent(key)}`,
    onSave,
  } = options;
  const timerRef = useRef(null);
  const lastSavedRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const serialized = JSON.stringify(value);
        if (serialized === lastSavedRef.current) return;
        // local-first
        localStorage.setItem(`draft:${key}`, serialized);
        lastSavedRef.current = serialized;
        // remote best-effort
        try {
          await fetch(remoteEndpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: serialized,
          });
        } catch (_) { /* network fail · local is enough */ }
        if (onSave) onSave({ key, value, ts: new Date().toISOString() });
      } catch (err) {
        console.warn('useAutoSave error:', err);
      }
    }, debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [key, value, debounceMs, remoteEndpoint, onSave]);
}

export function loadDraft(key) {
  try {
    const s = localStorage.getItem(`draft:${key}`);
    return s ? JSON.parse(s) : null;
  } catch (_) { return null; }
}

export function clearDraft(key) {
  localStorage.removeItem(`draft:${key}`);
}
