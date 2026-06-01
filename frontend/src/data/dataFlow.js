// dataFlow.js — Business data flows between departments.
// Drives cross-dept flow viz in Manager page (Phase 4) and global DataFlowPage.

export const dataFlowEdges = [
  { from: 'retail',          to: 'sales',           entity: 'POS transactions',             schedule: 'hourly',    sla: '< 5 min lag' },
  { from: 'retail',          to: 'marketing',       entity: 'SKU-level conversions',        schedule: 'daily',     sla: '06:00 UTC'   },
  { from: 'sales',           to: 'finance',         entity: 'revenue by SKU',               schedule: 'daily',     sla: 'EOD + 1h'    },
  { from: 'sales',           to: 'marketing',       entity: 'deal outcomes',                schedule: 'hourly',    sla: '< 15 min'    },
  { from: 'customer',        to: 'marketing',       entity: 'segment scores',               schedule: 'nightly',   sla: '05:00 UTC'   },
  { from: 'customer',        to: 'contact-center',  entity: 'customer 360 profile',         schedule: 'on-demand', sla: '< 2 sec'     },
  { from: 'contact-center',  to: 'customer',        entity: 'sentiment + tickets',          schedule: 'real-time', sla: '< 1 min'     },
  { from: 'contact-center',  to: 'marketing',       entity: 'NPS + CSAT feedback',          schedule: 'daily',     sla: '04:00 UTC'   },
  { from: 'marketing',       to: 'sales',           entity: 'MQLs with intent signal',      schedule: 'hourly',    sla: '< 15 min'    },
  { from: 'marketing',       to: 'customer',        entity: 'campaign engagement',          schedule: 'hourly',    sla: '< 30 min'    },
  { from: 'supply-chain',    to: 'retail',          entity: 'stock levels by store',        schedule: 'hourly',    sla: '< 10 min'    },
  { from: 'supply-chain',    to: 'sales',           entity: 'ATP (available-to-promise)',   schedule: 'real-time', sla: '< 30 sec'    },
  { from: 'logistics',       to: 'supply-chain',    entity: 'ETA predictions',              schedule: 'hourly',    sla: '< 15 min'    },
  { from: 'manufacturing',   to: 'supply-chain',    entity: 'production completes',         schedule: 'shift',     sla: 'end-of-shift'},
  { from: 'maintenance',     to: 'manufacturing',   entity: 'equipment health alerts',      schedule: 'real-time', sla: '< 1 min'     },
  { from: 'quality',         to: 'manufacturing',   entity: 'defect trends',                schedule: 'daily',     sla: '02:00 UTC'   },
  { from: 'telehealth',      to: 'customer',        entity: 'care encounter summaries',     schedule: 'real-time', sla: '< 5 min'     },
  { from: 'governance',      to: 'contact-center',  entity: 'agent roster + skills',        schedule: 'daily',     sla: '03:00 UTC'   },
  { from: 'finance',         to: 'marketing',       entity: 'campaign budget actuals',      schedule: 'daily',     sla: '07:00 UTC'   },
  { from: 'sales',           to: 'supply-chain',    entity: 'SKU demand forecast',          schedule: 'weekly',    sla: 'Mon 03:00'   },
];

export function getInboundEdges(deptId) {
  return dataFlowEdges.filter((e) => e.to === deptId);
}

export function getOutboundEdges(deptId) {
  return dataFlowEdges.filter((e) => e.from === deptId);
}
