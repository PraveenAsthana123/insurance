// customerApi.js — thin fetch client for /api/v1/customer/*
// Part of the Customer Analytics depth-pilot. Only ChurnRiskTab consumes
// these helpers; other department tabs keep their existing patterns.

import { apiFetch } from './apiFetch';

export async function getChurnTop(n = 20) {
  return apiFetch(`/api/v1/customer/churn-top?n=${n}`);
}

export async function getChurnMetrics() {
  return apiFetch('/api/v1/customer/churn-metrics');
}

export async function predictChurn(customerId) {
  return apiFetch('/api/v1/customer/churn-predict', {
    method: 'POST',
    body: JSON.stringify({ customer_id: customerId }),
  });
}
