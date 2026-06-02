// Tier 9-10 — Performance + load test for operations.
//
// Recommended: k6 (per global §64.42).
//
// Run with:  k6 run tests/operations/perf/load_test.js
//
// Per global §64.30 tier 9: p95 latency per endpoint < SLA.
// Per global §64.30 tier 10: 5-phase load (smoke/load/stress/soak/spike).

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    smoke: { executor: 'constant-vus', vus: 1, duration: '30s' },
    // TODO: add load / stress / soak / spike scenarios per §47.10 5-phase
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],   // p95 < 500ms
    http_req_failed: ['rate<0.01'],     // < 1% errors
  },
};

export default function () {
  const res = http.get('http://localhost:8000/api/v1/insur/depts');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has operations': (r) => r.body.includes('operations'),
  });
  sleep(1);
}
