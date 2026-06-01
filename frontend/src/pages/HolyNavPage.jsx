import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import AgenticConsole from '../components/AgenticConsole';
import FleetMonitor from '../components/FleetMonitor';
import PipelineOutput from '../components/PipelineOutput';
import ProcessSimulator from '../components/ProcessSimulator';
import RoleDashboard from '../components/RoleDashboard';
import SecurityTab from '../components/SecurityTab';
import TestingDashboard from '../components/TestingDashboard';
import './HolyNavPage.css';

// Reference pipeline assigned per dept — these have working lifecycle runs.
// Other depts fall back to {dept}/reference if a manifest exists.
const REFERENCE_PIPELINE = {
  sales: { dept: 'sales', pipeline: 'churn_reference' },
  'customer-experience': { dept: 'customer-experience', pipeline: 'rag_reference' },
};

const ALL_AUDIENCES = ['b2b', 'b2c', 'b2e'];
const API_BASE = '/api/v1/holy';

export default function HolyNavPage() {
  const { departmentId } = useParams();
  const [depts, setDepts] = useState([]);
  const [nav, setNav] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({ process: null, sub: null });
  const [activeTab, setActiveTab] = useState('Overview');
  const [audiences, setAudiences] = useState(ALL_AUDIENCES);
  const [specOpen, setSpecOpen] = useState(false);
  const [specMd, setSpecMd] = useState('');
  const [council, setCouncil] = useState({ status: 'idle', taskId: null, result: null, error: null });
  const pollTimer = useRef(null);

  // Load dept list (for picker)
  useEffect(() => {
    if (departmentId) return;
    fetch(`${API_BASE}/depts`)
      .then((r) => r.json())
      .then((d) => setDepts(d.departments || []))
      .catch((e) => setError(String(e)));
  }, [departmentId]);

  // Load nav for selected dept
  useEffect(() => {
    if (!departmentId) {
      setNav(null);
      return;
    }
    setError(null);
    setSelected({ process: null, sub: null });
    setAudiences(ALL_AUDIENCES);
    setSpecOpen(false);
    setCouncil({ status: 'idle', taskId: null, result: null, error: null });
    fetch(`${API_BASE}/nav/${departmentId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load nav: HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setNav(data);
        if (data.left_nav?.[0]?.sub_processes?.[0]) {
          setSelected({
            process: data.left_nav[0].process,
            sub: data.left_nav[0].sub_processes[0],
          });
          setActiveTab('Overview');
        }
      })
      .catch((e) => setError(String(e)));
  }, [departmentId]);

  // Cleanup polling on unmount or dept change
  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [departmentId]);

  const filteredNav = useMemo(() => {
    if (!nav) return null;
    const filtered = nav.left_nav
      .map((proc) => ({
        ...proc,
        sub_processes: proc.sub_processes.filter((s) => {
          const subAudiences = s.audiences ?? ALL_AUDIENCES;
          return subAudiences.some((a) => audiences.includes(a));
        }),
      }))
      .filter((proc) => proc.sub_processes.length > 0);
    return { ...nav, left_nav: filtered };
  }, [nav, audiences]);

  const totalVisibleSubs = useMemo(() => {
    if (!filteredNav) return 0;
    return filteredNav.left_nav.reduce((acc, p) => acc + p.sub_processes.length, 0);
  }, [filteredNav]);

  const toggleAudience = (a) => {
    setAudiences((prev) => {
      if (prev.includes(a)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== a);
      }
      return [...prev, a];
    });
  };

  const openSpec = async () => {
    setSpecOpen(true);
    if (specMd) return;
    try {
      const r = await fetch(`${API_BASE}/spec/${departmentId}`);
      const d = await r.json();
      setSpecMd(d.markdown || '_(empty)_');
    } catch (e) {
      setSpecMd(`Error loading spec: ${e}`);
    }
  };

  const askCouncil = async () => {
    if (!selected.sub) return;
    setCouncil({ status: 'submitting', taskId: null, result: null, error: null });
    const prompt = selected.sub.tab_content?.Overview ?? selected.sub.name;
    try {
      const r = await fetch(`${API_BASE}/council/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, department: departmentId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || `HTTP ${r.status}`);
      setCouncil({ status: 'pending', taskId: d.task_id, result: null, error: null });
      pollCouncil(d.task_id);
    } catch (e) {
      setCouncil({ status: 'error', taskId: null, result: null, error: String(e) });
    }
  };

  const pollCouncil = (taskId, attempt = 0) => {
    if (attempt > 60) {
      // 60 attempts × 5s = 5 min max
      setCouncil((c) => ({ ...c, status: 'error', error: 'Timeout waiting for council (5 min)' }));
      return;
    }
    pollTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API_BASE}/council/result/${taskId}`);
        const d = await r.json();
        if (d.status === 'done') {
          setCouncil({ status: 'done', taskId, result: d.result, error: null });
        } else {
          pollCouncil(taskId, attempt + 1);
        }
      } catch (e) {
        setCouncil((c) => ({ ...c, status: 'error', error: String(e) }));
      }
    }, 5000);
  };

  if (!departmentId) {
    return (
      <div className="holy-nav-container">
        <h1>HOLY Beverage — Department Navigator</h1>
        <p className="holy-subtitle">
          Pick a department to explore its processes, sub-processes, data inputs, AI models, outputs, and KPIs.
          Filter by audience (B2B / B2C / B2E) and ask the AI council about any process.
        </p>
        <div className="holy-dept-grid">
          {depts.length === 0 && <p>Loading depts…</p>}
          {depts.map((d) => (
            <Link key={d} to={`/holy/${d}`} className="holy-dept-card">
              <span className="holy-dept-name">{d.replace(/-/g, ' ')}</span>
              <span className="holy-dept-cta">Open →</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="holy-nav-container">
        <p className="holy-error">{error}</p>
        <Link to="/holy" className="holy-back">← Back to department picker</Link>
      </div>
    );
  }

  if (!nav || !filteredNav) {
    return (
      <div className="holy-nav-container">
        <p>Loading nav for {departmentId}…</p>
      </div>
    );
  }

  const { sub, process: procName } = selected;
  const subStillVisible =
    sub && filteredNav.left_nav.some((p) => p.sub_processes.some((s) => s.slug === sub.slug));

  return (
    <div className="holy-nav-page">
      <aside className="holy-sidebar">
        <div className="holy-sidebar-header">
          <Link to="/holy" className="holy-back-link">← All HOLY depts</Link>
          <h2>{nav.display_name}</h2>
          <p className="holy-sidebar-sub">
            {filteredNav.left_nav.length} processes · {totalVisibleSubs} sub-processes shown
          </p>
          <div className="holy-spec-link-wrap">
            <button type="button" onClick={openSpec} className="holy-spec-link">
              📄 View full HOLY_SPEC.md
            </button>
          </div>

          <div className="holy-audience-filter">
            <span className="holy-audience-label">Filter by audience:</span>
            <div className="holy-audience-chips">
              {ALL_AUDIENCES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAudience(a)}
                  className={
                    'holy-audience-chip' +
                    (audiences.includes(a) ? ' holy-audience-chip--active' : '')
                  }
                  aria-pressed={audiences.includes(a)}
                >
                  {a.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <nav className="holy-sidebar-nav">
          {filteredNav.left_nav.length === 0 ? (
            <p className="holy-empty-nav">No sub-processes match the current audience filter.</p>
          ) : (
            filteredNav.left_nav.map((proc) => (
              <div key={proc.slug} className="holy-proc-group">
                <div className="holy-proc-title">{proc.process}</div>
                <ul className="holy-sub-list">
                  {proc.sub_processes.map((s) => (
                    <li key={s.slug}>
                      <button
                        type="button"
                        className={
                          'holy-sub-link' +
                          (selected.sub?.slug === s.slug ? ' holy-sub-link--active' : '')
                        }
                        onClick={() => {
                          setSelected({ process: proc.process, sub: s });
                          setActiveTab('Overview');
                          setCouncil({ status: 'idle', taskId: null, result: null, error: null });
                        }}
                      >
                        <span>{s.name}</span>
                        {s.audiences && s.audiences.length < 3 && (
                          <span className="holy-sub-aud-badge">
                            {s.audiences.map((a) => a.toUpperCase()).join(' · ')}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </nav>
      </aside>

      <section className="holy-main">
        {!sub || !subStillVisible ? (
          <div className="holy-empty">
            <p>
              {!sub
                ? 'Pick a sub-process from the left sidebar.'
                : 'The previously-selected sub-process is hidden by the current audience filter. Toggle a filter chip or pick another sub-process.'}
            </p>
          </div>
        ) : (
          <>
            <header className="holy-main-header">
              <p className="holy-breadcrumb">
                <span>{nav.display_name}</span> ›{' '}
                <span>{procName}</span> ›{' '}
                <span className="holy-breadcrumb-current">{sub.name}</span>
              </p>
              <div className="holy-main-title-row">
                <h1>{sub.name}</h1>
                {sub.audiences && (
                  <div className="holy-sub-audiences">
                    {sub.audiences.map((a) => (
                      <span key={a} className="holy-aud-badge">{a.toUpperCase()}</span>
                    ))}
                  </div>
                )}
              </div>
            </header>

            <div className="holy-tabs">
              {sub.tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={'holy-tab' + (activeTab === t ? ' holy-tab--active' : '')}
                  onClick={() => setActiveTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="holy-tab-content">
              <p>{sub.tab_content?.[activeTab] ?? '(no content for this tab)'}</p>
            </div>

            {/* Pipeline output — shows the latest reference-pipeline run for this dept */}
            {REFERENCE_PIPELINE[departmentId] && (
              <PipelineOutput
                dept={REFERENCE_PIPELINE[departmentId].dept}
                pipeline={REFERENCE_PIPELINE[departmentId].pipeline}
              />
            )}

            {/* Process simulator — per §64.34, every dept gets a simulator tab */}
            <ProcessSimulator dept={departmentId} />

            {/* Role dashboard + reports — per §64.37, every dept gets per-role dashboards */}
            <RoleDashboard dept={departmentId} />

            {/* Security & attack simulation — per §64.32, every dept gets the security surface */}
            <SecurityTab dept={departmentId} />

            {/* Fleet monitor — live view of 100-agent + 3-council + N-test fleet */}
            <FleetMonitor dept={departmentId} />

            {/* Agentic Console — per §64.40.5, 10-layer execution stack UI */}
            <AgenticConsole dept={departmentId} />

            {/* Testing Dashboard — per §65.8.3, 8-tier dispatch + results */}
            <TestingDashboard dept={departmentId} />

            {/* Ask Council */}
            <div className="holy-council-section">
              <div className="holy-council-header">
                <h3>🤖 Ask the AI Council</h3>
                <button
                  type="button"
                  onClick={askCouncil}
                  disabled={council.status === 'submitting' || council.status === 'pending'}
                  className="holy-council-btn"
                >
                  {council.status === 'submitting'
                    ? 'Submitting…'
                    : council.status === 'pending'
                    ? 'Council processing…'
                    : 'Ask council about this sub-process'}
                </button>
              </div>

              {council.status === 'pending' && (
                <p className="holy-council-status">
                  ⏳ Council working (3 stages × ~30s each on CPU). Task ID: <code>{council.taskId}</code>
                </p>
              )}

              {council.status === 'error' && (
                <p className="holy-council-error">⚠ {council.error}</p>
              )}

              {council.status === 'done' && council.result && (
                <div className="holy-council-result">
                  <div className="holy-council-meta">
                    <span>Total: {Math.round(council.result.elapsed_ms / 1000)}s</span>
                    <span>Task: <code>{council.result.task_id}</code></span>
                  </div>
                  <div className="holy-council-stage">
                    <div className="holy-council-stage-title">
                      ① AUTHOR · <code>{council.result.author?.model}</code> · {council.result.author?.ms}ms
                    </div>
                    <div className="holy-council-stage-body">{council.result.author?.response}</div>
                  </div>
                  <div className="holy-council-stage">
                    <div className="holy-council-stage-title">
                      ② REVIEWER · <code>{council.result.reviewer?.model}</code> · {council.result.reviewer?.ms}ms
                    </div>
                    <div className="holy-council-stage-body">{council.result.reviewer?.response}</div>
                  </div>
                  <div className="holy-council-stage holy-council-stage--final">
                    <div className="holy-council-stage-title">
                      ③ CHAIR (FINAL) · <code>{council.result.chair?.model}</code> · {council.result.chair?.ms}ms
                    </div>
                    <div className="holy-council-stage-body">{council.result.chair?.response}</div>
                  </div>
                </div>
              )}
            </div>

            <details className="holy-debug">
              <summary>Raw JSON for this sub-process</summary>
              <pre>{JSON.stringify(sub, null, 2)}</pre>
            </details>
          </>
        )}

        {/* HOLY_SPEC.md inline modal */}
        {specOpen && (
          <div className="holy-spec-modal-backdrop" onClick={() => setSpecOpen(false)}>
            <div className="holy-spec-modal" onClick={(e) => e.stopPropagation()}>
              <div className="holy-spec-modal-header">
                <h2>HOLY_SPEC.md — {nav.display_name}</h2>
                <button type="button" onClick={() => setSpecOpen(false)} className="holy-spec-close">
                  ✕
                </button>
              </div>
              <div className="holy-spec-modal-body">
                {specMd ? <ReactMarkdown>{specMd}</ReactMarkdown> : <p>Loading spec…</p>}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
