// §F16 · SSE Event Stream · operator 2026-06-12.
import React, { useEffect, useRef, useState } from 'react';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  || 'http://localhost:8001';

export default function SseStreamPage() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('disconnected');
  const [endpoint, setEndpoint] = useState('/api/v1/sse');
  const esRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (esRef.current) esRef.current.close();
    };
  }, []);

  const connect = () => {
    if (esRef.current) esRef.current.close();
    setEvents([]);
    setStatus('connecting');
    const es = new EventSource(`${API}${endpoint}`);
    esRef.current = es;
    es.onopen = () => setStatus('connected');
    es.onerror = () => setStatus('error');
    es.onmessage = (e) => {
      setEvents(prev => {
        const next = [...prev, {
          id: Date.now() + Math.random(),
          ts: new Date().toLocaleTimeString('en-CA', { timeZone: 'America/Edmonton' }),
          data: e.data,
          type: e.type,
        }];
        return next.slice(-100);
      });
    };
  };

  const disconnect = () => {
    if (esRef.current) esRef.current.close();
    setStatus('disconnected');
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto', fontSize: 13, color: '#1f2937' }}>
      <h1 className="h-glass">📡 SSE Event Stream</h1>
      <div className="subtle" style={{ marginBottom: 14 }}>
        §F16 · live server-sent events stream from any endpoint
      </div>

      <PageHeaderFlow active="output" />

      <PageObjective
        objective="Tail any SSE endpoint live · debug agent invocations · trace events · without console open."
        storageKey="sse-stream"
        todos={[
          { id: 's1', label: 'Connect to /api/v1/sse' },
          { id: 's2', label: 'Last 100 events visible' },
          { id: 's3', label: 'Custom endpoint picker' },
          { id: 's4', label: 'Filter by event type (next iter)' },
        ]}
      />

      <div className="glass-card card-process" style={{ marginBottom: 12 }}>
        <strong>⚙️ Connection</strong>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={endpoint} onChange={e => setEndpoint(e.target.value)}
                 placeholder="/api/v1/sse"
                 className="btn-glass"
                 style={{ background: '#fff', flex: 1 }} />
          {status !== 'connected' ? (
            <button onClick={connect} className="btn-glass btn-glass-primary">Connect</button>
          ) : (
            <button onClick={disconnect} className="btn-glass btn-glass-danger">Disconnect</button>
          )}
          <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4,
                          background: status === 'connected' ? '#ecfdf5' :
                                      status === 'error' ? '#fef2f2' : '#f1f5f9',
                          color: status === 'connected' ? '#065f46' :
                                 status === 'error' ? '#991b1b' : '#475569' }}>
            {status}
          </span>
        </div>
      </div>

      <div ref={containerRef} className="glass-card glass-strong"
           style={{ height: 480, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
        {events.length === 0 && (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: 30 }}>
            No events yet · click Connect to start
          </div>
        )}
        {events.map(ev => (
          <div key={ev.id} style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: '#94a3b8' }}>{ev.ts}</span>{' '}
            <span style={{ color: '#a855f7' }}>[{ev.type}]</span>{' '}
            <span style={{ color: '#1f2937' }}>{ev.data}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
