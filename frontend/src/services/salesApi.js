// salesApi.js — thin fetch client for /api/v1/sales/*
// Uses the shared apiFetch wrapper so every call carries X-Demo-Role
// (Phase η demo-mode RBAC).

import { apiFetch } from './apiFetch';

export async function listStores() {
  return apiFetch('/api/v1/sales/stores');
}

export async function getForecast(storeId, horizonDays = 56) {
  return apiFetch('/api/v1/sales/forecast', {
    method: 'POST',
    body: JSON.stringify({ store_id: storeId, horizon_days: horizonDays }),
  });
}

export async function simulate({ storeId, discountPct, durationDays }) {
  return apiFetch('/api/v1/sales/simulate', {
    method: 'POST',
    body: JSON.stringify({
      store_id: storeId,
      discount_pct: discountPct,
      duration_days: durationDays,
    }),
  });
}
