import { useState, useEffect } from 'react';
import { Outlet, useParams, Link } from 'react-router-dom';
import GlobalCmdK from '../../components/GlobalCmdK';
import AlertsBadge from '../../components/AlertsBadge';
import ThemeToggle from '../../components/ThemeToggle';
import ToastHost from '../../components/Toast';
import KeyboardShortcuts from '../../components/KeyboardShortcuts';
import TopProgressBar from '../../components/TopProgressBar';
import { useTrackRecent } from '../../components/FavoritesPanel';
import { InsuranceMainMenu } from './InsuranceMainMenu';
import { InsuranceSubMenu } from './InsuranceSubMenu';

function useBlueprint() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch('/insurance-blueprint', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => { if (!cancelled) setData(j); })
      .catch((e) => { if (!cancelled && e.name !== 'AbortError') setErr(e.message); });
    return () => { cancelled = true; controller.abort(); };
  }, []);
  return { bp: data, err };
}

function Breadcrumb({ bp }) {
  const params = useParams();
  const dept = bp?.department_catalog?.find((d) => String(d.id) === params.deptId);
  return (
    <div className="insurance-breadcrumb">
      <GlobalCmdK />
      <div style={{ position: "fixed", top: 12, right: 16, zIndex: 100, display: 'flex', gap: 6 }}>
        <ThemeToggle />
        <AlertsBadge />
      </div>
      <ToastHost />
      <KeyboardShortcuts />
      <TopProgressBar />
      <Link to="/insurance">Insurance</Link>
      {dept && (
        <>
          <span>›</span>
          <Link to={`/insurance/${dept.id}`}>{dept.id} · {dept.name}</Link>
        </>
      )}
      {params.domain && (
        <>
          <span>›</span>
          <Link to={`/insurance/${params.deptId}/${params.domain}`}>{params.domain}</Link>
        </>
      )}
      {params.processId && (
        <>
          <span>›</span>
          <Link to={`/insurance/${params.deptId}/${params.domain}/${params.processId}`}>{decodeURIComponent(params.processId)}</Link>
        </>
      )}
      {params.subProcessId && (
        <>
          <span>›</span>
          <span>{decodeURIComponent(params.subProcessId)}</span>
        </>
      )}
    </div>
  );
}

export function InsuranceLayout() {
  const { bp, err } = useBlueprint();
  if (err) {
    return <div className="insurance-empty-state">Blueprint not available: {err}</div>;
  }
  if (!bp) {
    return <div className="insurance-empty-state">Loading insurance blueprint…</div>;
  }
  return (
    <div className="insurance-3col">
      <InsuranceMainMenu bp={bp} />
      <InsuranceSubMenu bp={bp} />
      <div className="insurance-content-pane">
        <Breadcrumb bp={bp} />
        <Outlet context={{ bp }} />
      </div>
    </div>
  );
}
