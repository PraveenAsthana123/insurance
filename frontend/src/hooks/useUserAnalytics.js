// useUserAnalytics.js · Iter 65 · §102.7.4 + .7.6 (click + refresh tracking)

import { useEffect } from 'react';

const API = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8001';

function report(metric, value, payload = {}) {
  try {
    fetch(`${API}/api/v1/frontend-telemetry/vital`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionStorage.getItem('vitals-session') || 'unknown',
        metric, value,
        url: window.location.pathname,
        user_agent: navigator.userAgent,
        event_payload: payload,
      }),
    });
  } catch (_ignored) {
    void _ignored;
  }
}

let bootedClickTracker = false;
let bootedRefreshTracker = false;

export function useClickTracking() {
  useEffect(() => {
    if (bootedClickTracker) return;
    bootedClickTracker = true;
    const onClick = (e) => {
      const target = e.target;
      if (!target || !target.tagName) return;
      // Only meaningful elements
      if (!['BUTTON', 'A', 'INPUT', 'SELECT'].includes(target.tagName)) return;
      const label = (target.innerText || target.value || target.title || '').slice(0, 60);
      report('CLICK', 1, {
        tag: target.tagName, label,
        id: target.id, class: target.className,
      });
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);
}

export function useRefreshTracking() {
  useEffect(() => {
    if (bootedRefreshTracker) return;
    bootedRefreshTracker = true;
    const refreshCount = parseInt(
      sessionStorage.getItem('refresh-count') || '0', 10) + 1;
    sessionStorage.setItem('refresh-count', String(refreshCount));
    report('REFRESH', refreshCount, {
      session_id: sessionStorage.getItem('vitals-session'),
      previous_url: document.referrer,
    });
  }, []);
}
