// supplyChainApi.js — thin fetch client for /api/v1/supply-chain/*
// Mirrors salesApi.js; uses the shared apiFetch wrapper so every call carries
// X-Demo-Role (Phase η demo-mode RBAC).

import { apiFetch } from './apiFetch';

export async function listSkus() {
  return apiFetch('/api/v1/supply-chain/skus');
}

export async function listSuppliers() {
  return apiFetch('/api/v1/supply-chain/suppliers');
}

export async function getStockoutRisk({ skuId }) {
  return apiFetch('/api/v1/supply-chain/stockout-risk', {
    method: 'POST',
    body: JSON.stringify({ sku_id: skuId }),
  });
}

export async function getEta({ skuId, mode }) {
  const body = { sku_id: skuId };
  if (mode) body.transportation_mode = mode;
  return apiFetch('/api/v1/supply-chain/eta', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function simulate({ supplierId, delayDays, affectedSkuCount }) {
  return apiFetch('/api/v1/supply-chain/simulate', {
    method: 'POST',
    body: JSON.stringify({
      supplier_id: supplierId,
      delay_days: delayDays,
      affected_sku_count: affectedSkuCount,
    }),
  });
}
