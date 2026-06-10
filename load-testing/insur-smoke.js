// k6 smoke load test · Iter 26 · E10/J4 closure.
// Run: k6 run load-testing/insur-smoke.js
// CI: invoked by .github/workflows/loadtest.yml on schedule + manual.

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  // Smoke: 5 VUs · 30s · catches gross regressions
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],            // <1% errors
    http_req_duration: ['p(95)<500'],          // p95 < 500ms
    'http_req_duration{endpoint:hitl}': ['p(95)<800'],
    'http_req_duration{endpoint:vuln}': ['p(95)<1500'], // pip-audit slower
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:8001';

const endpoints = [
  { path: '/api/v1/alerts/counts',                     tag: { endpoint: 'alerts' } },
  { path: '/api/v1/hitl/stats',                         tag: { endpoint: 'hitl' } },
  { path: '/api/v1/responsible-ai/x/summary/report',    tag: { endpoint: 'resai' } },
  { path: '/api/v1/use-cases/x/score',                  tag: { endpoint: 'usecase' } },
  { path: '/api/v1/data-pipeline/x/tasks',              tag: { endpoint: 'data' } },
  { path: '/api/v1/regulatory/x',                       tag: { endpoint: 'reg' } },
  { path: '/api/v1/vulnerabilities/summary',            tag: { endpoint: 'vuln' } },
  { path: '/api/v1/test-status/x',                      tag: { endpoint: 'tests' } },
  { path: '/api/v1/ml/eval/x/y',                        tag: { endpoint: 'eval' } },
  { path: '/api/v1/responsible-ai/x/fairness/timeseries?days=30', tag: { endpoint: 'drift' } },
];

export default function () {
  const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE}${ep.path}`, { tags: ep.tag });
  check(res, {
    'status 200/404': (r) => [200, 404].includes(r.status),
    'has body':       (r) => r.body && r.body.length > 0,
  });
  sleep(Math.random() * 0.5 + 0.1);
}
