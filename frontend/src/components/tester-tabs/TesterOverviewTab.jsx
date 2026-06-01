import { useMemo } from 'react';
import { hashString } from '../../utils/seed';

// Deterministic float in [min, max] with given decimals.
function detFloat(key, min, max, decimals = 1) {
  const h = hashString(key);
  const frac = (h % 10_000) / 10_000;
  const v = min + frac * (max - min);
  const p = 10 ** decimals;
  return Math.round(v * p) / p;
}

function detInt(key, min, max) {
  const h = hashString(key);
  return min + (h % (max - min + 1));
}

// KPI badge tone: red / amber / green based on a value and its thresholds.
// `higherIsBetter=true` → value >= goodAt is green.
// `higherIsBetter=false` → value <= goodAt is green.
function badgeTone(value, { goodAt, warnAt, higherIsBetter }) {
  if (higherIsBetter) {
    if (value >= goodAt) return 'good';
    if (value >= warnAt) return 'warn';
    return 'bad';
  }
  if (value <= goodAt) return 'good';
  if (value <= warnAt) return 'warn';
  return 'bad';
}

const TONE_STYLES = {
  good: { bg: 'rgba(16,185,129,0.12)', fg: '#059669', label: 'on target' },
  warn: { bg: 'rgba(234,179,8,0.14)',  fg: '#a16207', label: 'watch' },
  bad:  { bg: 'rgba(220,38,38,0.12)',  fg: '#dc2626', label: 'at risk' },
};

export default function TesterOverviewTab({ dept }) {
  const deptId = dept?.id || '';

  const kpis = useMemo(() => {
    const escape = detFloat(`${deptId}-tester-escape`, 0.4, 4.8, 2);
    const automation = detFloat(`${deptId}-tester-automation`, 42, 92, 1);
    const mttd = detFloat(`${deptId}-tester-mttd`, 1.1, 18.4, 1);
    const runs30d = detInt(`${deptId}-tester-runs30d`, 420, 3600);
    const activeDefects = detInt(`${deptId}-tester-active-defects`, 3, 48);
    const smokePass = detFloat(`${deptId}-tester-smoke-pass`, 82, 99.6, 1);

    return [
      {
        id: 'escape',
        label: 'Defect Escape Rate',
        value: `${escape}%`,
        hint: 'Defects found in prod per 100 releases',
        tone: badgeTone(escape, { goodAt: 1.5, warnAt: 3.0, higherIsBetter: false }),
      },
      {
        id: 'automation',
        label: 'Test Automation Coverage',
        value: `${automation}%`,
        hint: 'Automated vs. total test cases',
        tone: badgeTone(automation, { goodAt: 75, warnAt: 55, higherIsBetter: true }),
      },
      {
        id: 'mttd',
        label: 'Mean Time to Detect Regression',
        value: `${mttd} h`,
        hint: 'Avg hours from code merge to failing test',
        tone: badgeTone(mttd, { goodAt: 4, warnAt: 10, higherIsBetter: false }),
      },
      {
        id: 'runs30d',
        label: 'Total Test Runs (30d)',
        value: `${runs30d.toLocaleString()}`,
        hint: 'All suites — unit / integration / e2e / regression / smoke',
        tone: badgeTone(runs30d, { goodAt: 1000, warnAt: 500, higherIsBetter: true }),
      },
      {
        id: 'active-defects',
        label: 'Active Defects',
        value: `${activeDefects}`,
        hint: 'Open + triaged + in-progress',
        tone: badgeTone(activeDefects, { goodAt: 10, warnAt: 25, higherIsBetter: false }),
      },
      {
        id: 'smoke-pass',
        label: 'Release Smoke Pass Rate',
        value: `${smokePass}%`,
        hint: 'Release-candidate smoke suite, trailing 10 releases',
        tone: badgeTone(smokePass, { goodAt: 97, warnAt: 92, higherIsBetter: true }),
      },
    ];
  }, [deptId]);

  const color = dept?.color || '#a16207';

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        Tester health view for <strong style={{ color: '#0f172a' }}>{dept?.name || deptId}</strong>.
        All six indicators are derived from the last 30 days of automation + manual runs.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        {kpis.map((k) => {
          const tone = TONE_STYLES[k.tone];
          return (
            <div
              key={k.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 14,
                background: '#fff',
                borderTop: `3px solid ${color}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: '#64748b',
                    fontWeight: 600,
                    letterSpacing: 0.2,
                  }}
                >
                  {k.label}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: tone.bg,
                    color: tone.fg,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                  }}
                >
                  {tone.label}
                </span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                {k.value}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{k.hint}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
