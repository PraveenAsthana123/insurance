// useWebVitals.js · Iter 64 · §102.7 (frontend monitoring)
// Captures LCP · FID · CLS · TTFB · INP · POSTs to backend telemetry.

import { useEffect } from 'react';

const API = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8001';
const SESSION_ID = (() => {
  let s = sessionStorage.getItem('vitals-session');
  if (!s) {
    s = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem('vitals-session', s);
  }
  return s;
})();

function report(metric, value, extra = {}) {
  // best-effort fire-and-forget
  try {
    fetch(`${API}/api/v1/frontend-telemetry/vital`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: SESSION_ID,
        metric,
        value: Number.isFinite(value) ? value : null,
        url: window.location.pathname,
        user_agent: navigator.userAgent,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        ...extra,
      }),
    });
  } catch (_) { /* swallow */ }
}

function pageLoadObservers() {
  try {
    // LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      report('LCP', last.renderTime || last.loadTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // CLS
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) clsValue += entry.value;
      }
      report('CLS', clsValue);
    }).observe({ type: 'layout-shift', buffered: true });

    // FID (first input)
    new PerformanceObserver((list) => {
      const first = list.getEntries()[0];
      if (first) report('FID', first.processingStart - first.startTime);
    }).observe({ type: 'first-input', buffered: true });

    // Navigation timing
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
      report('TTFB', nav.responseStart - nav.requestStart);
      report('DCL', nav.domContentLoadedEventEnd);
    }
  } catch (e) {
    console.warn('PerformanceObserver not supported · skipping:', e?.message);
  }
}

let bootedOnce = false;

export function useWebVitals() {
  useEffect(() => {
    if (bootedOnce) return;
    bootedOnce = true;
    pageLoadObservers();
  }, []);
}

export function reportEvent(name, payload = {}) {
  report(name, null, { event_payload: payload });
}
