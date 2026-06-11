// useFrontendAudit.js · Iter 66 · §102.11 (10 mandatory audit events)

import { useEffect } from 'react';

const API = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8001';

async function audit(event, payload = {}) {
  try {
    await fetch(`${API}/api/v1/frontend-audit/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        session_id: sessionStorage.getItem('vitals-session') || 'unknown',
        url: window.location.pathname,
        user_agent: navigator.userAgent,
        payload,
        ts: new Date().toISOString(),
      }),
    });
  } catch (_) { /* swallow */ }
}

export const auditLogin = (userId) => audit('LOGIN', { user_id: userId });
export const auditLogout = (userId) => audit('LOGOUT', { user_id: userId });
export const auditRefresh = () => audit('REFRESH');
export const auditPromptSubmit = (data) => audit('PROMPT_SUBMIT', data);
export const auditFileUpload = (data) => audit('FILE_UPLOAD', data);
export const auditApproval = (data) => audit('APPROVAL', data);
export const auditReject = (data) => audit('REJECT', data);
export const auditExport = (data) => audit('EXPORT', data);
export const auditDownload = (data) => audit('DOWNLOAD', data);
export const auditError = (data) => audit('ERROR', data);

let bootedRefresh = false;
export function useAuditBoot() {
  useEffect(() => {
    if (bootedRefresh) return;
    bootedRefresh = true;
    // Log refresh exactly once per session-page-load
    auditRefresh();
    // Logout helper · attach to beforeunload
    const onBeforeUnload = () => {
      try {
        navigator.sendBeacon &&
          navigator.sendBeacon(`${API}/api/v1/frontend-audit/log`,
            JSON.stringify({
              event: 'UNLOAD',
              session_id: sessionStorage.getItem('vitals-session') || 'unknown',
              url: window.location.pathname,
              ts: new Date().toISOString(),
            }));
      } catch (_) {}
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);
}
