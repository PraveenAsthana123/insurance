import { useEffect, useState } from 'react';
import { departmentROI } from '../../data/roi';
import { departmentAIStack } from '../../data/aiStack';
import { listStores } from '../../services/salesApi';
import { listSkus, listSuppliers } from '../../services/supplyChainApi';
import { getWorkflowsForDept } from '../../data/workflows';
import { getUseCasesForDept } from '../../data/aiUseCases';
import { rolesByDept } from '../../data/roles';
import { getInboundEdges, getOutboundEdges } from '../../data/dataFlow';

export default function OverviewTab({ dept }) {
  const roi = departmentROI[dept.id] || [];
  const aiStack = departmentAIStack[dept.id] || [];

  return (
    <div>
      {dept.id === 'sales' && <SalesOverviewSection />}
      {dept.id === 'supply-chain' && <SupplyChainOverviewSection />}
      {dept.id !== 'dashboard' && <DataSnapshotSection dept={dept} />}
      <div className="content-section">
        <h3 className="content-section-title">Department Overview</h3>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {dept.description}
        </p>
        <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
          {dept.aiTypes.map((t) => (
            <span key={t} className={`ai-badge ai-badge-${t.toLowerCase().replace(' ', '')}`}>{t}</span>
          ))}
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-accent blue" />
          <div className="kpi-label">Processes</div>
          <div className="kpi-value">{dept.processCount}</div>
          <div className="kpi-change neutral"><span className="kpi-change-label">AI-powered workflows</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-accent green" />
          <div className="kpi-label">ROI Impact</div>
          <div className="kpi-value" style={{ fontSize: 'var(--font-size-xl)' }}>{dept.roi}</div>
          <div className="kpi-change positive"><span className="kpi-change-arrow">↑</span> Measured impact</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-accent purple" />
          <div className="kpi-label">AI Stack</div>
          <div className="kpi-value">{dept.aiTypes.length}</div>
          <div className="kpi-change neutral"><span className="kpi-change-label">AI types deployed</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-accent amber" />
          <div className="kpi-label">Dataset</div>
          <div className="kpi-value" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Kaggle</div>
          <div className="kpi-change neutral"><span className="kpi-change-label">{dept.kaggleDataset}</span></div>
        </div>
      </div>

      {roi.length > 0 && (
        <div className="content-section">
          <div className="content-section-header">
            <span className="content-section-title">💰 Key ROI Highlights</span>
          </div>
          <div className="card-grid card-grid-2">
            {roi.slice(0, 4).map((r, i) => (
              <div key={i} className="card">
                <div className="card-body">
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>{r.area}</div>
                  <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--accent-success)', marginBottom: 6 }}>{r.impact}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{r.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {aiStack.length > 0 && (
        <div className="content-section">
          <div className="content-section-header">
            <span className="content-section-title">🤖 AI Stack Summary</span>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>AI Type</th>
                  <th>Use Case</th>
                  <th>Example Output</th>
                </tr>
              </thead>
              <tbody>
                {aiStack.map((ai, i) => (
                  <tr key={i}>
                    <td><span className={`ai-badge ai-badge-${ai.type.toLowerCase().replace(' ', '')}`}>{ai.type}</span></td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{ai.useCase}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)', fontStyle: 'italic', color: 'var(--text-muted)' }}>{ai.exampleOutput}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SalesOverviewSection() {
  const [stores, setStores] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listStores()
      .then((s) => { if (!cancelled) setStores(s); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Sales KPIs (live)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Tile
          label="Active stores"
          value={stores ? stores.length : '—'}
          note="from dim_store"
        />
        <Tile
          label="Store types"
          value={stores ? new Set(stores.map((s) => s.store_type)).size : '—'}
          note="a / b / c / d"
        />
        <Tile
          label="Backend"
          value={error ? '✗ error' : stores ? '✓ Live' : '…'}
          note="GET /api/v1/sales/stores"
        />
        <Tile
          label="Forecast engine"
          value="Prophet"
          note="Phase β · MAPE 14.7% (store 1)"
        />
      </div>
      {error && (
        <div style={{ color: '#991b1b', marginTop: 12, fontSize: 12 }}>
          API error: {error}
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, note }) {
  return (
    <div style={{
      padding: 16, background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, margin: '4px 0' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>{note}</div>
    </div>
  );
}

function SupplyChainOverviewSection() {
  const [skus, setSkus] = useState(null);
  const [suppliers, setSuppliers] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listSkus(), listSuppliers()])
      .then(([sk, sp]) => {
        if (!cancelled) {
          setSkus(sk);
          setSuppliers(sp);
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const topSupplier =
    suppliers && suppliers.length > 0 ? suppliers[0] : null;

  const backendOk = !error && skus !== null && suppliers !== null;
  const loading = !error && skus === null && suppliers === null;

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Supply Chain KPIs (live)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Tile
          label="SKUs tracked"
          value={skus ? skus.length : '—'}
          note="from dim_sku"
        />
        <Tile
          label="Suppliers"
          value={suppliers ? suppliers.length : '—'}
          note="from dim_supplier"
        />
        <Tile
          label="Top supplier score"
          value={topSupplier ? topSupplier.score.toFixed(1) : '—'}
          note={topSupplier ? topSupplier.supplier_name || topSupplier.supplier_id : 'awaiting data'}
        />
        <Tile
          label="Backend"
          value={error ? '✗ error' : (backendOk ? '✓ Live' : (loading ? '…' : '…'))}
          note="GET /api/v1/supply-chain/*"
        />
      </div>
      {error && (
        <div style={{ color: '#991b1b', marginTop: 12, fontSize: 12 }}>
          API error: {error}
        </div>
      )}
    </div>
  );
}

function DataSnapshotSection({ dept }) {
  const workflows = getWorkflowsForDept(dept.id);
  const useCases = getUseCasesForDept(dept.id);
  const inbound = getInboundEdges(dept.id);
  const outbound = getOutboundEdges(dept.id);

  const deptRoles = rolesByDept[dept.id] || {};
  const seededRoleCount = Object.values(deptRoles).filter(
    (r) => r && typeof r === 'object' && typeof r.title === 'string' && r.title.length > 0
  ).length;

  const categoryCount = new Set(useCases.map((u) => u.category)).size;

  const workflowNote =
    workflows.length > 0 ? '4 roles × process lifecycle' : 'awaiting Phase 2 seed';
  const useCaseNote =
    useCases.length > 0 ? `${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}` : 'catalog pending';
  const rolesNote =
    seededRoleCount > 0 ? `${seededRoleCount} of 4 canonical roles` : 'awaiting Phase 2 seed';
  const flowsNote =
    inbound.length + outbound.length > 0 ? 'cross-dept dependencies' : 'no cross-dept edges yet';

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>
        Data snapshot (static — Phase 1 seed)
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        <Tile label="Enhancement workflows" value={workflows.length} note={workflowNote} />
        <Tile label="AI use cases seeded" value={useCases.length} note={useCaseNote} />
        <Tile label="Roles seeded" value={seededRoleCount} note={rolesNote} />
        <Tile
          label="Data flows in / out"
          value={`${inbound.length} in / ${outbound.length} out`}
          note={flowsNote}
        />
      </div>
    </div>
  );
}
