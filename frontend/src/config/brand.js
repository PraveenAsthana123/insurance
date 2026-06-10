// brand.js — Reads the single-source-of-truth config from /config/brand.config.json
//
// This is the ONLY file (alongside data/departments.js) that touches the
// raw JSON. Every other component imports from here.
//
// To change branding / departments / industry: edit /config/brand.config.json.
// Do NOT hand-edit this file's defaults.

import brandConfig from '../../../config/brand.config.json';

export const brand = brandConfig.brand;
export const industry = brandConfig.industry;
export const labels = brandConfig.labels;

// Sorted department list (priority asc, ties broken by array order).
export const rawDepartments = [...brandConfig.departments].sort(
  (a, b) => (a.priority ?? 999) - (b.priority ?? 999)
);

// Convenience accessors used by Dashboard / Layout / DepartmentPage.
export const dashboardEntry = rawDepartments.find((d) => d.id === 'dashboard');
export const operationalDepartments = rawDepartments.filter((d) => d.id !== 'dashboard');
export const priorityDepartment =
  operationalDepartments.find((d) => d.id === industry.priorityDepartmentId) ||
  operationalDepartments[0];

// Aggregates the Dashboard KPI tiles use.
export const totals = {
  departments: operationalDepartments.length,
  processes: operationalDepartments.reduce((s, d) => s + (d.processCount || 0), 0),
  aiTypes: [...new Set(operationalDepartments.flatMap((d) => d.aiTypes || []))],
  datasets: operationalDepartments.filter((d) => d.kaggleDataset).length,
};

export default {
  brand,
  industry,
  labels,
  rawDepartments,
  operationalDepartments,
  priorityDepartment,
  totals,
};
