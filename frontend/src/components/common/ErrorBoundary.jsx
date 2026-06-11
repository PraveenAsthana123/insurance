// ErrorBoundary.jsx · Iter 65 · §102.7 (component error capture)
// React error boundary + global handlers · posts to /api/v1/frontend-telemetry.

import React from 'react';

const API = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8001';

function reportError(error, info = {}) {
  try {
    fetch(`${API}/api/v1/frontend-telemetry/vital`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionStorage.getItem('vitals-session') || 'unknown',
        metric: 'COMPONENT_ERROR',
        value: 1,
        url: window.location.pathname,
        user_agent: navigator.userAgent,
        event_payload: {
          message: error?.message || String(error),
          stack: (error?.stack || '').slice(0, 1000),
          component_stack: info?.componentStack?.slice(0, 1000),
        },
      }),
    });
  } catch (_) { /* swallow */ }
}

// Global window handlers · catches uncaught errors outside React tree
let bootedHandlers = false;
export function installGlobalErrorHandlers() {
  if (bootedHandlers) return;
  bootedHandlers = true;
  window.addEventListener('error', (e) => reportError(e.error || e.message));
  window.addEventListener('unhandledrejection', (e) =>
    reportError(e.reason || 'unhandled rejection'));
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    reportError(error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 20, margin: 20, background: '#fee2e2',
          border: '1px solid #ef4444', borderRadius: 4,
        }}>
          <h3 style={{ color: '#991b1b', marginTop: 0 }}>⚠ Something went wrong</h3>
          <div style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 12 }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
          <button onClick={this.reset}
            style={{
              padding: '6px 14px', fontSize: 11, cursor: 'pointer',
              background: '#10b981', color: '#fff', border: 'none', borderRadius: 3,
            }}>
            Try Again
          </button>
          <button onClick={() => window.location.reload()}
            style={{
              padding: '6px 14px', fontSize: 11, cursor: 'pointer',
              background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 3,
              marginLeft: 6,
            }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
