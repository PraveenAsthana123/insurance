// reports.js — 28 report types. Tagged by role; rendered via common ReportCard (Phase 2).

export const REPORT_CATEGORIES = ['dashboard', 'report', 'scorecard', 'compliance', 'monitoring', 'operational', 'audit', 'ai-governance'];

export const reportTypes = [
  // Manager (7)
  { id: 'exec-kpi',             name: 'Executive KPI Dashboard',     role: 'manager',              category: 'dashboard'   },
  { id: 'mbr',                  name: 'Monthly Business Review',      role: 'manager',              category: 'report'      },
  { id: 'team-scorecard',       name: 'Team Performance Scorecard',   role: 'manager',              category: 'scorecard'   },
  { id: 'budget-vs-actuals',    name: 'Budget vs Actuals',            role: 'manager',              category: 'report'      },
  { id: 'sla-summary',          name: 'SLA Compliance Summary',       role: 'manager',              category: 'compliance'  },
  { id: 'roi-tracker',          name: 'ROI Tracker',                  role: 'manager',              category: 'dashboard'   },
  { id: 'pipeline-health',      name: 'Pipeline Health',              role: 'manager',              category: 'monitoring'  },

  // Team Member (4)
  { id: 'my-tasks',             name: 'My Tasks / Work Queue',        role: 'team-member',          category: 'operational' },
  { id: 'daily-productivity',   name: 'Daily Productivity',           role: 'team-member',          category: 'operational' },
  { id: 'personal-scorecard',   name: 'Personal Scorecard',           role: 'team-member',          category: 'scorecard'   },
  { id: 'assigned-incidents',   name: 'Assigned Incidents',           role: 'team-member',          category: 'monitoring'  },

  // Compliance (6)
  { id: 'audit-trail',          name: 'Audit Trail',                  role: 'compliance',           category: 'audit'          },
  { id: 'regulatory-checklist', name: 'Regulatory Compliance',        role: 'compliance',           category: 'compliance'     },
  { id: 'policy-violations',    name: 'Policy Violations',            role: 'compliance',           category: 'audit'          },
  { id: 'model-fairness',       name: 'Model Fairness & Bias',        role: 'compliance',           category: 'ai-governance'  },
  { id: 'pii-access',           name: 'PII Access Log',               role: 'compliance',           category: 'audit'          },
  { id: 'change-mgmt',          name: 'Change Management Log',        role: 'compliance',           category: 'audit'          },

  // Reporting & Monitoring (6)
  { id: 'system-health',        name: 'System Health Dashboard',      role: 'reporting-monitoring', category: 'monitoring' },
  { id: 'model-drift',          name: 'Model Drift & Accuracy',       role: 'reporting-monitoring', category: 'monitoring' },
  { id: 'pipeline-status',      name: 'Data Pipeline Status',         role: 'reporting-monitoring', category: 'monitoring' },
  { id: 'anomaly-detection',    name: 'Anomaly Detection',            role: 'reporting-monitoring', category: 'monitoring' },
  { id: 'scheduled-jobs',       name: 'Scheduled Job Status',         role: 'reporting-monitoring', category: 'monitoring' },
  { id: 'api-latency',          name: 'API Usage & Latency',          role: 'reporting-monitoring', category: 'monitoring' },

  // Tester (5) — Phase ζ
  { id: 'regression-test-coverage', name: 'Regression Test Coverage', role: 'tester',           category: 'monitoring'  },
  { id: 'defect-log',               name: 'Defect Log',                role: 'tester',           category: 'operational' },
  { id: 'test-run-history',         name: 'Test Run History',          role: 'tester',           category: 'operational' },
  { id: 'smoke-test-status',        name: 'Release Smoke Test Status', role: 'tester',           category: 'monitoring'  },
  { id: 'automation-coverage',      name: 'Automation Coverage',       role: 'tester',           category: 'scorecard'   },
];

export function getReportsByRole(roleId) {
  return reportTypes.filter((r) => r.role === roleId);
}

export function getReportById(id) {
  return reportTypes.find((r) => r.id === id);
}
