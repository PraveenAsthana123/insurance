import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { departments } from '../data/departments';
import { departmentProcesses } from '../data/processes';
import ProcessOverviewTab from '../components/process-tabs/ProcessOverviewTab';
import ProcessDataTab from '../components/process-tabs/ProcessDataTab';
import ProcessModelsTab from '../components/process-tabs/ProcessModelsTab';
import ProcessTestingTab from '../components/process-tabs/ProcessTestingTab';
import ProcessGovernanceTab from '../components/process-tabs/ProcessGovernanceTab';
import ProcessDocsTab from '../components/process-tabs/ProcessDocsTab';
import ProcessAutomationTab from '../components/process-tabs/ProcessAutomationTab';
import ProcessProblemTab from '../components/process-tabs/ProcessProblemTab';
import ProcessDemoTab from '../components/process-tabs/ProcessDemoTab';
import ProcessAccuracyTab from '../components/process-tabs/ProcessAccuracyTab';
import ProcessChatbotTab from '../components/process-tabs/ProcessChatbotTab';
import ProcessDataPipelineTab from '../components/process-tabs/ProcessDataPipelineTab';
import ProcessAnalysisTab from '../components/process-tabs/ProcessAnalysisTab';
import ProcessAIInfraTab from '../components/process-tabs/ProcessAIInfraTab';
import ProcessSchedulingTab from '../components/process-tabs/ProcessSchedulingTab';
import ProcessDatabaseTab from '../components/process-tabs/ProcessDatabaseTab';
import ProcessMathTab from '../components/process-tabs/ProcessMathTab';
import ProcessFeedbackTab from '../components/process-tabs/ProcessFeedbackTab';
import ProcessSimulationTab from '../components/process-tabs/ProcessSimulationTab';
import ProcessStrategyTab from '../components/process-tabs/ProcessStrategyTab';
import ProcessReportsTab from '../components/process-tabs/ProcessReportsTab';
import ProcessWorkbenchTab from '../components/process-tabs/ProcessWorkbenchTab';

const TABS = [
  { id: 'overview',      label: 'Overview',          icon: '📋' },
  { id: 'workbench',     label: 'ML Workbench',       icon: '🔬' },
  { id: 'problem',       label: 'Problem & Use Case', icon: '🎯' },
  { id: 'data',          label: 'Data',               icon: '🗂️' },
  { id: 'datapipeline',  label: 'Data Pipeline',      icon: '🔁' },
  { id: 'databases',     label: 'Databases',          icon: '🗄️' },
  { id: 'models',        label: 'Models',             icon: '🧠' },
  { id: 'accuracy',      label: 'Accuracy',           icon: '📈' },
  { id: 'analysis',      label: 'Analysis',           icon: '🔬' },
  { id: 'mathematics',   label: 'Mathematics',        icon: '∑' },
  { id: 'testing',       label: 'Testing',            icon: '🧪' },
  { id: 'feedback',      label: 'Feedback & RLHF',    icon: '🔁' },
  { id: 'simulation',    label: 'Simulation',         icon: '🎮' },
  { id: 'governance',    label: 'AI Governance',      icon: '🏛️' },
  { id: 'aiinfra',       label: 'AI Infrastructure',  icon: '⚙️' },
  { id: 'strategy',      label: 'Strategy',           icon: '♟️' },
  { id: 'reports',       label: 'Reports',            icon: '📊' },
  { id: 'docs',          label: 'Documentation',      icon: '📚' },
  { id: 'demos',         label: 'Demo Scenarios',     icon: '🎬' },
  { id: 'automation',    label: 'Automation',         icon: '⚡' },
  { id: 'scheduling',    label: 'Scheduling',         icon: '🗓️' },
  { id: 'chatbot',       label: 'Chatbot',            icon: '🤖' },
];

export default function ProcessPage() {
  const { departmentId, processId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  const dept = departments.find((d) => d.id === departmentId);
  if (!dept) return <Navigate to="/" replace />;

  const processes = departmentProcesses[departmentId] || [];
  const process = processes.find((p) => p.id === processId);
  if (!process) return <Navigate to={`/${departmentId}`} replace />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Dashboard</Link>
            <span>›</span>
            <Link to={`/${departmentId}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{dept.name}</Link>
            <span>›</span>
            <span style={{ color: 'var(--text-secondary)' }}>{process.name}</span>
          </div>
          <div className="page-title">{dept.icon} {process.name}</div>
          <div className="page-subtitle">{process.description}</div>
        </div>
        <div className="page-header-right">
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {process.aiTypes.map((t) => (
              <span key={t} className={`ai-badge ai-badge-${t.toLowerCase().replace(' ', '')}`}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--spacing-md)', padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
        <span><strong>KPI:</strong> {process.kpi}</span>
        <span><strong>Route:</strong> /{departmentId}/{processId}</span>
      </div>

      <div className="tabs-container">
        <div className="tabs-bar" style={{ overflowX: 'auto', whiteSpace: 'nowrap', scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch', position: 'sticky', top: 'var(--topbar-height)', zIndex: 50, background: 'var(--bg-page)', paddingBottom: 2, borderBottom: '2px solid var(--border-color)' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-item${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ flexShrink: 0 }}
            >
              <span className="tab-item-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          <div className={`tab-panel${activeTab === 'overview' ? ' active has-padding' : ''}`}>
            <ProcessOverviewTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'workbench' ? ' active has-padding' : ''}`}>
            <ProcessWorkbenchTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'problem' ? ' active has-padding' : ''}`}>
            <ProcessProblemTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'data' ? ' active has-padding' : ''}`}>
            <ProcessDataTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'datapipeline' ? ' active has-padding' : ''}`}>
            <ProcessDataPipelineTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'databases' ? ' active has-padding' : ''}`}>
            <ProcessDatabaseTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'models' ? ' active has-padding' : ''}`}>
            <ProcessModelsTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'testing' ? ' active has-padding' : ''}`}>
            <ProcessTestingTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'feedback' ? ' active has-padding' : ''}`}>
            <ProcessFeedbackTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'simulation' ? ' active has-padding' : ''}`}>
            <ProcessSimulationTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'governance' ? ' active has-padding' : ''}`}>
            <ProcessGovernanceTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'docs' ? ' active has-padding' : ''}`}>
            <ProcessDocsTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'demos' ? ' active has-padding' : ''}`}>
            <ProcessDemoTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'automation' ? ' active has-padding' : ''}`}>
            <ProcessAutomationTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'accuracy' ? ' active has-padding' : ''}`}>
            <ProcessAccuracyTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'analysis' ? ' active has-padding' : ''}`}>
            <ProcessAnalysisTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'mathematics' ? ' active has-padding' : ''}`}>
            <ProcessMathTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'aiinfra' ? ' active has-padding' : ''}`}>
            <ProcessAIInfraTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'strategy' ? ' active has-padding' : ''}`}>
            <ProcessStrategyTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'reports' ? ' active has-padding' : ''}`}>
            <ProcessReportsTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'scheduling' ? ' active has-padding' : ''}`}>
            <ProcessSchedulingTab process={process} dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'chatbot' ? ' active has-padding' : ''}`}>
            <ProcessChatbotTab process={process} dept={dept} />
          </div>
        </div>
      </div>
    </div>
  );
}
