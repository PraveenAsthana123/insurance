import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { departments } from '../data/departments';
import TesterOverviewTab from '../components/tester-tabs/TesterOverviewTab';
import TesterRunsTab from '../components/tester-tabs/TesterRunsTab';
import TesterDefectsTab from '../components/tester-tabs/TesterDefectsTab';
import TesterCoverageTab from '../components/tester-tabs/TesterCoverageTab';
import TesterWorkflowsTab from '../components/tester-tabs/TesterWorkflowsTab';

const TABS = [
  { id: 'overview',  label: 'Overview',   icon: '🧪', Component: TesterOverviewTab  },
  { id: 'runs',      label: 'Test Runs',  icon: '▶️', Component: TesterRunsTab      },
  { id: 'defects',   label: 'Defect Log', icon: '🐞', Component: TesterDefectsTab   },
  { id: 'coverage',  label: 'Coverage',   icon: '🛡️', Component: TesterCoverageTab  },
  { id: 'workflows', label: 'Workflows',  icon: '🔁', Component: TesterWorkflowsTab },
];

export default function TesterPage() {
  const { departmentId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const dept = departments.find((d) => d.id === departmentId);
  if (!dept || dept.id === 'dashboard') return <Navigate to="/" replace />;

  const Active = TABS.find((t) => t.id === activeTab).Component;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">🧪 {dept.name} — Tester</div>
          <div className="page-subtitle">
            Quality signals, test runs, defects, and coverage for the {dept.name} department
          </div>
        </div>
        <div className="page-header-right">
          <span
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--border-radius-lg)',
              background: `${dept.color}15`,
              border: `1px solid ${dept.color}33`,
              color: dept.color,
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
            }}
          >
            {dept.icon} {dept.name}
          </span>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs-bar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-item${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-item-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="tab-content">
          <div className="tab-panel active has-padding">
            <Active dept={dept} />
          </div>
        </div>
      </div>
    </div>
  );
}
