import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { departments } from '../data/departments';
import UsersRolesTab from '../components/admin-tabs/UsersRolesTab';
import PermissionsTab from '../components/admin-tabs/PermissionsTab';
import IntegrationsTab from '../components/admin-tabs/IntegrationsTab';
import MCPServersTab from '../components/admin-tabs/MCPServersTab';
import ModelRegistryTab from '../components/admin-tabs/ModelRegistryTab';
import AIUseCasesTab from '../components/admin-tabs/AIUseCasesTab';
import WorkflowsTab from '../components/admin-tabs/WorkflowsTab';
import ScheduledJobsTab from '../components/admin-tabs/ScheduledJobsTab';
import AuditLogTab from '../components/admin-tabs/AuditLogTab';
import SettingsTab from '../components/admin-tabs/SettingsTab';
import OverrideAnalyticsTab from '../components/admin-tabs/OverrideAnalyticsTab';
import LifecyclesTab from '../components/admin-tabs/LifecyclesTab';
import ManagerArchetypesTab from '../components/admin-tabs/ManagerArchetypesTab';

const TABS = [
  { id: 'users-roles',         label: 'Users & Roles',       icon: '👥',  Component: UsersRolesTab        },
  { id: 'permissions',         label: 'Permissions',         icon: '🔐',  Component: PermissionsTab       },
  { id: 'integrations',        label: 'Integrations',        icon: '🔌',  Component: IntegrationsTab      },
  { id: 'mcp-servers',         label: 'MCP Servers',         icon: '🧠',  Component: MCPServersTab        },
  { id: 'model-registry',      label: 'Model Registry',      icon: '📦',  Component: ModelRegistryTab     },
  { id: 'ai-use-cases',        label: 'AI Use Cases',        icon: '🤖',  Component: AIUseCasesTab        },
  { id: 'workflows',           label: 'Workflows',           icon: '🔁',  Component: WorkflowsTab         },
  { id: 'scheduled-jobs',      label: 'Scheduled Jobs',      icon: '⏰',  Component: ScheduledJobsTab     },
  { id: 'audit-log',           label: 'Audit Log',           icon: '📜',  Component: AuditLogTab          },
  { id: 'settings',            label: 'Settings',            icon: '⚙️',  Component: SettingsTab          },
  { id: 'override-analytics',  label: 'Override Analytics',  icon: '⚖️',  Component: OverrideAnalyticsTab },
  { id: 'lifecycles',          label: 'Lifecycles',          icon: '🔄',  Component: LifecyclesTab        },
  { id: 'manager-archetypes',  label: 'Manager Archetypes',  icon: '👥',  Component: ManagerArchetypesTab },
];

export default function AdminPage() {
  const { departmentId } = useParams();
  const [activeTab, setActiveTab] = useState('users-roles');
  const dept = departments.find((d) => d.id === departmentId);
  if (!dept || dept.id === 'dashboard') return <Navigate to="/" replace />;

  const Active = TABS.find((t) => t.id === activeTab).Component;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">⚙️ {dept.name} — Admin</div>
          <div className="page-subtitle">Administration, governance, and configuration for the {dept.name} department</div>
        </div>
        <div className="page-header-right">
          <span style={{
            padding: '6px 16px', borderRadius: 'var(--border-radius-lg)',
            background: `${dept.color}15`, border: `1px solid ${dept.color}33`,
            color: dept.color, fontSize: 'var(--font-size-sm)', fontWeight: 600,
          }}>
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
