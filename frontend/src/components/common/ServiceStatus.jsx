import { useEffect, useState } from 'react';
import StatusPill from './StatusPill';
import { apiFetch } from '../../services/apiFetch';

export default function ServiceStatus() {
  const [state, setState] = useState({ status: 'unknown', latencyMs: null });

  useEffect(() => {
    let cancelled = false;
    async function probe() {
      const started = performance.now();
      try {
        await apiFetch('/api/v1/health', { timeoutMs: 5000, traceLabel: 'service-health' });
        if (!cancelled) setState({ status: 'online', latencyMs: Math.round(performance.now() - started) });
      } catch (error) {
        if (!cancelled) setState({ status: error.status >= 500 ? 'degraded' : 'offline', latencyMs: null });
      }
    }
    probe();
    const interval = window.setInterval(probe, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const title = state.latencyMs == null ? 'Backend health unavailable' : `Backend healthy in ${state.latencyMs}ms`;
  return <StatusPill status={state.status} label={state.status === 'online' ? 'API Live' : 'API Issue'} title={title} />;
}
