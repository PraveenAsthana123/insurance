// Phase 1 — Smoke test. 1-10 VU, 1 min, sanity check (no errors).
// Per global §47.10.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:8001';
const TENANT = __ENV.TENANT_ID || 'loadtest-tenant';

export const options = {
    vus: 1,
    duration: '60s',
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<500'],
    },
};

const headers = { 'X-Tenant-ID': TENANT };

export default function () {
    const endpoints = [
        '/api/health',
        '/api/v1/insurance/depts',
        '/api/v1/insurance/depts/claims/spec',
        '/api/v1/insurance/depts/underwriting/spec',
        '/api/v1/insurance/depts/claims/dashboards/manager',
        '/api/v1/insurance/depts/claims/reports/ai-strategy',
    ];
    for (const path of endpoints) {
        const r = http.get(`${BASE}${path}`, { headers });
        check(r, {
            [`${path} status 200`]: (r) => r.status === 200,
        });
    }
    sleep(1);
}
