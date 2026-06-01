// Phase 2 — Load test. 500 VU sustained, 10 min, p95 SLA + error rate < 1%.
// Per global §47.10.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:8000';
const TENANT = __ENV.TENANT_ID || 'loadtest-tenant';

const errorRate = new Rate('app_errors');

export const options = {
    stages: [
        { duration: '2m', target: 500 },
        { duration: '6m', target: 500 },
        { duration: '2m', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<500'],
        app_errors: ['rate<0.01'],
    },
};

const headers = { 'X-Tenant-ID': TENANT };
const READ_PATHS = [
    '/api/v1/insurance/depts',
    '/api/v1/insurance/depts/claims/spec',
    '/api/v1/insurance/depts/underwriting/spec',
    '/api/v1/insurance/depts/customer-service/dashboards/manager',
    '/api/v1/insurance/depts/fraud-siu/system_design',
    '/api/v1/insurance/depts/claims/dashboards/admin',
    '/api/v1/insurance/depts/underwriting/reports/ai-reviewer',
];

export default function () {
    const path = READ_PATHS[Math.floor(Math.random() * READ_PATHS.length)];
    const r = http.get(`${BASE}${path}`, { headers });
    const ok = check(r, {
        'status 200': (r) => r.status === 200,
        'body non-empty': (r) => r.body && r.body.length > 100,
    });
    errorRate.add(!ok);
    sleep(Math.random() * 2);
}
