import { useState, useMemo, useEffect } from 'react';
import {
  departments,
  aiCapabilityById,
  stakeholderByRole,
  totals,
  channelMixByDept,
} from '../data/insuranceCatalog';
import { brand } from '../config/brand';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';

const FORMAT_ICON = {
  csv: '📊', json: '🧬', xml: '🗂', txt: '📄',
  docx: '📝', pdf: '📕', png: '🖼', wav: '🔊', mp4: '🎬',
};
const CHANNEL_COLOR = { B2B: '#0891b2', B2C: '#dc2626', B2E: '#7c3aed' };

function ChannelChip({ kind }) {
  return (
    <span
      style={{
        background: CHANNEL_COLOR[kind] + '22',
        color: CHANNEL_COLOR[kind],
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        border: `1px solid ${CHANNEL_COLOR[kind]}55`,
      }}
    >
      {kind}
    </span>
  );
}

function StakeholderChip({ entry }) {
  const reg = stakeholderByRole[entry.role];
  if (!reg) return <span style={{ color: '#b91c1c', fontSize: 11 }}>?{entry.role}</span>;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        background: 'rgba(15,23,42,0.05)',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
      }}
      title={`${reg.defaultResponsibility}  (${entry.verb})`}
    >
      <span>{reg.icon}</span>
      <span>{reg.displayName}</span>
      <span style={{ color: CHANNEL_COLOR[reg.side], fontWeight: 700 }}>{reg.side}</span>
    </span>
  );
}

function AICapabilityChip({ capId }) {
  const cap = aiCapabilityById[capId];
  if (!cap) return <span style={{ color: '#b91c1c', fontSize: 11 }}>?{capId}</span>;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        background: '#1e293b',
        color: '#e2e8f0',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
      }}
      title={`${cap.family} · ${cap.description}`}
    >
      <span>{cap.icon}</span>
      <span>{cap.name}</span>
    </span>
  );
}

function DownloadMenu({ samples }) {
  if (!samples?.length) return null;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {samples.map((s) => (
        <a
          key={s.format + s.filename}
          href={'/insurance-data/' + s.path.replace(/^data\/insurance\//, '')}
          download={s.filename}
          title={`Download ${s.filename} (${s.sizeBytes} bytes)`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            background: '#0f172a',
            color: '#f1f5f9',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <span aria-hidden="true">{FORMAT_ICON[s.format] || '📦'}</span>
          <span>{s.format.toUpperCase()}</span>
        </a>
      ))}
    </div>
  );
}

function ProcessRow({ p }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, background: '#fff' }}>
      <div
        style={{ padding: 12, cursor: 'pointer' }}
        onClick={() => setOpen((x) => !x)}
        role="button"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', flex: 1 }}>
            {open ? '▾' : '▸'} {p.name}
          </span>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            {p.subProcesses?.length || 0} sub · {p.aiCapabilities?.length || 0} AI · {p.dataSamples?.length || 0} files
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>{p.description}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          {(p.channels || []).map((c) => <ChannelChip key={c} kind={c} />)}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {(p.stakeholders || []).map((s) => <StakeholderChip key={s.role} entry={s} />)}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {(p.aiCapabilities || []).map((c) => <AICapabilityChip key={c} capId={c} />)}
        </div>
        <DownloadMenu samples={p.dataSamples} />
      </div>

      {open && p.subProcesses?.length > 0 && (
        <div style={{ background: '#f8fafc', padding: 12, borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            SUB-PROCESSES
          </div>
          {p.subProcesses.map((s) => (
            <div key={s.id} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: '2px solid #cbd5e1' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{s.name}</div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>{s.description}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                {(s.channels || []).map((c) => <ChannelChip key={c} kind={c} />)}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                {(s.stakeholders || []).map((sk) => <StakeholderChip key={sk.role} entry={sk} />)}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(s.aiCapabilities || []).map((c) => <AICapabilityChip key={c} capId={c} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreboardCard({ label, value, accent }) {
  return (
    <div style={{
      flex: '1 1 160px',
      background: '#fff',
      borderRadius: 8,
      padding: 14,
      border: '1px solid #e2e8f0',
      borderTop: `3px solid ${accent}`,
    }}>
      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{value}</div>
    </div>
  );
}

function ChannelMixDonut() {
  const totalsByChannel = useMemo(() => {
    const c = { B2B: 0, B2C: 0, B2E: 0 };
    for (const d of channelMixByDept) {
      c.B2B += d.B2B; c.B2C += d.B2C; c.B2E += d.B2E;
    }
    return [
      { name: 'B2B', value: c.B2B, fill: CHANNEL_COLOR.B2B },
      { name: 'B2C', value: c.B2C, fill: CHANNEL_COLOR.B2C },
      { name: 'B2E', value: c.B2E, fill: CHANNEL_COLOR.B2E },
    ];
  }, []);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={totalsByChannel} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} label>
          {totalsByChannel.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
        </Pie>
        <Legend />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ProcessesPerDeptBar() {
  const data = useMemo(() => (
    departments.map((d) => ({ name: d.name.split(' ')[0], procs: d.processes?.length || 0, fill: d.color }))
  ), []);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={60} tick={{ fontSize: 10 }} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="procs" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CapabilityFamilyBar() {
  const data = useMemo(() => {
    const byFamily = {};
    for (const d of departments) {
      for (const capId of d.aiCapabilities || []) {
        const cap = aiCapabilityById[capId];
        if (!cap) continue;
        byFamily[cap.family] = (byFamily[cap.family] || 0) + 1;
      }
    }
    return Object.entries(byFamily)
      .map(([family, count]) => ({ family, count }))
      .sort((a, b) => b.count - a.count);
  }, []);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" />
        <YAxis type="category" dataKey="family" tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" fill="#1e40af" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CatalogBot({ visible, onClose }) {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState(null);

  function answerLocally(query) {
    const lowered = query.toLowerCase().trim();
    if (!lowered) return null;

    // Tiny rule-based responder over the catalog — placeholder for the
    // RAG-backed agent fleet (Phase 5).
    const matches = [];
    for (const d of departments) {
      const blob = (
        d.name + ' ' + d.description + ' ' + (d.aiCapabilities || []).join(' ')
      ).toLowerCase();
      const score = lowered.split(/\s+/).filter((t) => t.length > 2 && blob.includes(t)).length;
      if (score > 0) matches.push({ dept: d, score });
    }
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, 5);
  }

  function handleAsk() {
    const hits = answerLocally(q);
    setAnswer({ q, hits });
  }

  if (!visible) return null;
  return (
    <div
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        width: 360,
        maxHeight: '60vh',
        background: '#0f172a',
        color: '#f1f5f9',
        borderRadius: 12,
        boxShadow: '0 12px 32px rgba(15,23,42,0.4)',
        overflow: 'hidden',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: '#1e293b',
      }}>
        <span style={{ fontWeight: 700 }}>🤖 Catalog Bot</span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', color: '#94a3b8', border: 0,
            cursor: 'pointer', fontSize: 18,
          }}
        >×</button>
      </div>
      <div style={{ padding: 12, fontSize: 12, color: '#94a3b8' }}>
        Local-only rule-based search across 22 depts. The Phase-5 build wires
        this to the RAG + council agent fleet.
      </div>
      <div style={{ padding: 12, display: 'flex', gap: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          placeholder="e.g. fraud detection in claims"
          style={{
            flex: 1, padding: 8, borderRadius: 6, border: '1px solid #334155',
            background: '#1e293b', color: '#f1f5f9', fontSize: 12,
          }}
        />
        <button
          onClick={handleAsk}
          style={{
            padding: '8px 12px', background: '#1e40af', color: '#fff',
            border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 700,
          }}
        >Ask</button>
      </div>
      <div style={{ overflowY: 'auto', padding: '0 12px 12px', fontSize: 12 }}>
        {answer && (
          <>
            <div style={{ color: '#94a3b8', marginBottom: 8 }}>
              Top matches for <em>"{answer.q}"</em>:
            </div>
            {answer.hits?.length ? answer.hits.map((m) => (
              <div key={m.dept.id} style={{ marginBottom: 8, padding: 8, background: '#1e293b', borderRadius: 6 }}>
                <div style={{ fontWeight: 700 }}>{m.dept.icon} {m.dept.name}</div>
                <div style={{ color: '#cbd5e1' }}>{m.dept.description}</div>
              </div>
            )) : (
              <div style={{ color: '#64748b' }}>No matches. Try a different term.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function InsuranceCatalogPage() {
  const [selectedId, setSelectedId] = useState(departments[0]?.id || null);
  const [botOpen, setBotOpen] = useState(false);
  const selected = useMemo(
    () => departments.find((d) => d.id === selectedId),
    [selectedId]
  );

  useEffect(() => {
    document.title = `Catalog — ${brand.name}`;
  }, []);

  if (!departments.length) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Insurance Catalog</h1>
        <p style={{ color: '#b91c1c' }}>
          Catalog is empty. Run <code>python config/build_insurance_catalog.py</code>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title" style={{ color: '#0f172a' }}>
            <span aria-hidden="true">{brand.icon}</span>
            <span>Insurance Operations Catalog</span>
          </h1>
          <p className="page-subtitle">
            22 departments · {totals.processes} processes · {totals.subProcesses} sub-processes ·
            multi-channel (B2B/B2C/B2E) · multi-format downloadable data.
          </p>
        </div>
        <div className="page-header-right">
          <button
            onClick={() => setBotOpen((x) => !x)}
            style={{
              padding: '8px 14px', background: '#1e40af', color: '#fff',
              border: 0, borderRadius: 6, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {botOpen ? 'Close Bot' : '🤖 Ask Bot'}
          </button>
        </div>
      </div>

      {/* Management scoreboard */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <ScoreboardCard label="Departments" value={totals.departments} accent="#1e40af" />
        <ScoreboardCard label="Processes" value={totals.processes} accent="#dc2626" />
        <ScoreboardCard label="Sub-processes" value={totals.subProcesses} accent="#7c3aed" />
        <ScoreboardCard label="AI Capabilities" value={totals.aiCapabilities} accent="#10b981" />
        <ScoreboardCard label="Stakeholder Roles" value={totals.stakeholders} accent="#f59e0b" />
        <ScoreboardCard label="Downloadable Files" value={totals.dataFiles} accent="#0891b2" />
      </div>

      {/* Advanced graph reports */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            CHANNEL MIX  (B2B / B2C / B2E)
          </div>
          <ChannelMixDonut />
        </div>
        <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            PROCESSES PER DEPARTMENT
          </div>
          <ProcessesPerDeptBar />
        </div>
        <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            AI CAPABILITY USE BY FAMILY
          </div>
          <CapabilityFamilyBar />
        </div>
      </div>

      {/* Dept selector + process list */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        <div style={{
          background: '#fff', padding: 8, borderRadius: 8,
          border: '1px solid #e2e8f0', maxHeight: '70vh', overflowY: 'auto',
        }}>
          {departments.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 10px',
                background: d.id === selectedId ? d.color + '22' : 'transparent',
                color: d.id === selectedId ? d.color : '#0f172a',
                border: 0,
                borderLeft: `3px solid ${d.id === selectedId ? d.color : 'transparent'}`,
                textAlign: 'left',
                fontWeight: d.id === selectedId ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 16 }} aria-hidden="true">{d.icon}</span>
              <span style={{ flex: 1 }}>{d.name}</span>
              <span style={{ fontSize: 10, color: '#64748b' }}>{d.processes?.length || 0}</span>
            </button>
          ))}
        </div>

        <div>
          {selected && (
            <div style={{ background: 'transparent' }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14,
                padding: 14, background: `linear-gradient(135deg, ${selected.color}10, ${selected.color}25)`,
                border: `1px solid ${selected.color}55`, borderLeft: `4px solid ${selected.color}`,
                borderRadius: 8,
              }}>
                <span style={{ fontSize: 32 }} aria-hidden="true">{selected.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>{selected.name}</div>
                  <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>{selected.description}</div>
                  <div style={{ fontSize: 12, color: selected.color, fontWeight: 700 }}>ROI · {selected.roi}</div>
                </div>
              </div>

              <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, color: '#475569' }}>
                DEPARTMENT AI CAPABILITIES ({selected.aiCapabilities?.length || 0})
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 18 }}>
                {(selected.aiCapabilities || []).map((c) => <AICapabilityChip key={c} capId={c} />)}
              </div>

              <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, color: '#475569' }}>
                PROCESSES ({selected.processes?.length || 0})
              </div>
              {(selected.processes || []).map((p) => (
                <ProcessRow key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      <CatalogBot visible={botOpen} onClose={() => setBotOpen(false)} />
    </div>
  );
}
