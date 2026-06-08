// Phase 5 — Spike test. 0 → peak in 60s, hold, then drop. Recovery < 60s.
// Per global §47.10.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:8001';
const TENANT = __ENV.TENANT_ID || 'loadtest-tenant';

export const options = {
    stages: [
        { duration: '30s', target: 50 },     // warm-up
        { duration: '60s', target: 2000 },   // spike
        { duration: '60s', target: 2000 },   // hold
        { duration: '60s', target: 50 },     // recover
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.10'],     // tolerate some spike-induced failures
        http_req_duration: ['p(95)<2000'],   // p95 < 2s during spike
    },
};

const headers = { 'X-Tenant-ID': TENANT };

export default function () {
    const r = http.get(`${BASE}/api/v1/insurance/depts/claims/spec`, { headers });
    check(r, { 'status 200': (r) => r.status === 200 });
    sleep(0.1);
}
