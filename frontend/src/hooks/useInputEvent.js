// useInputEvent — React hook to capture user inputs per GLOBAL_INPUT_PERSISTENCE_POLICY.
//
// Sends POST /api/v1/input-events through backend (NEVER browser→DB direct · rule 1).
// Non-blocking: persistence failures don't break the UI (rule 9 · low-risk soft-fail).
// Browser does NOT compute tenant/actor — backend stamps from middleware/headers.

import { useCallback } from 'react';

const API_BASE = (typeof window !== 'undefined' && window.import?.meta?.env?.VITE_API_BASE_URL)
  || (import.meta?.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

const DEFAULT_ROLE_KEY = 'insur.role';
const SESSION_KEY = 'insur.session_id';

function getOrCreateSessionId() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = (crypto?.randomUUID?.() || `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return null;
  }
}

function getRole() {
  if (typeof localStorage === 'undefined') return 'manager';
  try { return localStorage.getItem(DEFAULT_ROLE_KEY) || 'manager'; } catch { return 'manager'; }
}

/**
 * useInputEvent — returns a captureInput() function that POSTs to /api/v1/input-events.
 *
 * Usage:
 *   const captureInput = useInputEvent({
 *     source_surface: 'insurance-process-tab',
 *     route_path: '/insurance/:deptId/:domain/:processId',
 *     component_id: 'SimulationTab',
 *     department_id: dept?.id,
 *     process_id: proc?.id,
 *   });
 *
 *   onChange(value) {
 *     captureInput({
 *       input_kind: 'simulation',
 *       input_name: 'monthly_cases',
 *       payload: { value, scenario: currentScenario },
 *     });
 *   }
 */
export function useInputEvent(staticContext = {}) {
  const captureInput = useCallback(async (event) => {
    if (!event || !event.input_kind) {
      // No-op if caller didn't provide minimum
      return null;
    }

    const body = {
      source_surface: event.source_surface || staticContext.source_surface || 'unknown',
      route_path: event.route_path || staticContext.route_path || (typeof window !== 'undefined' ? window.location.pathname : null),
      component_id: event.component_id || staticContext.component_id,
      department_id: event.department_id || staticContext.department_id,
      process_id: event.process_id || staticContext.process_id,
      input_kind: event.input_kind,
      input_name: event.input_name,
      payload: event.payload || {},
      pii_classification: event.pii_classification || 'low',
      retention_class: event.retention_class || 'standard',
      purpose: event.purpose,
      session_id: getOrCreateSessionId(),
      metadata: event.metadata || {},
    };

    try {
      const resp = await fetch(`${API_BASE}/api/v1/input-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Demo-Role': getRole(),
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        // 503 INPUT_PERSIST_UNAVAILABLE acceptable for low-risk · log + continue
        if (resp.status >= 500) {
          // Per rule 9: low-risk telemetry can fail open with error log
          console.warn('[useInputEvent] non-blocking persistence failure', resp.status);
        }
        return null;
      }
      return await resp.json();
    } catch (err) {
      // Network error · don't break the UI
      console.warn('[useInputEvent] network error', err?.message);
      return null;
    }
  }, [
    staticContext.source_surface,
    staticContext.route_path,
    staticContext.component_id,
    staticContext.department_id,
    staticContext.process_id,
  ]);

  return captureInput;
}

export default useInputEvent;
