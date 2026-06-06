import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const DOMAINS = ['B2C', 'B2B', 'B2E'];

function processIdOf(p) {
  return (p?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function domainsForProcess(process, dept) {
  const explicit = process.channels || process.domains || process.business_domains || process.audiences;
  if (Array.isArray(explicit) && explicit.length > 0) {
    return explicit.map((domain) => String(domain).toUpperCase());
  }
  const deptDomains = DOMAINS.filter((domain) => dept.channel_scenarios?.[domain]);
  return deptDomains.length > 0 ? deptDomains : DOMAINS;
}

export function InsuranceSubMenu({ bp }) {
  const navigate = useNavigate();
  const params = useParams();
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(() => {
    const initial = {};
    if (params.deptId) initial[`dept:${params.deptId}`] = true;
    if (params.deptId && params.domain) initial[`domain:${params.deptId}:${params.domain}`] = true;
    return initial;
  });
  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const departments = (bp.department_catalog || []).slice().sort((a, b) => a.id - b.id);
  const q = filter.trim().toLowerCase();
  const totalProcesses = departments.reduce((sum, dept) => sum + (dept.processes || []).length, 0);

  return (
    <nav className="insurance-sub-menu" aria-label="Sub menu: Department domain process list">
      <div className="insurance-main-menu-header">Department processes</div>
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter departments / processes..."
        style={{
          width: '100%', marginBottom: 'var(--spacing-xs)',
          padding: '4px 8px',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-sm)',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          fontSize: 'var(--font-size-xs)',
          font: 'inherit',
        }}
        aria-label="Filter departments or processes"
      />
      <div style={{ padding: '0 var(--spacing-sm) var(--spacing-xs)', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
        {departments.length} departments · {totalProcesses} processes
      </div>

      {departments.map((dept) => {
        const deptKey = `dept:${dept.id}`;
        const deptNameMatches = !q || (dept.name || '').toLowerCase().includes(q) || `dept ${dept.id}`.includes(q);
        const processes = (dept.processes || []).filter((process) =>
          !q || deptNameMatches || (process.name || '').toLowerCase().includes(q) ||
          (process.ai || []).some((ai) => (ai.ai_type || '').toLowerCase().includes(q))
        );
        const showDept = deptNameMatches || processes.length > 0;
        const deptOpen = expanded[deptKey] || params.deptId === String(dept.id) || q;
        const activeDept = params.deptId === String(dept.id);

        if (!showDept) return null;

        return (
          <div key={dept.id}>
            <span
              className={`insurance-process-row ${activeDept ? 'active' : ''}`}
              onClick={() => toggle(deptKey)}
              role="button"
              aria-expanded={deptOpen}
              style={{ paddingLeft: 8, fontWeight: 700 }}
              title={dept.name}
            >
              <span style={{ marginRight: 4 }}>{deptOpen ? '▾' : '▸'}</span>
              <strong>#{dept.id}</strong> {dept.name}
            </span>

            {deptOpen && DOMAINS.map((domain) => {
              const domainKey = `domain:${dept.id}:${domain}`;
              const domainOpen = expanded[domainKey] || (params.deptId === String(dept.id) && params.domain === domain) || q;
              const activeDomain = params.deptId === String(dept.id) && params.domain === domain;
              const hasDomain = dept.channel_scenarios && dept.channel_scenarios[domain];
              const domainProcesses = processes.filter((process) => domainsForProcess(process, dept).includes(domain));

              return (
                <div key={domain}>
                  <span
                    className={`insurance-subprocess-row ${activeDomain ? 'active' : ''}`}
                    onClick={() => toggle(domainKey)}
                    role="button"
                    aria-expanded={domainOpen}
                    style={{ paddingLeft: 24, opacity: hasDomain ? 1 : 0.55 }}
                    title={hasDomain ? dept.channel_scenarios[domain].label : `${domain} (no operator content yet)`}
                  >
                    <span style={{ marginRight: 4 }}>{domainOpen ? '▾' : '▸'}</span>
                    {domain} <span style={{ fontSize: 10 }}>({domainProcesses.length})</span>
                  </span>

                  {domainOpen && domainProcesses.map((process, index) => {
                    const pid = processIdOf(process) || `p${index}`;
                    const activeProcess = params.deptId === String(dept.id) && params.domain === domain && params.processId === pid;
                    const aiCount = (process.ai || []).length;
                    return (
                      <span
                        key={`${domain}-${pid}`}
                        className={`insurance-process-row ${activeProcess ? 'active' : ''}`}
                        onClick={() => navigate(`/insurance/${dept.id}/${domain}/${pid}`)}
                        style={{ paddingLeft: 42 }}
                        title={process.name}
                      >
                        {process.name}
                        {aiCount > 0 && (
                          <span style={{ marginLeft: 4, fontSize: '10px', color: activeProcess ? '#fff' : 'var(--text-muted)' }}>
                            ({aiCount} AI)
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
