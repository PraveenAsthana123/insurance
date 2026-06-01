import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { departments } from '../data/departments';
import OverviewTab from '../components/dept-tabs/OverviewTab';
import ProcessesTab from '../components/dept-tabs/ProcessesTab';
import AIStackTab from '../components/dept-tabs/AIStackTab';
import DataTab from '../components/dept-tabs/DataTab';
import ModelsTab from '../components/dept-tabs/ModelsTab';
import ROITab from '../components/dept-tabs/ROITab';
import SchedulingTab from '../components/dept-tabs/SchedulingTab';
import DepartmentChatbot from '../components/DepartmentChatbot';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'processes', label: 'Processes', icon: '⚙️' },
  { id: 'ai-stack', label: 'AI Stack', icon: '🤖' },
  { id: 'data', label: 'Data', icon: '🗂️' },
  { id: 'models', label: 'Models', icon: '🧠' },
  { id: 'roi', label: 'ROI', icon: '💰' },
  { id: 'scheduling', label: 'Scheduling', icon: '🗓️' },
  { id: 'chatbot', label: 'Chatbot', icon: '💬' },
];

export default function DepartmentPage() {
  const { departmentId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  const dept = departments.find((d) => d.id === departmentId);
  if (!dept || dept.id === 'dashboard') return <Navigate to="/" replace />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">{dept.icon} {dept.name}</div>
          <div className="page-subtitle">{dept.description}</div>
        </div>
        <div className="page-header-right">
          <span style={{
            padding: '6px 16px', borderRadius: 'var(--border-radius-lg)',
            background: `${dept.color}15`, border: `1px solid ${dept.color}33`,
            color: dept.color, fontSize: 'var(--font-size-sm)', fontWeight: 600
          }}>
            {dept.processCount} Processes
          </span>
          <span style={{
            padding: '6px 16px', borderRadius: 'var(--border-radius-lg)',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
            color: 'var(--accent-success)', fontSize: 'var(--font-size-sm)', fontWeight: 600
          }}>
            {dept.roi}
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
          <div className={`tab-panel${activeTab === 'overview' ? ' active has-padding' : ''}`}>
            <OverviewTab dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'processes' ? ' active has-padding' : ''}`}>
            <ProcessesTab dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'ai-stack' ? ' active has-padding' : ''}`}>
            <AIStackTab dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'data' ? ' active has-padding' : ''}`}>
            <DataTab dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'models' ? ' active has-padding' : ''}`}>
            <ModelsTab dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'roi' ? ' active has-padding' : ''}`}>
            <ROITab dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'scheduling' ? ' active has-padding' : ''}`}>
            <SchedulingTab dept={dept} />
          </div>
          <div className={`tab-panel${activeTab === 'chatbot' ? ' active has-padding' : ''}`}>
            <DepartmentChatbot dept={dept} />
          </div>
        </div>
      </div>
    </div>
  );
}
