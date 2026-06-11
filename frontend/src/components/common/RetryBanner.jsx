// RetryBanner.jsx · Iter 65 · §102.6.4 ('Retrying...' during backoff)

import React from 'react';

export function RetryBanner({ attempt = 1, maxAttempts = 3, nextDelayMs = 1000 }) {
  return (
    <div style={{
      padding: 10, background: '#fef3c7', border: '1px solid #f59e0b',
      borderRadius: 4, marginBottom: 8, display: 'flex',
      alignItems: 'center', gap: 8, fontSize: 11,
    }}>
      <span style={{
        display: 'inline-block', width: 12, height: 12,
        border: '2px solid #f59e0b', borderTopColor: 'transparent',
        borderRadius: '50%', animation: 'spin 1s linear infinite',
      }} />
      <strong style={{ color: '#a16207' }}>Retrying...</strong>
      <span style={{ color: '#92400e' }}>
        attempt {attempt}/{maxAttempts} · next in {Math.round(nextDelayMs / 1000)}s
      </span>
    </div>
  );
}

export function ApiErrorRetry({ error, onRetry, attempts = 0 }) {
  return (
    <div style={{
      padding: 10, background: '#fee2e2', border: '1px solid #ef4444',
      borderRadius: 4, marginBottom: 8, fontSize: 11,
    }}>
      <div style={{ color: '#991b1b', fontWeight: 700, marginBottom: 6 }}>
        Request failed{attempts > 0 ? ` (${attempts} attempts)` : ''}
      </div>
      <div style={{ color: '#7f1d1d', marginBottom: 6 }}>
        {error?.message || String(error)}
      </div>
      <button onClick={onRetry}
        style={{
          padding: '4px 10px', fontSize: 10, cursor: 'pointer',
          background: '#10b981', color: '#fff', border: 'none', borderRadius: 3,
        }}>
        Try Again
      </button>
    </div>
  );
}
