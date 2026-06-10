// ErrorBoundary · Iter 23 · graceful panel failure isolation.
// Wrap any panel: <ErrorBoundary><Panel/></ErrorBoundary>.

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught', error, info);
    }
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    if (this.state.error) {
      const label = this.props.label || 'this panel';
      return (
        <div role="alert" style={{
          background: '#fef2f2',
          border: '1px solid #dc2626',
          borderLeft: '4px solid #dc2626',
          borderRadius: 6,
          padding: 12,
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            <strong style={{ fontSize: 13, color: '#991b1b' }}>
              {label} failed to render
            </strong>
            <button onClick={this.reset} style={{
              marginLeft: 'auto', padding: '2px 8px', fontSize: 10,
              background: '#fff', color: '#991b1b',
              border: '1px solid #dc2626', borderRadius: 3, cursor: 'pointer',
            }}>↻ Retry</button>
          </div>
          <details style={{ fontSize: 10, color: '#7f1d1d' }}>
            <summary style={{ cursor: 'pointer' }}>Error details</summary>
            <pre style={{
              margin: '6px 0 0', padding: 6,
              background: '#fff', border: '1px solid #fecaca',
              borderRadius: 3, overflow: 'auto',
              maxHeight: 200, whiteSpace: 'pre-wrap',
            }}>
              {this.state.error?.message || String(this.state.error)}
              {this.state.info?.componentStack && (
                <>
                  {'\n\n'}
                  {this.state.info.componentStack}
                </>
              )}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
