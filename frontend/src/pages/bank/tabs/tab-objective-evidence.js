// Per-objective evidence rules for TabOutcomeScorecard.
//
// Operator 2026-06-13 11:42 MDT: "fix all .. have agent assign for this task"
// followed by "100% .. top 1".
//
// Contract: every objective in TAB_CHARTER (115 across 31 tabs) MUST have an
// entry here. No exceptions — drill_tab_outcome_evaluator enforces this.
//
// Rule kinds (the evaluator dispatches on `kind`):
//   exists                       · `path` resolves to non-null, non-empty value
//   exists_and_not_equals        · resolves AND value !== `not`
//   count_at_least:N             · resolves to array · length >= N
//   numeric_at_least:N           · resolves to number >= N
//   numeric_at_most:N            · resolves to number <= N
//   in_set                       · resolves to value in `allowed` set
//   operator_confirms            · qualitative · operator marks ✓ via HITL
//                                   (status = '🟡 pending' until confirmed)
//   crosscheck                   · two paths · both must exist
//
// Path format: dotted path into the process blueprint object.
//   e.g., 'accuracy.primary_metric' resolves to proc.accuracy?.primary_metric
//
// Honesty rule (§57.7):
//   - Use `operator_confirms` for abstract/qualitative claims (e.g.,
//     "Make cost of inaction visible to approvers"). Don't fabricate
//     a fake evidence path just to claim auto-verified.
//   - Auto rules ONLY when there's a concrete proc.* path that proves it.
//
// Composes with: §57.7 (honest) · §82 #14 (objectives are hypotheses) ·
// §103.5 (HITL approval for operator_confirms) · §122 (top-1% = 100%
// coverage with brutal split between auto vs confirms).

export const TAB_OBJECTIVE_EVIDENCE = {
  'readme': [
    { kind: 'operator_confirms', label: 'Single source of architecture confirmed by reviewer' },
    { kind: 'exists', path: 'readme.adrs', label: 'ADRs present (zero ambiguity)' },
    { kind: 'operator_confirms', label: 'New engineer can navigate in <10 min (operator timing)' },
    { kind: 'exists', path: 'readme.architecture_review', label: 'Audit-ready evidence per §47' },
  ],
  'overview': [
    { kind: 'exists', path: 'readme.executive_summary', label: '30-second answer present' },
    { kind: 'crosscheck', paths: ['smart_kpi.relevant', 'biz_value.roi'], label: 'Headline KPI + ROI surfaced' },
    { kind: 'operator_confirms', label: 'Links to detailed tabs reachable from overview' },
  ],
  'problem-as-is': [
    { kind: 'exists', path: 'manual_process.measured_pain', label: 'AS-IS hours / $ / error rate measured (not estimated)' },
    { kind: 'count_at_least:3', path: 'manual_process.pain_hotspots', label: 'Top 3 pain hot-spots with named actors' },
    { kind: 'exists', path: 'as_is_to_be.gap_metric', label: 'Gap to target as a number' },
    { kind: 'operator_confirms', label: 'Cost of inaction visible to approvers' },
  ],
  'to-be': [
    { kind: 'exists', path: 'as_is_to_be.to_be_diagram', label: 'TO-BE process diagram reviewable' },
    { kind: 'exists', path: 'success_metric', label: 'Success metric measurable' },
    { kind: 'numeric_at_most:5', path: 'roadmap.milestone_count', label: 'Roadmap ≤ 5 milestones with dates' },
    { kind: 'operator_confirms', label: 'Each milestone has a named owner' },
  ],
  'ai-strategy': [
    { kind: 'exists', path: 'ai_strategy.chosen_type', label: 'AI type with stated rationale' },
    { kind: 'numeric_at_least:1', path: 'value.roi_ratio', label: 'Value > risk-adjusted cost' },
    { kind: 'crosscheck', paths: ['data.readiness_score', 'operations.readiness'], label: 'Data + ops readiness confirmed' },
    { kind: 'exists', path: 'ai_strategy.fallback', label: 'Fallback (non-AI) named' },
  ],
  'digital-transformation': [
    { kind: 'crosscheck', paths: ['change.people', 'change.process', 'change.profit', 'change.technology'], label: 'All 4 Ps addressed' },
    { kind: 'exists', path: 'change.comms_plan', label: 'Change-management with comms cadence' },
    { kind: 'exists', path: 'adoption.metric', label: 'Adoption metric defined' },
    { kind: 'exists', path: 'change.budget', label: 'Reskilling / org-change budget' },
  ],
  'manual-explore': [
    { kind: 'operator_confirms', label: 'Surface 3 distinct layout variants for review' },
    { kind: 'operator_confirms', label: 'Each variant uses identical data · only chrome differs' },
    { kind: 'exists', path: 'manual_process.steps', label: 'Render even when proc has no manual_process · honest fallback (§57.7)' },
    { kind: 'operator_confirms', label: 'Locked by drill_tab_charter_coverage · cannot ship without 8 fields' },
  ],
  'manual-transaction': [
    { kind: 'count_at_least:1', path: 'manual_process.actors', label: 'Every actor named' },
    { kind: 'exists', path: 'manual_process.step_times', label: 'Step times measured' },
    { kind: 'operator_confirms', label: 'Every handoff has a control' },
    { kind: 'exists', path: 'manual_process.exception_runbook', label: 'Exception runbook' },
  ],
  'automatic-pipeline': [
    { kind: 'exists', path: 'automatic_process.trigger', label: 'Trigger source named' },
    { kind: 'exists', path: 'automatic_process.dag', label: 'DAG visible with owner per node' },
    { kind: 'exists', path: 'monitoring.alerts_oncall', label: 'Monitoring alerts wired to on-call' },
    { kind: 'exists', path: 'automatic_process.fallback_tested', label: 'Fallback tested in staging' },
    { kind: 'numeric_at_least:0.0001', path: 'automatic_process.cost_per_run_usd', label: 'Cost per run measured' },
  ],
  'accuracy-benchmarking': [
    { kind: 'exists_and_not_equals', path: 'accuracy.primary_metric', not: 'accuracy', label: 'Primary metric named (not "accuracy" alone)' },
    { kind: 'numeric_at_most:0.05', path: 'benchmark.p_value', label: 'Baseline beaten with statistical significance (p<0.05)' },
    { kind: 'numeric_at_least:2.0', path: 'thresholds.margin_pp', label: 'Threshold passes with margin (≥2pp)' },
    { kind: 'count_at_least:1', path: 'accuracy.per_category', label: 'Per §75: metric per task category' },
    { kind: 'exists', path: 'evidence.mlflow_run_id', label: 'Reproducible evidence link (MLflow)' },
  ],
  'analytical-ai-process': [
    { kind: 'in_set', path: 'analytical_ai.question_shape', allowed: ['yes_no', 'threshold'], label: 'Question is decision-shaped' },
    { kind: 'exists', path: 'analytical_ai.features_provenance', label: 'Feature set with provenance' },
    { kind: 'exists', path: 'analytical_ai.reproducible', label: 'Analysis is reproducible' },
    { kind: 'exists', path: 'analytical_ai.confidence_interval', label: 'Insight has confidence interval' },
    { kind: 'operator_confirms', label: 'Decision is named with owner' },
  ],
  'ai-control-tower': [
    { kind: 'numeric_at_most:5', path: 'ai_control_tower.fleet_status_ms', label: 'Fleet status visible in <5 seconds' },
    { kind: 'exists', path: 'drift.metric_vs_baseline', label: 'Drift metric tracked vs baseline' },
    { kind: 'exists', path: 'cost.run_rate_vs_budget', label: 'Cost run-rate vs budget visible' },
    { kind: 'operator_confirms', label: 'Incident queue triaged with owner' },
    { kind: 'exists', path: 'approvals.sla_routing', label: 'Pending approvals routed within SLA' },
  ],
  'product-mgr': [
    { kind: 'exists', path: 'product_mgr.story_traceability', label: 'Every commit traces to a story' },
    { kind: 'exists', path: 'roadmap.quarters_visible', label: 'Roadmap predictable 2-4 quarters out' },
    { kind: 'exists', path: 'product_mgr.feedback_loop', label: 'Customer feedback loops into backlog' },
  ],
  'process': [
    { kind: 'crosscheck', paths: ['manual_process', 'automatic_process'], label: 'Manual + automated paths side-by-side' },
    { kind: 'exists', path: 'process.hitl_approvals', label: 'HITL approvals discoverable' },
    { kind: 'exists', path: 'process.run_history', label: 'Complete run history per instance' },
  ],
  'data': [
    { kind: 'exists', path: 'data.contract', label: 'Every input has a contract' },
    { kind: 'numeric_at_least:0', path: 'data.quality_score', label: 'Quality score visible per source' },
    { kind: 'exists', path: 'data.lineage', label: 'Lineage traceable end-to-end' },
    { kind: 'exists', path: 'data.access_controls', label: 'Access controlled per §47.6' },
  ],
  'analytics': [
    { kind: 'exists', path: 'analytics.pre_train_insight', label: 'Pre-train statistical insight' },
    { kind: 'exists', path: 'analytics.feature_lineage', label: 'Track feature lineage' },
    { kind: 'exists', path: 'analytics.holdout_per_segment', label: 'Hold-out metrics + per-segment scores' },
    { kind: 'exists', path: 'analytics.chart_audit', label: 'Audit-trail every chart' },
  ],
  'ai': [
    { kind: 'count_at_least:1', path: 'ai', label: 'Every AI usage has a card' },
    { kind: 'exists', path: 'ai_registry.entry', label: 'Every model has a registry entry + ADR' },
    { kind: 'exists', path: 'ai.agent_scope_grant', label: 'Every agent has a scope grant' },
  ],
  'user-story': [
    { kind: 'exists', path: 'user_story.epic_sprint', label: 'Every story carries Epic + Sprint pointer' },
    { kind: 'exists', path: 'user_story.acceptance_testable', label: 'Acceptance criteria testable' },
    { kind: 'exists', path: 'user_story.ai_surface', label: 'AI surface explicit per story' },
  ],
  'user-demo': [
    { kind: 'exists', path: 'user_demo.repeatable', label: 'Repeatable demo per process' },
    { kind: 'exists', path: 'user_demo.sample_data', label: 'Pre-captured sample data' },
    { kind: 'exists', path: 'user_demo.recording', label: 'Recording archived' },
  ],
  'exp-ai': [
    { kind: 'crosscheck', paths: ['exp_ai.shap_global', 'exp_ai.shap_local'], label: 'Local + global explainability' },
    { kind: 'exists', path: 'exp_ai.counterfactual', label: 'Counterfactual generation actionable' },
    { kind: 'exists', path: 'exp_ai.audit_row_surface', label: 'Surface evidence in decision audit row' },
  ],
  'res-ai': [
    { kind: 'numeric_at_least:0.8', path: 'res_ai.disparate_impact', label: 'Pre-deploy fairness gate (DI ≥ 0.8)' },
    { kind: 'numeric_at_most:0.05', path: 'res_ai.equal_opportunity_gap', label: 'Equal opportunity gap < 5%' },
    { kind: 'exists', path: 'res_ai.hitl_escalation', label: 'HITL escalation path tested' },
    { kind: 'exists', path: 'res_ai.audit_row_fields', label: 'Audit row fields populated' },
  ],
  'gov-ai': [
    { kind: 'exists', path: 'gov_ai.policy_registry', label: 'Policy registry tied to decision layer' },
    { kind: 'numeric_at_least:0', path: 'gov_ai.control_effectiveness', label: 'Control effectiveness scored' },
    { kind: 'exists', path: 'gov_ai.scope_grants', label: 'Scope grants enforceable per §42' },
    { kind: 'exists', path: 'gov_ai.rollback_tested', label: 'Rollback path tested' },
  ],
  'comp-ai': [
    { kind: 'exists', path: 'comp_ai.eu_ai_act_tier', label: 'EU AI Act risk tier documented' },
    { kind: 'numeric_at_least:0', path: 'comp_ai.continuous_score', label: 'Continuous compliance score' },
    { kind: 'numeric_at_most:0', path: 'comp_ai.p0_violations', label: 'Zero open P0 violations' },
  ],
  'inc-ai': [
    { kind: 'numeric_at_most:900', path: 'inc_ai.mttd_seconds', label: 'MTTD < SLA' },
    { kind: 'numeric_at_most:3600', path: 'inc_ai.mttr_seconds', label: 'MTTR < SLA' },
    { kind: 'exists', path: 'inc_ai.postmortem_cadence', label: 'Post-mortem within 5 business days' },
    { kind: 'exists', path: 'inc_ai.lessons_into_test_ai', label: 'Lessons fed back into Test AI' },
  ],
  'meet-ai': [
    { kind: 'exists', path: 'meet_ai.transcription', label: 'Every meeting transcribed' },
    { kind: 'exists', path: 'meet_ai.decision_audit', label: 'Decisions audit-logged' },
    { kind: 'exists', path: 'meet_ai.action_assignment', label: 'Action items auto-assigned + tracked' },
  ],
  'note-ai': [
    { kind: 'operator_confirms', label: 'Capture-then-find experience' },
    { kind: 'exists', path: 'note_ai.rag_citations', label: 'RAG search with citations' },
    { kind: 'exists', path: 'note_ai.tag_browse', label: 'Tag-based browsing' },
  ],
  'test-ai': [
    { kind: 'crosscheck', paths: ['test_ai.positive', 'test_ai.negative'], label: 'Positive + negative drill per feature' },
    { kind: 'exists', path: 'test_ai.api_contract', label: 'API contract tests pass per PR' },
    { kind: 'exists', path: 'test_ai.accuracy_regression_baseline', label: 'Model accuracy regression baseline locked' },
    { kind: 'numeric_at_least:80', path: 'test_ai.coverage_pct', label: 'Coverage ≥ 80%' },
  ],
  'job-ai': [
    { kind: 'exists', path: 'job_ai.cron_registry', label: 'All cron expressions registered' },
    { kind: 'exists', path: 'job_ai.failure_sla', label: 'Failures surfaced within SLA' },
    { kind: 'exists', path: 'job_ai.retry_dlq', label: 'Retry policy + dead-letter queue' },
  ],
  'biz-value': [
    { kind: 'numeric_at_least:0', path: 'biz_value.revenue_impact', label: 'Revenue impact quantified' },
    { kind: 'numeric_at_least:0', path: 'biz_value.cost_out', label: 'Cost-out quantified' },
    { kind: 'numeric_at_least:0', path: 'biz_value.risk_reduction', label: 'Risk reduction quantified' },
    { kind: 'numeric_at_least:1', path: 'biz_value.roi_vs_target', label: 'ROI > target' },
  ],
  'dashboard': [
    { kind: 'exists', path: 'dashboard.role_scoped', label: 'Role-scoped data only (per §47.6)' },
    { kind: 'exists', path: 'dashboard.drill_down_row', label: 'Drill-down to row-level' },
    { kind: 'exists', path: 'dashboard.anomaly_flagging', label: 'Anomalies auto-flagged' },
  ],
  'operations': [
    { kind: 'numeric_at_most:1000', path: 'operations.p95_latency_ms', label: 'p95 latency under SLA' },
    { kind: 'numeric_at_most:0.01', path: 'operations.error_rate', label: 'Error rate < 1%' },
    { kind: 'numeric_at_most:900', path: 'operations.rollback_seconds', label: 'Rollback < 15 min' },
    { kind: 'operator_confirms', label: 'Zero unmonitored services' },
  ],
  'reports': [
    { kind: 'exists', path: 'reports.cadence', label: 'Reports auto-generated on cadence' },
    { kind: 'exists', path: 'reports.audit_per_distribution', label: 'Audit-trail per distribution' },
    { kind: 'crosscheck', paths: ['reports.pdf', 'reports.csv', 'reports.json'], label: 'PDF + CSV + JSON formats' },
  ],
};

// Resolve a dotted path into the proc object.
// `proc.foo.bar.baz` → resolvePath(proc, 'foo.bar.baz')
export function resolvePath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

// Evaluate a single objective against a proc blueprint.
// Returns {status, evidence, label}.
//   status: 'verified' | 'pending' | 'failing' | 'unknown'
//   evidence: short string explaining the verdict
export function evaluateObjective(rule, proc) {
  if (!rule) {
    return { status: 'unknown', evidence: 'no rule registered (gap in TAB_OBJECTIVE_EVIDENCE)', label: '?' };
  }
  if (rule.kind === 'operator_confirms') {
    return { status: 'pending', evidence: 'operator verification pending (HITL · §103.5)', label: rule.label };
  }
  const fail = (msg) => ({ status: 'failing', evidence: msg, label: rule.label });
  const ok = (msg) => ({ status: 'verified', evidence: msg, label: rule.label });
  const pending = (msg) => ({ status: 'pending', evidence: msg, label: rule.label });

  if (rule.kind === 'crosscheck') {
    const vals = (rule.paths || []).map((p) => resolvePath(proc, p));
    const missing = (rule.paths || []).filter((p, i) => vals[i] == null || vals[i] === '');
    if (missing.length === 0) return ok(`all ${rule.paths.length} paths populated`);
    return pending(`missing: ${missing.join(', ')}`);
  }

  const v = resolvePath(proc, rule.path);
  if (v == null || v === '') return pending(`proc.${rule.path} not populated`);

  if (rule.kind === 'exists') return ok(`proc.${rule.path} populated`);
  if (rule.kind === 'exists_and_not_equals') {
    return v !== rule.not ? ok(`= ${JSON.stringify(v)} (≠ ${rule.not})`)
                          : fail(`= ${rule.not} (forbidden)`);
  }
  if (rule.kind === 'in_set') {
    return (rule.allowed || []).includes(v)
      ? ok(`= ${JSON.stringify(v)} (in allowed set)`)
      : fail(`= ${JSON.stringify(v)} (not in ${JSON.stringify(rule.allowed)})`);
  }
  if (rule.kind && rule.kind.startsWith('count_at_least:')) {
    const min = parseInt(rule.kind.split(':')[1], 10);
    const len = Array.isArray(v) ? v.length : 0;
    return len >= min ? ok(`len ${len} ≥ ${min}`) : fail(`len ${len} < ${min}`);
  }
  if (rule.kind && rule.kind.startsWith('numeric_at_least:')) {
    const min = parseFloat(rule.kind.split(':')[1]);
    const n = Number(v);
    return Number.isFinite(n) && n >= min ? ok(`${n} ≥ ${min}`) : fail(`${v} < ${min}`);
  }
  if (rule.kind && rule.kind.startsWith('numeric_at_most:')) {
    const max = parseFloat(rule.kind.split(':')[1]);
    const n = Number(v);
    return Number.isFinite(n) && n <= max ? ok(`${n} ≤ ${max}`) : fail(`${v} > ${max}`);
  }
  return { status: 'unknown', evidence: `unsupported rule kind: ${rule.kind}`, label: rule.label };
}

// Aggregate a tab's objectives into a score summary.
// Returns {verified, pending, failing, unknown, total, pct, band}.
export function scoreTab(tabId, proc) {
  const rules = TAB_OBJECTIVE_EVIDENCE[tabId];
  if (!rules || rules.length === 0) {
    return { verified: 0, pending: 0, failing: 0, unknown: 0, total: 0, pct: 0, band: 'no-rules' };
  }
  const results = rules.map((r) => evaluateObjective(r, proc));
  const verified = results.filter((r) => r.status === 'verified').length;
  const pending = results.filter((r) => r.status === 'pending').length;
  const failing = results.filter((r) => r.status === 'failing').length;
  const unknown = results.filter((r) => r.status === 'unknown').length;
  const total = results.length;
  const pct = Math.round((verified / Math.max(total, 1)) * 100);
  const band = failing > 0 ? 'failing'
             : pct >= 80 ? 'top-1pct'
             : pct >= 60 ? 'ok'
             : 'needs-work';
  return { verified, pending, failing, unknown, total, pct, band, results };
}
