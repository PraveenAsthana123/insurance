const STATUS_LABELS = {
  online: 'Online',
  offline: 'Offline',
  degraded: 'Degraded',
  unknown: 'Unknown',
  fresh: 'Fresh',
  stale: 'Stale',
  refreshing: 'Refreshing',
  failed: 'Failed',
  demo: 'Demo',
};

export default function StatusPill({ status = 'unknown', label, title, compact = false }) {
  const normalized = String(status || 'unknown').toLowerCase();
  return (
    <span
      className={`ui-status-pill ui-status-pill-${normalized}${compact ? ' ui-status-pill-compact' : ''}`}
      title={title || label || STATUS_LABELS[normalized] || normalized}
    >
      <span className="ui-status-dot" aria-hidden="true" />
      <span>{label || STATUS_LABELS[normalized] || normalized}</span>
    </span>
  );
}
