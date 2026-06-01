import { seededRng, randInt } from '../../utils/seed';

export default function SettingsTab({ dept }) {
  const deptId = dept?.id || '';
  const rng = seededRng(`settings-${deptId}`);

  const slaUptime = 99 + (rng() * 0.9).toFixed(2) * 1;
  const latencyBudget = randInt(rng, 150, 600);
  const alertEmail = randInt(rng, 3, 9);
  const alertPager = randInt(rng, 1, 4);
  const driftThreshold = (2 + rng() * 3).toFixed(1);

  const sectionStyle = {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 16,
    background: '#fff',
    marginBottom: 12,
  };

  const kvRow = (label, value, mono = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                  borderTop: '1px dashed #f1f5f9', fontSize: 13 }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{
        color: '#0f172a', fontWeight: 600,
        fontFamily: mono ? 'ui-monospace, Menlo, monospace' : 'inherit',
        fontSize: mono ? 12 : 13,
      }}>
        {value}
      </span>
    </div>
  );

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>

        <div style={sectionStyle}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>
            {dept?.icon} Department metadata
          </div>
          {kvRow('ID', dept?.id || '', true)}
          {kvRow('Name', dept?.name || '')}
          {kvRow('Route', dept?.route || '', true)}
          {kvRow('Process count', dept?.processCount ?? '—')}
          {kvRow('Kaggle dataset', dept?.kaggleDataset || '', true)}
          {kvRow('Expected ROI', dept?.roi || '—')}
        </div>

        <div style={sectionStyle}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>
            🎨 Branding
          </div>
          {kvRow('Primary color', dept?.color || '', true)}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                        borderTop: '1px dashed #f1f5f9', fontSize: 13, alignItems: 'center' }}>
            <span style={{ color: '#64748b' }}>Color swatch</span>
            <span style={{
              display: 'inline-block', width: 32, height: 20, borderRadius: 4,
              background: dept?.color || '#94a3b8', border: '1px solid #e2e8f0',
            }} />
          </div>
          {kvRow('AI types',
                 (dept?.aiTypes || []).join(', ') || '—')}
        </div>

        <div style={sectionStyle}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>
            📊 SLA thresholds
          </div>
          {kvRow('Target uptime', `${slaUptime.toFixed(2)}%`)}
          {kvRow('P95 latency budget', `${latencyBudget} ms`)}
          {kvRow('Model drift alert at', `> ${driftThreshold}%`)}
          {kvRow('Pipeline stale after', `${randInt(rng, 30, 180)} min`)}
        </div>

        <div style={sectionStyle}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>
            🔔 Alert channels
          </div>
          {kvRow('Email recipients', alertEmail)}
          {kvRow('PagerDuty services', alertPager)}
          {kvRow('Slack channel', `#cpg-${deptId}-alerts`, true)}
          {kvRow('Quiet hours (UTC)', '22:00 – 06:00', true)}
        </div>

      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
        Descriptive settings only. Editing UI ships in a later phase.
      </div>
    </div>
  );
}
