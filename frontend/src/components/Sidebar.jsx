import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { departments } from '../data/departments';
import { departmentProcesses } from '../data/processes';
import {
  aiAssuranceFrameworks,
  aiAssuranceHorizontals,
  mlMethodologyPhases,
  digitalTransformationDocs,
} from '../data/catalogIndex';
import '../styles/sidebar.css';

// Three sibling catalogs surfaced as expandable sidebar groups.
// Per operator directive: each phase gets a sidebar sub-link;
// each link opens a 3-tab page (Visibility / Dashboard / Report).
const CATALOG_GROUPS = [
  {
    id: 'ai_assurance',
    label: 'AI Assurance',
    icon: '🛡️',
    accent: '#3b82f6',
    items: [
      ...aiAssuranceFrameworks.map((f) => ({ code: f.code, name: f.name, idLabel: `#${f.id}` })),
      ...aiAssuranceHorizontals.map((h) => ({ code: h.code, name: h.name, idLabel: 'H' })),
    ],
  },
  {
    id: 'ml_methodology',
    label: 'ML Methodology',
    icon: '🧪',
    accent: '#10b981',
    items: mlMethodologyPhases.map((p) => ({ code: p.code, name: p.name, idLabel: `#${p.id}` })),
  },
  {
    id: 'digital_transformation',
    label: 'Digital Transformation',
    icon: '🏗️',
    accent: '#f59e0b',
    items: digitalTransformationDocs.map((d) => ({ code: d.code, name: d.name, idLabel: d.kind === 'checklist' ? 'CL' : 'PC' })),
  },
];

export default function Sidebar() {
  const location = useLocation();
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (deptId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  // Auto-expand if current path matches a department
  const currentDeptId = location.pathname.split('/')[1] || '';

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-header">
        <div className="sidebar-logo">HOLY</div>
        <div>
          <div className="sidebar-title">HOLY Analytics</div>
          <div style={{ fontSize: '10px', color: 'rgba(226,232,240,0.45)', marginTop: '1px' }}>AI Platform</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/agent-supervisor"
          className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
        >
          <span className="nav-item-icon">▣</span>
          <span className="nav-item-label">Agent Supervisor</span>
        </NavLink>

        <NavLink
          to="/chart-showcase"
          className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
        >
          <span className="nav-item-icon">📊</span>
          <span className="nav-item-label">Chart Showcase</span>
        </NavLink>

        <NavLink
          to="/catalogs"
          className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
        >
          <span className="nav-item-icon">📚</span>
          <span className="nav-item-label">Catalogs</span>
        </NavLink>

        <NavLink
          to="/admin/tenants"
          className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
        >
          <span className="nav-item-icon">🏢</span>
          <span className="nav-item-label">Tenants &amp; Depts</span>
        </NavLink>

        <NavLink
          to="/data-explorer"
          className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
        >
          <span className="nav-item-icon">🔍</span>
          <span className="nav-item-label">Data Explorer</span>
        </NavLink>

        {/* Three catalog groups with per-phase sub-links */}
        {CATALOG_GROUPS.map((group) => {
          const expandKey = `_catalog_${group.id}`;
          const groupActive = location.pathname.startsWith(`/catalogs/${group.id}`);
          const isExpanded = expanded[expandKey] || groupActive;
          return (
            <div key={group.id} className="nav-group">
              <div
                className={'nav-item nav-item-parent' + (groupActive ? ' active' : '')}
                onClick={(e) => toggleExpand(expandKey, e)}
                style={{ cursor: 'pointer' }}
              >
                <span className="nav-item-icon">{group.icon}</span>
                <span className="nav-item-label">{group.label}</span>
                <span className={'nav-expand-arrow' + (isExpanded ? ' expanded' : '')}>&#9662;</span>
              </div>
              {isExpanded && (
                <div className="nav-subitems">
                  {group.items.map((it) => (
                    <NavLink
                      key={it.code}
                      to={`/catalogs/${group.id}/${it.code}`}
                      className={({ isActive }) => 'nav-subitem' + (isActive ? ' active' : '')}
                      title={it.name}
                    >
                      <span
                        className="nav-subitem-dot"
                        style={{ background: group.accent, borderRadius: 2, width: 16, textAlign: 'center', fontSize: 9, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}
                      >
                        {it.idLabel}
                      </span>
                      <span
                        className="nav-subitem-label"
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}
                      >
                        {it.name}
                      </span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {departments.map((dept) => {
          const processes = dept.id !== 'dashboard' ? (departmentProcesses[dept.id] || []) : [];
          const hasProcesses = processes.length > 0;
          const isExpanded = expanded[dept.id] || currentDeptId === dept.id;
          const isDeptActive = location.pathname === dept.route || location.pathname.startsWith(`/${dept.id}/`);

          if (dept.id === 'dashboard') {
            return (
              <NavLink
                key={dept.id}
                to={dept.route}
                end
                className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
              >
                <span className="nav-item-icon">{dept.icon}</span>
                <span className="nav-item-label">{dept.name}</span>
              </NavLink>
            );
          }

          return (
            <div key={dept.id} className="nav-group">
              <div
                className={'nav-item nav-item-parent' + (isDeptActive ? ' active' : '')}
                onClick={(e) => toggleExpand(dept.id, e)}
              >
                <span className="nav-item-icon">{dept.icon}</span>
                <NavLink
                  to={dept.route}
                  className="nav-item-label"
                  onClick={(e) => e.stopPropagation()}
                >
                  {dept.name}
                </NavLink>
                <span className={'nav-expand-arrow' + (isExpanded ? ' expanded' : '')}>
                  &#9662;
                </span>
              </div>

              {isExpanded && (
                <div className="nav-subitems">
                  <NavLink
                    to={`/${dept.id}/admin`}
                    className={({ isActive }) => 'nav-subitem nav-subitem-admin' + (isActive ? ' active' : '')}
                  >
                    <span className="nav-subitem-icon">⚙️</span>
                    <span className="nav-subitem-label">Admin</span>
                  </NavLink>
                  <NavLink
                    to={`/${dept.id}/manager`}
                    className={({ isActive }) => 'nav-subitem nav-subitem-manager' + (isActive ? ' active' : '')}
                  >
                    <span className="nav-subitem-icon">📊</span>
                    <span className="nav-subitem-label">Manager</span>
                  </NavLink>
                  <NavLink
                    to={`/${dept.id}/tester`}
                    className={({ isActive }) => 'nav-subitem nav-subitem-tester' + (isActive ? ' active' : '')}
                  >
                    <span className="nav-subitem-icon">🧪</span>
                    <span className="nav-subitem-label">Tester</span>
                  </NavLink>
                  {dept.id === 'sales' && (
                    <NavLink
                      to={`/${dept.id}/dossier`}
                      className={({ isActive }) => 'nav-subitem nav-subitem-dossier' + (isActive ? ' active' : '')}
                    >
                      <span className="nav-subitem-icon">⭐</span>
                      <span className="nav-subitem-label">Dossier</span>
                    </NavLink>
                  )}
                  {hasProcesses && <div className="nav-subitem-divider" />}
                  {processes.map((proc) => (
                    <NavLink
                      key={proc.id}
                      to={`/${dept.id}/${proc.id}`}
                      className={({ isActive }) => 'nav-subitem' + (isActive ? ' active' : '')}
                    >
                      <span className="nav-subitem-dot"></span>
                      <span className="nav-subitem-label">{proc.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-version">v1.0.0 · 11 Depts · 120+ Processes</div>
        <div style={{ textAlign: 'center' }}>
          <span className="sidebar-env">PRODUCTION</span>
        </div>
      </div>
    </aside>
  );
}
