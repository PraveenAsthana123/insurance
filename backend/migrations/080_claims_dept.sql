-- Iter 108 · §126 Claims department complete demo

CREATE TABLE IF NOT EXISTS claims_record (
    claim_id        VARCHAR(40) PRIMARY KEY,
    customer_id     VARCHAR(40) NOT NULL,
    policy_id       VARCHAR(40) NOT NULL,
    claim_type      VARCHAR(40),         -- auto · home · health · life
    incident_date   DATE,
    submitted_at    TIMESTAMPTZ DEFAULT NOW(),
    claim_amount    NUMERIC(10,2),
    status          VARCHAR(20) DEFAULT 'submitted',
    fraud_score     NUMERIC(3,2),
    sla_due_at      TIMESTAMPTZ,
    decided_at      TIMESTAMPTZ,
    decided_by      VARCHAR(80)
);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims_record(status);
CREATE INDEX IF NOT EXISTS idx_claims_customer ON claims_record(customer_id);

-- Seed 10 sample claims
INSERT INTO claims_record (claim_id, customer_id, policy_id, claim_type,
   incident_date, claim_amount, status, fraud_score, sla_due_at)
VALUES
  ('CL-001', 'C-ABC', 'P-001', 'auto',   '2026-06-01',  2500.00, 'submitted',  0.12, NOW() + INTERVAL '2 days'),
  ('CL-002', 'C-DEF', 'P-002', 'home',   '2026-05-20',  8400.00, 'in_review',  0.45, NOW() + INTERVAL '1 day'),
  ('CL-003', 'C-GHI', 'P-003', 'health', '2026-06-05',  1200.00, 'approved',   0.08, NOW() - INTERVAL '1 day'),
  ('CL-004', 'C-ABC', 'P-001', 'auto',   '2026-04-10', 12000.00, 'denied',     0.82, NOW() - INTERVAL '3 days'),
  ('CL-005', 'C-JKL', 'P-004', 'life',   '2026-03-15', 50000.00, 'approved',   0.05, NOW() - INTERVAL '5 days'),
  ('CL-006', 'C-MNO', 'P-005', 'auto',   '2026-06-08',  3800.00, 'submitted',  0.22, NOW() + INTERVAL '3 days'),
  ('CL-007', 'C-DEF', 'P-002', 'home',   '2026-06-10',  6700.00, 'submitted',  0.18, NOW() + INTERVAL '4 days'),
  ('CL-008', 'C-PQR', 'P-006', 'health', '2026-06-09',   980.00, 'in_review',  0.10, NOW() + INTERVAL '12 hours'),
  ('CL-009', 'C-STU', 'P-007', 'auto',   '2026-06-07', 15500.00, 'in_review',  0.67, NOW() + INTERVAL '6 hours'),
  ('CL-010', 'C-VWX', 'P-008', 'home',   '2026-05-25',  4200.00, 'approved',   0.15, NOW() - INTERVAL '7 days')
ON CONFLICT (claim_id) DO NOTHING;
