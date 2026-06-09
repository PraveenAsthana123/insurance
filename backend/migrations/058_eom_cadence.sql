-- 058_eom_cadence.sql — allow "last day of month" cadence semantics.
-- Per operator 2026-06-08: prior pending note "Last day of month cadence".
--
-- Sentinel value: day_of_month = 0 means "last day of month"
-- (Feb → 28 · Apr → 30 · etc.). Service + executor compute it dynamically.
-- 1-28 keeps existing meaning (calendar day-of-month).

ALTER TABLE campaign_schedules
    DROP CONSTRAINT IF EXISTS campaign_schedules_day_of_month_check;

-- Now allow 0 (EOM sentinel) OR 1-28 (explicit day-of-month).
-- Day 29-31 still disallowed (Feb edge avoidance is the point of the sentinel).
ALTER TABLE campaign_schedules
    ADD CONSTRAINT campaign_schedules_day_of_month_check
    CHECK (day_of_month IS NULL OR day_of_month = 0 OR day_of_month BETWEEN 1 AND 28);

COMMENT ON COLUMN campaign_schedules.day_of_month IS
    'For monthly cadence: 1-28 = explicit day · 0 = last day of month (dynamic per month) · NULL = use day_of_month from base date';
