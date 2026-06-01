const TRACE_KEY = 'insur.trace.events';
const DEBUG_KEY = 'insur.debug';
const MAX_EVENTS = 100;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function safeRead(key, fallback = null) {
  if (!canUseStorage()) return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore private-mode/quota failures */
  }
}

function readEvents() {
  const raw = safeRead(TRACE_KEY, '[]');
  try {
    const events = JSON.parse(raw);
    return Array.isArray(events) ? events : [];
  } catch {
    return [];
  }
}

function writeEvents(events) {
  safeWrite(TRACE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
}

export function isDebugEnabled() {
  return import.meta.env.VITE_ENABLE_DEBUG === 'true' || safeRead(DEBUG_KEY) === 'true';
}

export function setDebugEnabled(enabled) {
  safeWrite(DEBUG_KEY, enabled ? 'true' : 'false');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('insur:debug-change', { detail: { enabled } }));
  }
}

export function createTraceId(prefix = 'ui') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function recordTrace(event) {
  const normalized = {
    id: event.id || createTraceId('evt'),
    type: event.type || 'event',
    at: event.at || new Date().toISOString(),
    route: typeof window !== 'undefined' ? window.location.pathname : '',
    ...event,
  };

  const events = [normalized, ...readEvents()].slice(0, MAX_EVENTS);
  writeEvents(events);

  if (typeof window !== 'undefined') {
    window.__BEV_TRACE__ = events;
    window.dispatchEvent(new CustomEvent('insur:trace', { detail: normalized }));
  }

  if (isDebugEnabled() && typeof console !== 'undefined') {
    const label = `[BEV trace] ${normalized.type}`;
    console.groupCollapsed(label);
    console.info(normalized);
    console.groupEnd();
  }

  return normalized;
}

export function getTraceEvents() {
  return readEvents();
}

export function clearTraceEvents() {
  writeEvents([]);
  if (typeof window !== 'undefined') {
    window.__BEV_TRACE__ = [];
    window.dispatchEvent(new CustomEvent('insur:trace-clear'));
  }
}

export function installDebugGlobals() {
  if (typeof window === 'undefined') return;
  window.__BEV_DEBUG__ = {
    enable: () => setDebugEnabled(true),
    disable: () => setDebugEnabled(false),
    events: getTraceEvents,
    clear: clearTraceEvents,
  };
}
