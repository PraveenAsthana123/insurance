import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

// Eagerly load the small/critical pages (dashboard, dept tree) — these run on
// most navigations and avoid a spinner on first load.
import Dashboard from './pages/Dashboard';
import DepartmentPage from './pages/DepartmentPage';
import ProcessPage from './pages/ProcessPage';
import AdminPage from './pages/AdminPage';
import ManagerPage from './pages/ManagerPage';
import ManagerArchetypePage from './pages/ManagerArchetypePage';
import TesterPage from './pages/TesterPage';
import DepartmentDossierPage from './pages/DepartmentDossierPage';
import DataFlowPage from './pages/DataFlowPage';
import HolyNavPage from './pages/HolyNavPage';
import AgentSupervisorPage from './pages/AgentSupervisorPage';

// Lazy-load the heavy pages. ChartShowcase pulls Plotly+ECharts+Leaflet
// (~6MB of vendor JS); PhaseDetailPage pulls jspdf+html2canvas on PDF
// export. Splitting them keeps the initial bundle small.
const ChartShowcase    = lazy(() => import('./pages/ChartShowcase'));
const CatalogsPage     = lazy(() => import('./pages/CatalogsPage'));
const TenantsPage      = lazy(() => import('./pages/TenantsPage'));
const PhaseDetailPage  = lazy(() => import('./pages/PhaseDetailPage'));
const DataExplorer     = lazy(() => import('./pages/DataExplorer'));

import './styles/global.css';
import './styles/sidebar.css';
import './styles/topbar.css';
import './styles/content.css';
import './styles/cards.css';
import './styles/tables.css';
import './styles/tabs.css';
import './styles/charts.css';
import './styles/process.css';
import './styles/forms.css';

function PageLoader({ label }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 120px)',
        gap: 16,
        color: '#64748b',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '4px solid #e2e8f0',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }}
      />
      <div style={{ fontSize: 13 }}>{label || 'Loading…'}</div>
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data-flow" element={<DataFlowPage />} />
          <Route path="/holy" element={<HolyNavPage />} />
          <Route path="/agent-supervisor" element={<AgentSupervisorPage />} />

          {/* Heavy lazy-loaded pages get their own Suspense boundary so a
              navigation between them shows a per-page spinner rather than
              re-mounting the whole layout. */}
          <Route
            path="/chart-showcase"
            element={
              <Suspense fallback={<PageLoader label="Loading chart libraries…" />}>
                <ChartShowcase />
              </Suspense>
            }
          />
          <Route
            path="/catalogs"
            element={
              <Suspense fallback={<PageLoader label="Loading catalogs…" />}>
                <CatalogsPage />
              </Suspense>
            }
          />
          <Route
            path="/catalogs/:catalog/:code"
            element={
              <Suspense fallback={<PageLoader label="Loading phase…" />}>
                <PhaseDetailPage />
              </Suspense>
            }
          />
          <Route
            path="/catalogs/:catalog/:code/:tab"
            element={
              <Suspense fallback={<PageLoader label="Loading phase…" />}>
                <PhaseDetailPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/tenants"
            element={
              <Suspense fallback={<PageLoader label="Loading tenants…" />}>
                <TenantsPage />
              </Suspense>
            }
          />
          <Route
            path="/data-explorer"
            element={
              <Suspense fallback={<PageLoader label="Loading data explorer…" />}>
                <DataExplorer />
              </Suspense>
            }
          />

          <Route path="/holy/:departmentId" element={<HolyNavPage />} />
          <Route path="/:departmentId" element={<DepartmentPage />} />
          <Route path="/:departmentId/admin" element={<AdminPage />} />
          <Route path="/:departmentId/manager" element={<ManagerPage />} />
          <Route path="/:departmentId/manager/archetype/:archetypeId" element={<ManagerArchetypePage />} />
          <Route path="/:departmentId/tester" element={<TesterPage />} />
          <Route path="/:departmentId/dossier" element={<DepartmentDossierPage />} />
          <Route path="/:departmentId/:processId" element={<ProcessPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
