import { useEffect, useState } from 'react';
import { clearTraceEvents, getTraceEvents, isDebugEnabled, setDebugEnabled } from '../../services/trace';

function formatMs(value) {
  return typeof value === 'number' ? `${Math.round(value)}ms` : '-';
}

export default function DebugPanel() {
  const [enabled, setEnabled] = useState(isDebugEnabled());
  const [events, setEvents] = useState(() => getTraceEvents().slice(0, 12));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      setEnabled(isDebugEnabled());
      setEvents(getTraceEvents().slice(0, 12));
    };
    window.addEventListener('insur:trace', sync);
    window.addEventListener('insur:trace-clear', sync);
    window.addEventListener('insur:debug-change', sync);
    return () => {
      window.removeEventListener('insur:trace', sync);
      window.removeEventListener('insur:trace-clear', sync);
      window.removeEventListener('insur:debug-change', sync);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className={`debug-panel${open ? ' debug-panel-open' : ''}`}>
      <button className="debug-panel-toggle" type="button" onClick={() => setOpen((value) => !value)}>
        F12 Trace
      </button>
      {open && (
        <div className="debug-panel-body">
          <div className="debug-panel-header">
            <strong>Frontend Trace</strong>
            <div className="debug-panel-actions">
              <button type="button" onClick={() => clearTraceEvents()}>Clear</button>
              <button type="button" onClick={() => setDebugEnabled(false)}>Off</button>
            </div>
          </div>
          <div className="debug-panel-list">
            {events.length === 0 ? (
              <div className="debug-panel-empty">No trace events yet.</div>
            ) : events.map((event) => (
              <div className="debug-panel-row" key={event.id}>
                <div className="debug-panel-row-main">
                  <span className={`debug-method debug-method-${String(event.method || event.type).toLowerCase()}`}>{event.method || event.type}</span>
                  <span className="debug-path">{event.path || event.route}</span>
                </div>
                <div className="debug-panel-row-meta">
                  <span>{event.status || event.outcome || 'event'}</span>
                  <span>{formatMs(event.durationMs)}</span>
                  <span>{event.traceId || event.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
