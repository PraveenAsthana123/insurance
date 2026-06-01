// overrideEvents.js — deterministic synthetic override / RBAC denial / rejection events.
// Seeded from crypto-weak hash so table is stable across renders and screenshots.
// Real backend-fed version ships when structured logs land in Postgres (Phase 3b).

import { hashString } from '../utils/seed';

const DEPTS = [
  'sales',
  'supply-chain',
  'marketing',
  'customer',
  'finance',
  'manufacturing',
  'retail',
  'hr',
];

const EVENT_TYPES = [
  'rbac.denied',
  'decision.overridden',
  'decision.rejected',
  'policy.violation',
];

const ROLES = ['team-member', 'compliance', 'reporting-monitoring'];

const REASONS = [
  'Confidence below threshold',
  'Policy exception approved',
  'Data source flagged stale',
  'Conflicting supplier contract',
  'Manager preference override',
  'Exception requested by customer',
];

export function generateOverrideEvents(n = 50) {
  const events = [];
  const now = Date.now();
  for (let i = 0; i < n; i += 1) {
    const seed = hashString(`override-${i}`);
    const dept = DEPTS[seed % DEPTS.length];
    const type = EVENT_TYPES[(seed >> 3) % EVENT_TYPES.length];
    const role = ROLES[(seed >> 6) % ROLES.length];
    const reason = REASONS[(seed >> 9) % REASONS.length];
    const agoMinutes = seed % 10080; // up to 7 days
    events.push({
      id: `evt-${i.toString().padStart(4, '0')}`,
      timestamp: new Date(now - agoMinutes * 60_000).toISOString(),
      dept,
      type,
      role,
      reason,
      correlation_id: `cid-${seed.toString(16).padStart(12, '0').slice(0, 12)}`,
    });
  }
  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export const OVERRIDE_EVENT_TYPES = EVENT_TYPES;
export const OVERRIDE_DEPTS = DEPTS;
