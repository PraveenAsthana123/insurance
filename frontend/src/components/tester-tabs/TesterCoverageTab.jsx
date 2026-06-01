import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer,
} from 'recharts';
import { departmentProcesses } from '../../data/processes';
import { hashString } from '../../utils/seed';

const SUITE_ORDER = ['unit', 'integration', 'e2e', 'regression', 'smoke'];

// Deterministic percentage [min,max] from a string key.
function detPct(key, min, max) {
  const h = hashString(key);
  const frac = (h % 10_000) / 10_000;
  return Math.round((min + frac * (max - min)) * 10) / 10;
}

// Derive 6 module names from the dept's processes. Fall back to generic
// names when the dept has fewer than 6 processes catalogued.
function deriveModules(deptId) {
  const procs = departmentProcesses[deptId] || [];
  const names = procs.slice(0, 6).map((p) => p.name);
  const fallback = ['Core API', 'Scheduler', 'Data Pipeline', 'UI', 'Auth', 'Reporting'];
  while (names.length < 6) names.push(fallback[names.length]);
  return names;
}

export default function TesterCoverageTab({ dept }) {
  const deptId = dept?.id || '';
  const color = dept?.color || '#a16207';

  const moduleData = useMemo(() => {
    return deriveModules(deptId).map((name) => ({
      name,
      coverage: detPct(`${deptId}-tester-cov-mod-${name}`, 48, 95),
    }));
  }, [deptId]);

  const suiteData = useMemo(() => {
    return SUITE_ORDER.map((suite) => ({
      name: suite,
      coverage: detPct(`${deptId}-tester-cov-suite-${suite}`, 38, 96),
    }));
  }, [deptId]);

  const avgModule = Math.round(
    moduleData.reduce((s, r) => s + r.coverage, 0) / moduleData.length * 10,
  ) / 10;
  const avgSuite = Math.round(
    suiteData.reduce((s, r) => s + r.coverage, 0) / suiteData.length * 10,
  ) / 10;
  const totalCases = hashString(`${deptId}-tester-cov-cases`) % 900 + 480;
  const automatedCases = Math.round(totalCases * (avgSuite / 100));

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        Regression coverage by module and automation coverage by suite for
        {' '}<strong style={{ color: '#0f172a' }}>{dept?.name || deptId}</strong>.
        Higher is better — target &gt; 75%.
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 16, marginBottom: 16,
      }}>
        <ChartCard title="Regression coverage per module" color={color} data={moduleData} />
        <ChartCard title="Automation coverage per suite type" color={color} data={suiteData} />
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
      }}>
        <StatTile label="Avg module coverage" value={`${avgModule}%`} />
        <StatTile label="Avg suite coverage"  value={`${avgSuite}%`} />
        <StatTile label="Total test cases"    value={totalCases.toLocaleString()} />
        <StatTile label="Automated"           value={`${automatedCases.toLocaleString()} (${avgSuite}%)`} />
      </div>
    </div>
  );
}

function ChartCard({ title, color, data }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', padding: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 20, left: 40, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#0f172a' }}
              width={110}
            />
            <Tooltip
              formatter={(v) => `${v}%`}
              contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
            />
            <Bar dataKey="coverage" isAnimationActive={false}>
              {data.map((row, i) => {
                // Color-code by threshold: red < 60, amber 60-74, green >= 75
                const v = row.coverage;
                let fill;
                if (v >= 75) fill = '#059669';
                else if (v >= 60) fill = '#a16207';
                else fill = '#dc2626';
                return <Cell key={`cell-${i}`} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
        Color: <span style={{ color: '#059669', fontWeight: 600 }}>≥75% on target</span>
        {' · '}<span style={{ color: '#a16207', fontWeight: 600 }}>60–74% watch</span>
        {' · '}<span style={{ color: '#dc2626', fontWeight: 600 }}>&lt;60% at risk</span>
      </div>
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', padding: 12 }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: 0.2 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
