import { useParams, useLocation } from 'react-router-dom';
import { departments } from '../data/departments';
import { departmentProcesses } from '../data/processes';
import RoleSelector from './RoleSelector';
import '../styles/topbar.css';

export default function Topbar() {
  const { departmentId, processId } = useParams();
  const location = useLocation();

  const dept = departments.find((d) => d.id === departmentId);
  const processes = departmentId ? (departmentProcesses[departmentId] || []) : [];
  const process = processId ? processes.find((p) => p.id === processId) : null;

  const isHome = location.pathname === '/';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-breadcrumb">
          <span>🏭</span>
          <span className="topbar-breadcrumb-sep">/</span>
          {isHome ? (
            <span className="topbar-dept-name">Dashboard</span>
          ) : dept ? (
            <>
              <span>{dept.icon}</span>
              <span className="topbar-dept-name">{dept.name}</span>
              {process && (
                <>
                  <span className="topbar-breadcrumb-sep">/</span>
                  <span className="topbar-page-title">{process.name}</span>
                </>
              )}
            </>
          ) : (
            <span className="topbar-page-title">HOLY Analytics</span>
          )}
        </div>
      </div>

      <div className="topbar-right">
        <div className="dept-chips">
          <span className="dept-chip">11 Depts</span>
          <span className="dept-chip">120+ Processes</span>
          <span className="dept-chip">8 AI Types</span>
        </div>
        <div className="topbar-divider" />
        <RoleSelector />
        <div className="topbar-divider" />
        <span className="topbar-badge badge-success">
          <span className="status-dot" />
          Live
        </span>
        <div className="topbar-divider" />
        <div className="topbar-user">
          <div className="topbar-avatar">AI</div>
          <span className="topbar-user-name">HOLY Admin</span>
        </div>
      </div>
    </header>
  );
}
