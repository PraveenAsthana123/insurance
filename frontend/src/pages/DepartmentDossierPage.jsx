// DepartmentDossierPage.jsx — single-pane-of-information view for one
// department. Renders every known data facet in a single scrollable page:
// header → KPIs → backend status → processes → AI use cases → roles →
// reports → documents → decisions → incidents → monitoring → lifecycles →
// data flows.
//
// Pilot: sidebar link is currently Sales-only, but this route accepts any
// department id — visiting /supply-chain/dossier, /marketing/dossier, etc.
// still works and shows whatever data exists for that dept.

import { useParams, Navigate } from 'react-router-dom';
import departments from '../data/departments';
import HeaderBanner from '../components/dossier/HeaderBanner';
import KpiStrip from '../components/dossier/KpiStrip';
import BackendStatusRow from '../components/dossier/BackendStatusRow';
import ProcessesSection from '../components/dossier/ProcessesSection';
import UseCasesSection from '../components/dossier/UseCasesSection';
import RolesSection from '../components/dossier/RolesSection';
import ReportsSection from '../components/dossier/ReportsSection';
import DocumentsSection from '../components/dossier/DocumentsSection';
import DecisionsSection from '../components/dossier/DecisionsSection';
import IncidentsSection from '../components/dossier/IncidentsSection';
import MonitoringSection from '../components/dossier/MonitoringSection';
import LifecyclesSection from '../components/dossier/LifecyclesSection';
import DataFlowsSection from '../components/dossier/DataFlowsSection';

const SECTIONS = [
  { id: 'kpis', label: 'KPIs', Component: KpiStrip },
  { id: 'status', label: 'Backend status', Component: BackendStatusRow },
  { id: 'processes', label: 'Processes', Component: ProcessesSection },
  { id: 'usecases', label: 'AI Use Cases', Component: UseCasesSection },
  { id: 'roles', label: 'Roles', Component: RolesSection },
  { id: 'reports', label: 'Reports', Component: ReportsSection },
  { id: 'documents', label: 'Documents', Component: DocumentsSection },
  { id: 'decisions', label: 'Decisions', Component: DecisionsSection },
  { id: 'incidents', label: 'Incidents', Component: IncidentsSection },
  { id: 'monitoring', label: 'Monitoring', Component: MonitoringSection },
  { id: 'lifecycles', label: 'Lifecycles', Component: LifecyclesSection },
  { id: 'dataflows', label: 'Data Flows', Component: DataFlowsSection },
];

export default function DepartmentDossierPage() {
  const { departmentId } = useParams();
  const dept = departments.find((d) => d.id === departmentId);

  if (!dept || dept.id === 'dashboard') {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Left: scroll-to-section TOC */}
      <aside
        style={{
          width: 180,
          position: 'sticky',
          top: 20,
          flexShrink: 0,
        }}
        aria-label="Dossier table of contents"
      >
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#94a3b8',
            marginBottom: 10,
            fontWeight: 600,
          }}
        >
          On this page
        </div>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            fontSize: 13,
            borderLeft: '2px solid #e2e8f0',
          }}
        >
          {SECTIONS.map((s) => (
            <li key={s.id} style={{ marginBottom: 2 }}>
              <a
                href={`#${s.id}`}
                style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  display: 'block',
                  padding: '4px 10px',
                  borderLeft: '2px solid transparent',
                  marginLeft: -2,
                }}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <div
          style={{
            marginTop: 12,
            fontSize: 10,
            color: '#cbd5e1',
            padding: '6px 10px',
            lineHeight: 1.5,
          }}
        >
          Single-pane dossier · pilot view
        </div>
      </aside>

      {/* Right: content */}
      <main style={{ flex: 1, minWidth: 0 }}>
        <HeaderBanner dept={dept} />
        {SECTIONS.map(({ id, Component }) => (
          <Component key={id} dept={dept} />
        ))}
        <div
          style={{
            fontSize: 11,
            color: '#94a3b8',
            textAlign: 'center',
            padding: '16px 0',
          }}
        >
          End of dossier · {dept.name} · {SECTIONS.length} sections
        </div>
      </main>
    </div>
  );
}
