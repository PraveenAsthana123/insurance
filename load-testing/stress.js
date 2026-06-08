// Phase 3 — Stress test. Ramp 0 → 2000 VU over 30 min, find breakpoint.
// Per global §47.10.
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:8001';
const TENANT = __ENV.TENANT_ID || 'loadtest-tenant';

export const options = {
    stages: [
        { duration: '5m', target: 200 },
        { duration: '5m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '5m', target: 1500 },
        { duration: '5m', target: 2000 },
        { duration: '5m', target: 0 },
    ],
    thresholds: {
        // No hard fail — we want to find breakpoint
        http_req_failed: ['rate<0.50'],
    },
};

const headers = { 'X-Tenant-ID': TENANT };

export default function () {
    const r = http.get(`${BASE}/api/v1/insurance/depts/claims/spec`, { headers });
    check(r, { 'status < 500': (r) => r.status < 500 });
}
