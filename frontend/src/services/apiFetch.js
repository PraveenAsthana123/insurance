// apiFetch — thin fetch wrapper that attaches X-Demo-Role from localStorage.
//
// Phase η: demo-mode RBAC. The backend RBACMiddleware checks this header
// against a per-endpoint role matrix and returns 403 when the role is
// not permitted. Default role is "manager" (matches backend default).

const DEFAULT_ROLE = 'manager';
const ROLE_KEY = 'insur.role';
const ROLE_CHANGE_EVENT = 'insur:role-change';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export function getCurrentRole() {
  if (typeof localStorage === 'undefined') return DEFAULT_ROLE;
  try {
    return localStorage.getItem(ROLE_KEY) || DEFAULT_ROLE;
  } catch {
    return DEFAULT_ROLE;
  }
}

export function setCurrentRole(role) {
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch {
    /* private-mode / quota — ignore; state still dispatched */
  }
  // Notify listeners (RoleSelector + SimulationTab + any hook consumer).
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ROLE_CHANGE_EVENT, { detail: role }));
  }
}

export async function apiFetch(url, init = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Demo-Role': getCurrentRole(),
    ...(init.headers || {}),
  };
  const r = await fetch(API_BASE + url, { ...init, headers });
  if (!r.ok) {
    let detail = r.statusText;
    try {
      detail = (await r.json())?.detail || detail;
    } catch {
      /* ignore */
    }
    const err = new Error(`${r.status} ${detail}`);
    err.status = r.status;
    throw err;
  }
  // 204 No Content — no body to parse. Return null so callers don't crash
  // attempting to read response.json(). (Currently only /api/v1/ai/feedback.)
  if (r.status === 204) return null;
  return r.json();
}

export const ROLE_CHANGE_EVENT_NAME = ROLE_CHANGE_EVENT;
