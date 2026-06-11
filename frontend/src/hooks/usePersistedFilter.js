// usePersistedFilter.js · Iter 65 · §102.3.6 (filter state from localStorage)

import { useState, useEffect, useCallback } from 'react';

export function usePersistedFilter(key, initial = {}) {
  const storageKey = `filter:${key}`;
  const [filter, setFilter] = useState(() => {
    try {
      const s = localStorage.getItem(storageKey);
      return s ? JSON.parse(s) : initial;
    } catch (_) {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filter));
    } catch (_) {}
  }, [storageKey, filter]);

  const reset = useCallback(() => {
    setFilter(initial);
    localStorage.removeItem(storageKey);
  }, [initial, storageKey]);

  return [filter, setFilter, reset];
}
