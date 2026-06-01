import StatusPill from './StatusPill';

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatAge(ms) {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function FreshnessBadge({
  updatedAt,
  fetchedAt,
  source = 'Unknown source',
  staleAfterMinutes = 15,
  status,
  compact = false,
}) {
  const reference = toDate(updatedAt) || toDate(fetchedAt);
  const ageMs = reference ? Date.now() - reference.getTime() : null;
  const computed = status || (!reference ? 'unknown' : ageMs > staleAfterMinutes * 60000 ? 'stale' : 'fresh');
  const age = ageMs == null ? 'unknown' : formatAge(ageMs);
  const label = computed === 'fresh' ? `Fresh ${age}` : computed === 'stale' ? `Stale ${age}` : 'Freshness unknown';

  return (
    <span className="ui-freshness" title={`Source: ${source}. Last update: ${reference ? reference.toISOString() : 'unknown'}.`}>
      <StatusPill status={computed} label={compact ? computed : label} compact={compact} />
      {!compact && <span className="ui-freshness-source">{source}</span>}
    </span>
  );
}
