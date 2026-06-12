// §139 · Odysseus k6 load test · 5-phase per §47.10
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    smoke:  { executor: 'constant-vus', vus: 1,  duration: '30s' },
    load:   { executor: 'ramping-vus', startVUs: 0, stages: [
        {duration: '1m', target: 100}, {duration: '3m', target: 100}, {duration: '1m', target: 0}
    ]},
    stress: { executor: 'ramping-vus', startVUs: 0, stages: [
        {duration: '30s', target: 500}, {duration: '1m', target: 1000}, {duration: '30s', target: 0}
    ]},
    soak:   { executor: 'constant-vus', vus: 50, duration: '24h' },
    spike:  { executor: 'ramping-vus', startVUs: 0, stages: [
        {duration: '10s', target: 2000}, {duration: '30s', target: 2000}, {duration: '10s', target: 0}
    ]}
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01']
  }
};

export default function () {
  const r = http.post('http://localhost:8001/api/v1/odysseus/predict',
    JSON.stringify({status: 'completed', trigger_kind: 'cron',
                     duration_ms: 1500, cost_usd: 0.001,
                     tokens_in: 100, tokens_out: 50, retry_count: 0,
                     input_text: 'claim review', skill: 'fraud_detection'}),
    {headers: {'Content-Type': 'application/json'}}
  );
  check(r, {
    'status 200': (r) => r.status === 200,
    'p95 < 500ms': (r) => r.timings.duration < 500
  });
  sleep(0.5);
}
