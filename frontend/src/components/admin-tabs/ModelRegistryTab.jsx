import { useMemo } from 'react';
import { getUseCasesForDept } from '../../data/aiUseCases';
import { seededRng, randInt, randFloat, pick } from '../../utils/seed';

const MODEL_CATEGORIES = new Set([
  'ML', 'NLP', 'Recommendation', 'Anomaly Detection', 'Fraud Detection', 'AI Agent',
]);

const STATUSES = ['live', 'live', 'live', 'shadow', 'deprecated'];

export default function ModelRegistryTab({ dept }) {
  const deptId = dept?.id || '';
  const models = useMemo(() => {
    const useCases = getUseCasesForDept(deptId).filter((u) => MODEL_CATEGORIES.has(u.category) || u.model);
    const rng = seededRng(`models-${deptId}`);
    return useCases.map((u, i) => {
      const majorVer = randInt(rng, 1, 4);
      const minorVer = randInt(rng, 0, 8);
      const patch = randInt(rng, 0, 12);
      const acc = randFloat(rng, 78, 96, 1);
      const driftPct = randFloat(rng, 0.5, 8, 1);
      const status = u.status === 'live' ? pick(rng, STATUSES) : (u.status || 'shadow');
      return {
        id: u.id,
        name: u.name,
        model: u.model || 'XGBoost',
        version: `${majorVer}.${minorVer}.${patch}`,
        status,
        accuracy: acc,
        drift: driftPct,
        owner: u.owner || 'manager',
        trainedDaysAgo: randInt(rng, 3, 180),
        order: i,
      };
    });
  }, [deptId]);

  if (models.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
        No ML/NLP/recommendation models catalogued for {dept?.name || 'this department'} yet.
      </div>
    );
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        <strong style={{ color: '#0f172a' }}>{models.length}</strong> registered models for
        {' '}{dept?.name || deptId}.
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 12,
      }}>
        {models.map((m) => {
          const statusColor = (
            m.status === 'live' ? { bg: 'rgba(16,185,129,0.12)', fg: '#059669' }
            : m.status === 'shadow' ? { bg: 'rgba(59,130,246,0.12)', fg: '#2563eb' }
            : m.status === 'deprecated' ? { bg: 'rgba(148,163,184,0.18)', fg: '#64748b' }
            : { bg: 'rgba(234,179,8,0.12)', fg: '#b45309' }
          );
          const driftColor = m.drift > 5 ? '#dc2626' : m.drift > 2.5 ? '#b45309' : '#059669';
          return (
            <div key={m.id} style={{
              border: '1px solid #e2e8f0', borderRadius: 8,
              padding: 14, background: '#fff',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>
                  {m.name}
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: statusColor.bg, color: statusColor.fg, whiteSpace: 'nowrap',
                }}>
                  {m.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                {m.model} · v{m.version}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12 }}>
                <div>
                  <div style={{ color: '#64748b' }}>Accuracy</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.accuracy}%</div>
                </div>
                <div>
                  <div style={{ color: '#64748b' }}>Drift</div>
                  <div style={{ fontWeight: 700, color: driftColor }}>{m.drift}%</div>
                </div>
                <div>
                  <div style={{ color: '#64748b' }}>Trained</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.trainedDaysAgo} d ago</div>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                Owner role: <strong style={{ color: '#334155' }}>{m.owner}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
