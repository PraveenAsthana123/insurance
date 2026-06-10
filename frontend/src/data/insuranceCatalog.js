// insuranceCatalog.js — Reads the deep tree emitted by
// config/build_insurance_catalog.py. Single import point for the catalog
// page + downstream components. Do NOT hand-edit; edit the Python source.

import catalog from '../../../config/insurance.catalog.json';
import aiCaps from '../../../config/ai_capabilities.json';
import stakeholders from '../../../config/stakeholders.json';

export const departments = (catalog.departments || []).slice().sort(
  (a, b) => (a.priority ?? 999) - (b.priority ?? 999)
);

// Lookup tables keyed by id for fast resolution in the UI.
export const aiCapabilityById = Object.fromEntries(
  (aiCaps.capabilities || []).map((c) => [c.id, c])
);

export const stakeholderByRole = Object.fromEntries(
  (stakeholders.stakeholders || []).map((s) => [s.role, s])
);

// Aggregates used by the management scoreboard.
export const totals = {
  departments: departments.length,
  processes: departments.reduce((s, d) => s + (d.processes?.length || 0), 0),
  subProcesses: departments.reduce(
    (s, d) => s + (d.processes || []).reduce((ss, p) => ss + (p.subProcesses?.length || 0), 0),
    0
  ),
  aiCapabilities: (aiCaps.capabilities || []).length,
  stakeholders: (stakeholders.stakeholders || []).length,
  dataFiles: departments.reduce(
    (s, d) => s + (d.processes || []).reduce((ss, p) => ss + (p.dataSamples?.length || 0), 0),
    0
  ),
};

// Sankey-friendly edges: every dept → every AI family it uses.
export const deptToFamilyEdges = (() => {
  const edges = new Map();
  for (const d of departments) {
    for (const capId of d.aiCapabilities || []) {
      const cap = aiCapabilityById[capId];
      if (!cap) continue;
      const key = `${d.id}|${cap.family}`;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  return [...edges.entries()].map(([k, v]) => {
    const [deptId, family] = k.split('|');
    return { source: deptId, target: family, value: v };
  });
})();

// Channel mix per dept (counts of processes per B2B/B2C/B2E).
export const channelMixByDept = departments.map((d) => {
  const c = { id: d.id, name: d.name, color: d.color, B2B: 0, B2C: 0, B2E: 0 };
  for (const p of d.processes || []) {
    for (const ch of p.channels || []) {
      if (ch in c) c[ch] += 1;
    }
  }
  return c;
});

export default { departments, aiCapabilityById, stakeholderByRole, totals, deptToFamilyEdges, channelMixByDept };
