// Phase 4 — Soak test. Hold at target VU for 24h, watch for memory growth.
// Per global §47.10.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:8001';
const TENANT = __ENV.TENANT_ID || 'loadtest-tenant';
const TARGET_VU = parseInt(__ENV.SOAK_VU || '100', 10);

export const options = {
    stages: [
        { duration: '5m', target: TARGET_VU },
        { duration: '23h50m', target: TARGET_VU },
        { duration: '5m', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<500'],
    },
};

const headers = { 'X-Tenant-ID': TENANT };
const PATHS = [
    '/api/v1/insurance/depts',
    '/api/v1/insurance/depts/claims/spec',
    '/api/v1/insurance/depts/underwriting/spec',
    '/api/v1/insurance/depts/customer-service/spec',
    '/api/v1/insurance/depts/fraud-siu/spec',
    '/api/v1/insurance/depts/claims/manual_vs_auto',
    '/api/v1/insurance/depts/underwriting/system_design',
];

export default function () {
    const path = PATHS[Math.floor(Math.random() * PATHS.length)];
    const r = http.get(`${BASE}${path}`, { headers });
    check(r, { 'status 200': (r) => r.status === 200 });
    sleep(3);
}
