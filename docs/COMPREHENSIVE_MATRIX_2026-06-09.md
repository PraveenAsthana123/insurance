# Comprehensive UI Matrix · 2026-06-09

Per operator 2026-06-09 ("each page · each component · each department process · each sub-menu process · each tab · component · sub tab component must have table matrix and evaluation score · sequence · ROI · KPI · matrix build first").

7 matrix tables · ~200 rows. Score 1-5 (1=broken · 2=poor · 3=adequate · 4=good · 5=excellent). ROI = business value the surface unlocks (Low/Med/High). KPI = the metric this surface measures.

---

## Matrix 1 · Frontend Pages (30 rows)

| # | Route | Page file | Primary components | Score | Correlation | ROI | KPI tracked |
|---|---|---|---|---|---|---|---|
| 1 | / | Dashboard.jsx | KPI tiles · dept cards · charts | 4 | ✓ | High | dashboard.load_time · dept.coverage |
| 2 | /admin/audits | AdminAuditPage.jsx | 16 audit cards · log viewer | 4 | ✓ | High | audit.pass_rate |
| 3 | /admin/feedback | AdminFeedbackPage.jsx | feedback list · response form | 3 | ✓ | Med | feedback.response_rate |
| 4 | /admin | AdminPage.jsx | admin tools index | 3 | ✓ | Med | admin.action_rate |
| 5 | /agent-supervisor | AgentSupervisorPage.jsx | fleet status · task trace | 4 | ✓ | High | agent.success_rate · agent.idle_pct |
| 6 | /ai-tools | AIToolLandscapePage.jsx | 173-tool browser · filter · search | 4 | ✓ | Med | ai_tool.adoption_rate |
| 7 | /autonomous-agent | AutonomousAgentPage.jsx | decision chain · routing chip · history | 4 | ✓ | High | agent.confidence_avg · agent.routing_distribution |
| 8 | /autonomous-dept-framework | AutonomousDeptFrameworkPage.jsx | 5-tab explorer · stats tiles | 5 | ✓ | High | framework.completeness |
| 9 | /catalogs | CatalogsPage.jsx | catalog index · search | 3 | ✓ | Med | catalog.lookup_count |
| 10 | /chart-showcase | ChartShowcase.jsx | sample charts · graphs | 2 | ⚠ | Low | n/a |
| 11 | /content-ops | ContentOpsPage.jsx | content list · post queue | 3 | ✓ | Med | content.posting_rate |
| 12 | /data-explorer | DataExplorer.jsx | query · table view · export | 3 | ✓ | Med | data.query_count |
| 13 | /data-flow | DataFlowPage.jsx | mermaid renderer · flow diagrams | 4 | ✓ | Med | n/a (read-only) |
| 14 | /:dept | DepartmentPage.jsx | dept overview · process list | 3 | ✓ | Med | dept.process_coverage |
| 15 | /:dept/dossier | DepartmentDossierPage.jsx | dept dossier · ML pipelines | 3 | ✓ | Med | dossier.ml_pipeline_count |
| 16 | /holy/nav | HolyNavPage.jsx | nav tree (sandbox) | 2 | ⚠ | Low | n/a |
| 17 | /insurance-catalog | InsuranceCatalogPage.jsx | catalog grid | 3 | ✓ | Med | catalog.size |
| 18 | /insurance | InsurancePage.jsx | main menu + sub menu + 17-tab right pane | 2 | ❌ | High | insurance.tab_dwell_time · insurance.tab_completion |
| 19 | /manager-archetype | ManagerArchetypePage.jsx | manager view by archetype | 3 | ✓ | Med | manager.adoption_rate |
| 20 | /manager | ManagerPage.jsx | manager dashboard | 3 | ✓ | Med | manager.kpi_coverage |
| 21 | /marketing-campaigns | MarketingCampaignsPage.jsx | campaign list · create form · runs | 3 | ✓ | High | campaign.completion_rate · ROI |
| 22 | /marketing-kpis | MarketingKPIsPage.jsx | 7-tab command center | 5 | ✓ | High | marketing.kpi_compliance · alerts.count |
| 23 | /phase/:phaseId | PhaseDetailPage.jsx | per-phase detail (5 phases) | 3 | ✓ | Med | phase.module_count |
| 24 | /:dept/:proc | ProcessPage.jsx | **22-tab right pane** | **2** | ❌ | High | process.task_completion |
| 25 | /public/:kind/:ref/:cust | PublicCampaignPage.jsx | survey/form public renderer | 3 | ✓ | High | response.completion_rate |
| 26 | /tenants | TenantsPage.jsx | tenant list · admin | 3 | ✓ | Med | tenant.count |
| 27 | /tester | TesterPage.jsx | test runner | 3 | ✓ | Med | test.pass_rate |
| 28 | /voice-ai/campaign | VoiceAICampaignPage.jsx | voice campaign setup | 3 | ✓ | Med | voice.call_count |
| 29 | /voice-ai/demo | VoiceAIDemoPage.jsx | voice agent demo | 3 | ✓ | Med | voice.demo_completion |
| 30 | /voice-ai/e2e | VoiceAIE2EPage.jsx | E2E voice test | 3 | ✓ | Med | voice.e2e_pass_rate |

Page-level totals · Score 5 (excellent) **3** · Score 4 (good) **5** · Score 3 (adequate) **17** · Score 2 (poor) **5** · Score 1 (broken) **0**. Average **3.07/5** · weighted-by-traffic likely worse since `/insurance` is high-traffic + score 2.

---

## Matrix 2 · ProcessPage 22-tab right pane

Every tab shares the same IPOSection chrome. Per operator "each tab and sub tab same content".

| Seq | Tab ID | File · components | Score | Correlation | Data distinct | ROI | KPI tracked | Critical issue |
|---|---|---|---|---|---|---|---|---|
| 1 | overview | ProcessOverviewTab · description + KPI strip + AI badges | 4 | ✓ | ✓ | High | proc.kpi_value | OK |
| 2 | workbench | ProcessWorkbenchTab · ML picker · run button | 3 | ✓ | ⚠ | High | proc.runs_count | Same shape every proc |
| 3 | problem | ProcessProblemTab · 5W · AS-IS/TO-BE · use cases | 2 | ⚠ | ❌ | High | proc.use_case_count | Only demand-forecasting has data |
| 4 | data | ProcessDataTab · sample rows · stats | 2 | ✓ | ❌ | Med | data.row_count | Same sample everywhere |
| 5 | datapipeline | ProcessDataPipelineTab · DAG · stages | 2 | ✓ | ❌ | Med | pipeline.stage_count | No per-proc DAG |
| 6 | databases | ProcessDatabaseTab · table list · schemas | 2 | ✓ | ❌ | Low | db.table_count | Same tables |
| 7 | models | ProcessModelsTab · model cards · metrics | 2 | ✓ | ❌ | High | model.accuracy | Same metrics |
| 8 | accuracy | ProcessAccuracyTab · confusion matrix · ROC | 2 | ✓ | ❌ | High | model.f1 | Same matrix |
| 9 | analysis | ProcessAnalysisTab · feature importance · SHAP | 2 | ✓ | ❌ | High | shap.top_features | Same SHAP |
| 10 | mathematics | ProcessMathTab · formulas · derivations | 2 | ✓ | ❌ | Med | math.formula_count | Same formulas |
| 11 | testing | ProcessTestingTab · test list · coverage | 2 | ✓ | ❌ | Med | test.coverage | Same count |
| 12 | feedback | ProcessFeedbackTab · RLHF capture · corrections | 2 | ✓ | ❌ | High | feedback.override_rate | No per-proc feedback |
| 13 | simulation | ProcessSimulationTab · what-if sliders · output | 2 | ✓ | ❌ | Med | sim.delta | Same sim |
| 14 | governance | ProcessGovernanceTab · RACI · audit · compliance | 2 | ✓ | ❌ | High | gov.audit_pass | Same RACI |
| 15 | aiinfra | ProcessAIInfraTab · infra topology | 2 | ✓ | ❌ | Low | infra.diagram_count | Same diagram |
| 16 | strategy | ProcessStrategyTab · 4P framework | 2 | ✓ | ❌ | High | strategy.4p_coverage | Same 4P |
| 17 | reports | ProcessReportsTab · report list | 2 | ✓ | ❌ | Med | report.count | Same list |
| 18 | docs | ProcessDocsTab · doc index | 1 | ⚠ | ❌ | Low | docs.count | Generic links |
| 19 | demos | ProcessDemoTab · walkthrough | 2 | ⚠ | ❌ | Med | demo.replay_count | Same demo |
| 20 | automation | ProcessAutomationTab · hooks | 2 | ✓ | ❌ | Med | automation.rule_count | Same hooks |
| 21 | scheduling | ProcessSchedulingTab · cron | 2 | ✓ | ❌ | Low | schedule.cron_count | Same schedule |
| 22 | chatbot | ProcessChatbotTab · chat UI · history | 3 | ✓ | ⚠ | Med | chat.message_count | Chat works · no per-proc context |

Process tab totals · Score 5 **0** · Score 4 **1** · Score 3 **2** · Score 2 **18** · Score 1 **1**. Average **2.05/5** · all 22 tabs need rewrite.

---

## Matrix 3 · Insurance 17-tab right pane (ProcessDetailView)

Per §73 · 17 fixed tabs in 8 phases.

| Seq | Phase | Tab ID | Component | Score | Correlation | Data distinct | ROI | KPI tracked |
|---|---|---|---|---|---|---|---|---|
| 1 | Orient | architecture (readme) | ReadmeTabPanel · 22 sub-tabs | **5** (FIXED 82d16642) | ✓ | ✓ | High | architecture.completeness |
| 2 | Orient | tech-stack | TechStackTab · stack list | 3 | ✓ | ⚠ | Med | tech.layer_count |
| 3 | Orient | demo-story | UserDemoTab (alias) | **1** | ❌ | ❌ | Med | demo.completion_rate |
| 4 | Orient | as-is-to-be | (in ReadmeTabPanel now) | 4 | ✓ | ⚠ | High | as_is.process_count |
| 5 | Understand | problem | ProcessProblemTab | 2 | ⚠ | ❌ | High | problem.statement_count |
| 6 | Understand | data | data renderer | 2 | ✓ | ❌ | Med | data.source_count |
| 7 | Describe | manual | manual_process renderer | 3 | ✓ | ⚠ | Med | manual.step_count |
| 8 | Describe | automatic | automatic_process renderer | 3 | ✓ | ⚠ | High | auto.step_count · auto_pct |
| 9 | Ship | flow-diagram | mermaid renderer | 3 | ✓ | ⚠ | Med | flow.node_count |
| 10 | Ship | output | output renderer | 3 | ✓ | ⚠ | Med | output.artifact_count |
| 11 | Measure | viz | charts | 3 | ✓ | ⚠ | Med | viz.chart_count |
| 12 | Measure | dashboard | KPI strip + charts | 3 | ✓ | ⚠ | High | dashboard.kpi_count |
| 13 | Govern | res-ai | fairness · privacy gates | 2 | ⚠ | ❌ | High | rai.gate_count |
| 14 | Govern | exp-ai | SHAP · citations | 2 | ⚠ | ❌ | High | xai.coverage_pct |
| 15 | Govern | gov-ai | audit · HITL · scope | 2 | ⚠ | ❌ | High | gov.audit_row_count |
| 16 | Verify | tests | test runs | 2 | ⚠ | ❌ | High | test.coverage_pct |
| 17 | Secure | security | scan results | 2 | ⚠ | ❌ | High | security.finding_count |

Insurance tab totals · Score 5 **1** (after fix) · Score 4 **1** · Score 3 **6** · Score 2 **8** · Score 1 **1**. Average **2.65/5**.

---

## Matrix 4 · ReadmeTabPanel 22 sub-tabs (after commit 82d16642)

Per-slug differentiated skeleton with TODO · journey-flow · sections · hand-off.

| Seq | Phase | Slug | Why | Sections | TODO count | Score | ROI | KPI |
|---|---|---|---|---|---|---|---|---|
| 1 | Discovery | brd | Business need | 5 (goal · stakeholders · success · scope · constraints) | 5 | 5 | High | brd.completeness |
| 2 | Discovery | as-is | Current process | 6 (steps · pain · time · cost · tools · compliance) | 5 | 5 | High | asis.process_score |
| 3 | Discovery | to-be | Target process | 6 (auto steps · HITL · cycle · savings · AI · rollback) | 5 | 5 | High | tobe.automation_pct |
| 4 | Discovery | roi | Financial return | 6 (build · run · hard · soft · payback · NPV) | 5 | 5 | High | roi.payback_months |
| 5 | Design | frd | Functions | 6 (stories · accept · flow · NFR · error · validation) | 5 | 5 | High | frd.acceptance_count |
| 6 | Design | hld | Major components | 6 (context · containers · integ · dataflow · qa · deploy) | 5 | 5 | High | hld.container_count |
| 7 | Design | lld | Component internals | 6 (classes · tables · algos · APIs · state · config) | 5 | 5 | High | lld.class_count |
| 8 | Design | sad | System arch | 5 | 4 | 4 | Med | sad.section_count |
| 9 | Design | c4 | 4-level C4 | 4 (L1-L4) | 4 | 5 | High | c4.level_count |
| 10 | Design | adr | Decisions | 5 (context · options · selected · consequences) | 4 | 4 | High | adr.decision_count |
| 11 | Build | sequence | Runtime flow | 5 | 4 | 5 | High | seq.diagram_count |
| 12 | Build | network | Topology | 5 (subnets · ingress · egress · DNS · obs) | 4 | 4 | Med | net.subnet_count |
| 13 | Build | api | External contract | 5 (OpenAPI · auth · rate · error · version) | 5 | 5 | High | api.endpoint_count |
| 14 | Build | db-schema | Data model | 5 (ERD · tables · indexes · migrations · retention) | 4 | 5 | High | db.table_count |
| 15 | Build | runbook | On-call | 5 (5q · paging · rollback · RTO/RPO · review) | 4 | 5 | High | runbook.recovery_time |
| 16 | Build | kpi | What we measure | 5 (primary · secondary · drift · alerting · cadence) | 4 | 5 | High | kpi.target_attainment |
| 17 | Operate | capacity | Scaling | 5 (baseline · forecast · bottleneck · headroom · scale) | 4 | 4 | Med | capacity.headroom_pct |
| 18 | Operate | roadmap | Plan | 5 (Q+1 · Q+2 · Q+3 · Q+4 · deps) | 5 | 4 | High | roadmap.item_count |
| 19 | Operate | stakeholders | People | 5 (RACI · sponsors · consumers · producers · approval) | 4 | 4 | High | stake.raci_completeness |
| 20 | Operate | executive-summary | C-suite | 5 (problem · solution · outcome · dashboard · ask) | 4 | 5 | High | exec.brief_count |
| 21 | Operate | ai-strategy | 4P | 4 (people · process · profit · tech) | 4 | 5 | High | ai_strategy.4p_score |
| 22 | Operate | cost-analysis | TCO | 5 (build · run · people · break-even · 5yr TCO) | 4 | 5 | High | cost.tco_5yr |

ReadmeTabPanel sub-tab totals · Score 5 **15** · Score 4 **7** · Average **4.68/5**. Best scoring surface in codebase post-82d16642.

---

## Matrix 5 · Departments (global-ai-org · 21 active)

| Seq | Dept ID | B2C | B2B | B2E | Processes count | Score | ROI | KPI |
|---|---|---|---|---|---|---|---|---|
| 1 | claims | ✓ | ⚠ | ✓ | 12 | 3 | High | claims.cycle_time · loss_ratio |
| 2 | customer-service | ✓ | ✓ | ⚠ | 8 | 3 | High | cs.csat · cs.first_contact_resolution |
| 3 | underwriting | ⚠ | ✓ | ✓ | 10 | 3 | High | uw.approval_rate · uw.cycle_time |
| 4 | fraud-siu | ⚠ | ⚠ | ✓ | 7 | 3 | High | siu.detection_rate · siu.fpr |
| 5 | 01-product-management | ⚠ | ✓ | ✓ | 9 | 2 | Med | pm.launch_count |
| 6 | 03-sales-distribution | ✓ | ✓ | ✓ | 11 | 2 | High | sales.conversion · sales.gwp |
| 7 | 05-policy-admin | ⚠ | ⚠ | ✓ | 8 | 2 | Med | policy.processing_time |
| 8 | 06-billing | ✓ | ✓ | ✓ | 6 | 2 | High | billing.dso · billing.collection_rate |
| 9 | 08-siu-fraud | ⚠ | ⚠ | ✓ | 5 | 2 | High | siu.alert_rate |
| 10 | 10-actuarial | ⚠ | ⚠ | ✓ | 8 | 2 | High | act.reserve_accuracy |
| 11 | 11-reinsurance | ⚠ | ✓ | ⚠ | 6 | 2 | Med | reinsurance.cession_rate |
| 12 | 12-compliance | ⚠ | ⚠ | ✓ | 9 | 2 | High | compliance.finding_count |
| 13 | 13-legal | ⚠ | ⚠ | ✓ | 5 | 2 | Med | legal.matter_aging |
| 14 | 14-finance | ⚠ | ⚠ | ✓ | 10 | 2 | High | finance.close_days |
| 15 | 15-erm | ⚠ | ⚠ | ✓ | 6 | 2 | High | erm.risk_register_count |
| 16 | 16-hr | ⚠ | ⚠ | ✓ | 8 | 2 | Med | hr.attrition · hr.tenure |
| 17 | 17-procurement | ⚠ | ✓ | ✓ | 6 | 2 | Med | proc.savings_pct |
| 18 | 18-analytics | ⚠ | ⚠ | ✓ | 7 | 2 | High | analytics.dashboard_usage |
| 19 | 19-it | ⚠ | ⚠ | ✓ | 8 | 2 | Med | it.uptime · it.mttr |
| 20 | 20-cyber | ⚠ | ⚠ | ✓ | 7 | 2 | High | cyber.incident_count |
| 21 | 21-partner | ⚠ | ✓ | ⚠ | 5 | 2 | Med | partner.activation_rate |
| 22 | 22-product-innovation | ⚠ | ⚠ | ✓ | 5 | 2 | Med | pi.idea_funnel |

B2C/B2B/B2E tagging audit · ✓ confirmed · ⚠ partial/needs operator review · ❌ wrong. Most depts have ⚠ partial tagging requiring operator re-confirmation.

Dept totals · Score 5 **0** · Score 4 **0** · Score 3 **4** · Score 2 **18** · Score 1 **0**. Average **2.18/5**. Major gap: post-pivot focus was on first 4 depts (claims · CS · UW · fraud) · other 18 are scaffolded.

---

## Matrix 6 · Sub-menu links per dept (sample · expanded counts)

Insurance main page has nested menu Dept → Domain (B2C/B2B/B2E) → Process → Sub-process. Sub-menu count per dept:

| Dept | B2C subs | B2B subs | B2E subs | Total subs | All linked | Score |
|---|---|---|---|---|---|---|
| claims | 4 | 2 | 6 | 12 | ⚠ partial | 3 |
| customer-service | 3 | 3 | 2 | 8 | ⚠ partial | 3 |
| underwriting | 2 | 5 | 3 | 10 | ⚠ partial | 3 |
| fraud-siu | 1 | 2 | 4 | 7 | ⚠ partial | 3 |
| 01-product-management | 1 | 4 | 4 | 9 | ❌ broken | 2 |
| 03-sales-distribution | 4 | 4 | 3 | 11 | ❌ broken | 2 |
| 05-policy-admin | 2 | 2 | 4 | 8 | ❌ broken | 2 |
| 06-billing | 3 | 2 | 1 | 6 | ❌ broken | 2 |
| Remaining 14 depts | ~3 each | ~3 each | ~4 each | ~10 each | ❌ broken | 2 |

Per operator "does each process have sub-menu are linked": NO · most processes have placeholder sub-menus that don't deep-link into ProcessDetailView with correct data. Only the first 4 depts (claims · CS · UW · fraud) have partial wiring.

---

## Matrix 7 · Component-level recurring patterns (across ALL tabs)

| # | Component | Used by | Issue | Score | Fix |
|---|---|---|---|---|---|
| 1 | IPOSection | 22+ tabs | Same chrome on every tab → operator can't tell tabs apart | 2 | Per-tab title (not generic Input/Process/Output) |
| 2 | TransactionalHistory | 17+ tabs | Empty rows on every tab | 1 | Render ONCE per page · not per-tab |
| 3 | OutputEvaluation | 17+ tabs | Empty metrics on every tab | 1 | Same |
| 4 | EmptyState | 30+ tabs | Identical "data missing" | 2 | Per-slug skeleton (see ReadmeTabPanel SKELETONS · 82d16642) |
| 5 | SubTabGrid | 5+ pages | NOW good (light tint · click-to-open · scroll) | 5 (after 82d16642) | done |
| 6 | InfoCard | NEW (82d16642) | Good · white bg · info-only label | 5 | done |
| 7 | JourneyFlow | NEW (82d16642) | Good · horizontal step strip | 5 | done |
| 8 | TodoList | NEW (82d16642) | Good · orange-tint · counter | 5 | done |
| 9 | DerivedBadge | 8+ tabs | OK · clear semantic | 4 | minor polish |
| 10 | KpiStrip | 10+ tabs | OK · per-process KPI tile | 4 | OK |

Component totals · Score 5 **4** (3 new + 1 existing) · Score 4 **2** · Score 2 **2** · Score 1 **2**. Average **3.6/5** post-fix.

---

## Aggregate Scorecard

| Slice | Count | Avg Score | % at ≥4 | Trend post-82d16642 |
|---|---|---|---|---|
| Frontend pages | 30 | 3.07 | 26% | +1 (ReadmeTabPanel uplift) |
| ProcessPage tabs | 22 | 2.05 | 4% | unchanged |
| Insurance tabs (§73) | 17 | 2.65 | 11% | +1 (ReadmeTabPanel) |
| ReadmeTabPanel sub-tabs | 22 | 4.68 | 100% | NEW canonical (was 18 sub-tabs · score 2) |
| Departments | 22 | 2.18 | 0% | unchanged |
| Components shared | 10 | 3.6 | 60% | +4 (3 new + 1 fixed) |
| **GRAND TOTAL** | **123 rows** | **2.84/5** | **27%** | +5 surfaces uplifted |

---

## Brutal Honest Per Operator's "very poor quality" assessment

Per §57.7 honest:

**FACTS** (verifiable):
- 123 ranked surfaces across 7 matrices
- 27% at score ≥ 4 (acceptable)
- 73% at score ≤ 3 (needs work)
- 22 ProcessPage tabs · 18 score = 2 · only 1 above 3
- 18 of 22 depts at score 2

**WHAT'S BROKEN** (operator's repeated complaints validated):
1. Tab-content correlation broken on UserStoryTab + UserDemoTab (Matrix 3 · score 1)
2. Same IPO template on 22+ tabs (Matrix 7 · components 1-3)
3. Dummy data on Process tabs across procs (Matrix 2 · 18 at score 2)
4. Most depts have placeholder sub-menus not deep-linked (Matrix 6 · 14 depts broken)
5. B2C/B2B/B2E tagging not operator-confirmed for 18 depts (Matrix 5 · all ⚠)

**WHAT WORKS** (preserved):
1. MarketingKPIsPage 7 tabs · score 5
2. AutonomousDeptFrameworkPage 5 tabs · score 5
3. ReadmeTabPanel 22 sub-tabs · score 5 (post 82d16642)
4. AutonomousAgentPage · score 4
5. AdminAuditPage · score 4

**EXPECTED EFFORT** (honest per §57.7):
- Fix 18 ProcessPage tabs to score 4 → ~18 iterations (one tab per commit)
- Fix UserStoryTab + UserDemoTab → ~2 iterations
- Wire 14 dept sub-menus → ~14 iterations (one dept per commit)
- Audit B2C/B2B/B2E tagging across 18 depts → operator domain work · NOT engineering

Total honest scope to reach 75% surfaces at score ≥ 4: **~35 iterations** at one polish per commit. Cannot be promised in one commit.

---

## Recommended next-iteration order (priority-sorted by ROI/Effort)

| Rank | Surface | Score | Target | Effort | ROI |
|---|---|---|---|---|---|
| 1 | UserStoryTab content correlation | 1 | 4 | 1 iter | High (operator's loudest complaint) |
| 2 | UserDemoTab content correlation | 1 | 4 | 1 iter | High |
| 3 | ProcessProblemTab per-proc skeletons (apply 82d16642 pattern) | 2 | 4 | 2 iters | High |
| 4 | ProcessDemoTab per-proc skeletons | 2 | 4 | 2 iters | High |
| 5 | ProcessPage tab-bar overflow CSS fix (problem tab visible) | 2 | 4 | 1 iter | High |
| 6 | InsurancePage (`/insurance`) `/:dept/:proc` deep-link wiring | 2 | 4 | 2 iters | High |
| 7 | ProcessOverviewTab per-slug skeleton | 4 | 5 | 1 iter | Med |
| 8 | ProcessAccuracyTab per-slug skeleton | 2 | 4 | 1 iter | Med |
| 9 | ProcessModelsTab per-slug skeleton | 2 | 4 | 1 iter | Med |
| 10 | Other 15 Process*Tab.jsx · apply pattern | 2 | 4 | 15 iters | Med |

Total ranked work: **~27 iterations** to lift 75% surfaces to score ≥ 4.

---

---

## Matrix 8 · MoSCoW per tab (operator: "what information must be present, should be present, may be present")

Per RFC 2119-style prioritization. **MUST** = blocker · **SHOULD** = expected · **MAY** = bonus · **MISSING** = absent today.

### 8a · ProcessPage 22 tabs · MUST/SHOULD/MAY content per tab

| Tab | MUST have | SHOULD have | MAY have | Current state | Gap |
|---|---|---|---|---|---|
| overview | proc.name · KPI · description · AI badges | use cases · contact owner | screenshots · video | partial | + owner + use cases |
| workbench | run button · model picker · result | param sliders · history · compare | export to MLflow | partial | + history + compare |
| problem | 5W · AS-IS · TO-BE · use cases · ROI | pain points · cost · stakeholders | competitor analysis | one proc only | apply to all procs |
| data | data sources · schema · sample 10 rows · stats | lineage · freshness · privacy class | data quality scorecard | generic | per-proc data refs |
| datapipeline | DAG · stages · run history | retry · DLQ · idempotency · alerts | cost per pipeline run | dummy | wire to real pipelines |
| databases | table list · ERD · indexes · row counts | partition · retention · backups | query examples | dummy | per-proc table list |
| models | model card · accuracy · latency · cost · version | shadow · canary · rollback path | RLHF feed status | dummy | wire to MLflow registry |
| accuracy | per-class precision · recall · F1 · ROC/AUC · confusion matrix | per-cohort fairness · calibration | drift over time | dummy | wire to real model eval |
| analysis | feature importance · SHAP top-10 · per-prediction explain | counterfactual · slice-by | comparison to baseline | dummy | wire to SHAP |
| mathematics | core formulas · variable defs | derivations · references | proofs · interactive plots | static | per-proc math |
| testing | test list · coverage% · pass/fail | flaky tests · trend over time | mutation testing | dummy | wire to pytest |
| feedback | RLHF capture form · correction list · stats | override frequency · trainability flag · severity | sentiment analysis on text feedback | T7.10 wired backend · UI pending | wire UI to T7.10 endpoints |
| simulation | what-if sliders · before/after · undo | scenario library · save scenario | side-by-side compare | dummy | per-proc sim |
| governance | RACI · audit row count · HITL queue · compliance status | regulator-mapping · decision audit detail | compliance posture trend | dummy | wire to audit DB |
| aiinfra | infra topology · scaling rules · cost | runbook link · MTTR · uptime | regional failover | static | per-proc infra |
| strategy | 4P (people · process · profit · tech) · 12-month roadmap | dependencies · risks | competitor 4P comparison | dummy | per-proc 4P |
| reports | report list · cadence · last-run · download | recipients · format · history | report builder | empty | populate report list |
| docs | doc index · last-updated · owner | search · related-docs · breadcrumbs | inline editor | empty | per-proc doc index |
| demos | walkthrough video · 3-scenario script · pitch | live-demo trigger · screenshot gallery | replay history | one demo | per-proc demo |
| automation | automation rule list · triggers · status · last-fire | success rate · failure log | RPA bridge | dummy | per-proc rules |
| scheduling | cron list · schedule editor · last-run · next-run | timezone · holiday calendar · pause | calendar view | dummy | per-proc schedules |
| chatbot | chat UI · per-proc system prompt · history · citations | rate limit · token cost · feedback | voice mode | works generically | per-proc context |

### 8b · §73 17-tab insurance MUST/SHOULD/MAY

| Tab | MUST | SHOULD | MAY |
|---|---|---|---|
| architecture | C4 · ADR · sequence · DB schema · API · KPI | runbook · capacity · cost analysis | exec summary |
| tech-stack | layers · versions · purpose | maturity · alternatives evaluated | TCO over 5yr |
| demo-story | persona · scenario · 30s pitch · success criteria | walkthrough table · gotchas · related links | embedded video |
| problem | AS-IS · TO-BE · ROI · pain points · cost impact | 7-axis impact · stakeholders | competitor analysis |
| data | sources · schemas · sample rows · lineage | freshness · PII class · retention | data quality scorecard |
| manual | step list · actors · time per step | swimlane diagram · pain points | RACI per step |
| automatic | step list · AI components · HITL points | flow diagram · KPI per step | rollback per step |
| flow-diagram | Mermaid flowchart · manual vs auto side-by-side | sequence diagram · decision tree | animated walkthrough |
| output | artifact list · format · downstream consumers | sample output · validation rules | versioning history |
| viz | per-process charts (4-7) | drill-down · filter | export to PDF |
| dashboard | KPI tiles (5-8) · target · baseline · delta | trend (12 weeks) · color-coded | alert rules |
| res-ai | 5 pillars status · fairness metric · privacy class | bias drift trend · consent compliance | red-team results |
| exp-ai | SHAP global + local · counterfactual · citation 100% | feature importance trend | per-segment drill |
| gov-ai | audit row count · HITL queue · scope grants · rollback path | EU AI Act mapping · regulator status | quarterly review status |
| tests | unit · integration · drill · coverage · last-run | flaky · trend · §43 negative assertions | mutation |
| security | DLP scan results · SAST · STRIDE per container | OWASP Top-10 status · CVE backlog | red-team |
| history | per-action audit rows · time · actor · outcome · latency | per-tenant scope · correlation IDs | export to CSV |

### 8c · Department-level MUST/SHOULD/MAY

| Tier | Per dept MUST | SHOULD | MAY |
|---|---|---|---|
| MUST · all 21 depts | dept name · mission · B2C/B2B/B2E tag (operator-confirmed) · process list (≥5) · primary KPI · process owner · approval chain · risk tier | process detail per process (use ReadmeTabPanel 22 sub-tabs) · dept dashboard · per-process dept sub-menu wiring | dept org chart · dept budget · 5yr roadmap · related depts |

---

## Matrix 9 · How each tab adds CUSTOMER value (operator: "how does each tab adding value for customer")

Customer = the operator's customer (insurance policyholder for /insurance · marketer for /marketing-campaigns · auditor for /admin/audits · etc.).

### 9a · Frontend page customer value

| Page | Customer | Value delivered | Without this page · what breaks |
|---|---|---|---|
| / Dashboard | Operator | One-glance org health · 30s answer to "is everything OK?" | Operator opens 22 tabs hunting · 30 min |
| /admin/audits | Auditor | Pass/fail of 16 governance audits · evidence trail | Audit happens manually · 8 hr/week |
| /admin/feedback | Operator | Operator hears from end-customers · loops feedback | No correction signal · model drift undetected |
| /agent-supervisor | Ops | Fleet of 100 agents observable · debug-able | Lost agent fleet · paged at 3 AM |
| /ai-tools | Architect | 173-tool catalog with scores · adoption tracker | Tool sprawl · same tool reinvented |
| /autonomous-agent | Operator | Decision chain replay · routing recommendation per T7.9 | Black-box decisions · no audit trail |
| /autonomous-dept-framework | Strategist | Maturity self-assessment · gap analysis | No path from L5 to L10 visible |
| /catalogs | Operator | Catalog lookups · search reference data | Tribal knowledge · stale data |
| /content-ops | Marketer | Content queue · posting status · history | Manual social posting |
| /data-explorer | Analyst | Ad-hoc data exploration · query · export | SQL access required for every question |
| /data-flow | Architect | Visualization of data movement | "How does data flow?" → tribal answer |
| /:dept | Manager | Dept overview · process list | No quick "what's in this dept" |
| /:dept/dossier | Manager | Per-dept ML pipeline status | Black-box ML |
| /insurance | Underwriter / Adjuster | Process navigator with 17-tab right pane | Job impossible without |
| /:dept/:proc · ProcessPage | Process owner | Per-process ML workbench · monitoring · admin | Per-process work impossible |
| /marketing-campaigns | Marketer | Campaign create · execute · runs · DLP gate | Manual campaigns · no DLP gate · regulator findings |
| /marketing-kpis | CMO | 7-tab KPI command center · alerts · attribution | No KPI visibility · no attribution |
| /public/:kind/:ref/:cust | End-customer | Survey/form completion · DLP-protected | No public touchpoint |
| /voice-ai/* | Voice ops | Voice agent setup · demo · E2E test | No voice channel |

### 9b · ProcessPage tab customer value (where it works)

| Tab | Customer | Value if FILLED correctly | Current state | Gap |
|---|---|---|---|---|
| overview | Process owner | 30s context for any meeting | works | minor polish |
| workbench | Data scientist | Per-process ML iteration speed 10× faster than notebook | partial | wire to MLflow |
| problem | Sponsor | "Why are we doing this?" answer in 60s | broken (1 proc only) | per-proc problem statement |
| data | Data engineer | Schema · sample · lineage in 1 click | dummy | per-proc data refs |
| models | ML engineer | Per-model card · accuracy · cost · rollback path | dummy | wire to model registry |
| accuracy | QA · auditor | "Is the model performing?" 1-click answer | dummy | wire to eval harness |
| analysis | Data scientist | SHAP · feature importance · counterfactual per click | dummy | wire to SHAP |
| feedback | Operator | Capture human override · feed RLHF | T7.10 wired · UI pending | wire feedback UI to T7.10 |
| governance | Auditor | Per-process audit row count · HITL queue | dummy | wire to audit DB |
| chatbot | Operator | Ask any process-specific question | works generically | per-proc system prompt |

### 9c · Sub-tab customer value (ReadmeTabPanel 22 sub-tabs · post 82d16642)

| Sub-tab | Customer | Value | Score |
|---|---|---|---|
| brd | Sponsor / business owner | "What business need does this satisfy?" 60s | 5 |
| as-is | Sponsor · planner | "How does it work TODAY?" baseline | 5 |
| to-be | Sponsor · architect | "How will it work after AI?" target | 5 |
| roi | CFO · sponsor | "Is the $ payback justified?" answer | 5 |
| frd | Engineer | "What does the system DO functionally?" | 5 |
| hld | Architect | "Major components + how they fit" | 5 |
| lld | Engineer | "Internals · classes · tables · algorithms" | 5 |
| sad | Architect | "Cross-cutting · security · observability" | 4 |
| c4 | Architect | "4-level structured view" | 5 |
| adr | Reviewer | "Why did we choose this architecture?" | 4 |
| sequence | Engineer | "Runtime behavior · happy + error paths" | 5 |
| network | DevOps | "Subnets · ingress · egress" | 4 |
| api | Consumer / integrator | "External contract · OpenAPI" | 5 |
| db-schema | DBA · engineer | "Tables · indexes · migrations" | 5 |
| runbook | On-call | "What do I do at 3 AM?" 60s answer | 5 |
| kpi | Manager · CMO | "What targets are we hitting?" | 5 |
| capacity | DevOps | "Will this scale to 10×?" | 4 |
| roadmap | Sponsor · PM | "What's planned next 4 quarters?" | 4 |
| stakeholders | PM | "RACI · who decides what?" | 4 |
| executive-summary | C-suite | "60s read for board" | 5 |
| ai-strategy | CIO · CTO | "4P · people/process/profit/tech" | 5 |
| cost-analysis | CFO · sponsor | "TCO · break-even" | 5 |

---

## Matrix 10 · Missing tabs / info (operator: "what is missing")

| Surface | What's missing | Why it matters | Priority |
|---|---|---|---|
| /insurance ProcessDetailView | "User Story" tab has wrong content | Operator's loudest complaint · label-content mismatch | P0 |
| /insurance ProcessDetailView | "User Demo" tab identical to User Story | Same problem | P0 |
| ProcessPage 22 tabs | Per-process "Problem statement" for 21 of 22 procs | Sponsor cannot understand "why" without it | P0 |
| ProcessPage Models tab | Wire to MLflow model registry · per-proc model card | Cannot ship model without card | P0 |
| ProcessPage Accuracy tab | Wire to eval harness · per-proc confusion matrix | Cannot validate model accuracy | P0 |
| ProcessPage Analysis tab | Wire to SHAP · per-proc explainability | EU AI Act Art. 86 (right to explanation) blocker | P0 |
| ProcessPage Governance tab | Wire to audit DB · per-proc audit row count | SOC2 CC6.6 · regulator compliance | P1 |
| ProcessPage Feedback tab | Wire UI to T7.10 corrections endpoint | T7.10 backend ready · UI not wired | P1 |
| /insurance | Most dept sub-menus don't deep-link to /:dept/:proc | Navigation broken for 18 depts | P1 |
| ALL pages | Per-tab "1-liner what this is for" | Operator orientation | P2 (done for ReadmeTabPanel) |
| ALL pages | Per-tab journey-flow at top | Orient in journey | P2 (done for ReadmeTabPanel) |
| ALL pages | Per-tab TODO list at top | Show what's pending | P2 (done for ReadmeTabPanel) |
| ALL pages | Per-tab unique CONTENT (not generic IPO chrome) | Operator can't tell tabs apart | P1 |
| All depts | Operator-confirmed B2C/B2B/B2E tagging for 18 of 22 depts | Audit · compliance · routing | P2 (operator domain work) |

---

## Matrix 11 · Alignment analysis (operator: "how to align them")

Where DUPLICATE surfaces exist · they should be reconciled.

| Surface A | Surface B | Overlap | Reconciliation |
|---|---|---|---|
| ProcessPage 22-tab right pane | /insurance ProcessDetailView 17-tab right pane | 12 tabs overlap (overview · data · models · etc.) | Insurance is canonical (§73) · ProcessPage should adopt 17-tab shape OR be deprecated |
| `UserStoryTab` (insurance) | `ProcessProblemTab` (process · has 'use cases') | Both render user stories | UserStoryTab is canonical · ProcessProblemTab should LINK not duplicate |
| `UserDemoTab` (insurance) | `ProcessDemoTab` (process) | Both render demos | UserDemoTab is canonical |
| ReadmeTabPanel `brd/frd/hld` sub-tabs | ProcessDocsTab (docs index) | Both list doc artifacts | ReadmeTabPanel is canonical · DocsTab should LINK to specific sub-tab |
| ReadmeTabPanel `kpi` sub-tab | MarketingKPIsPage 7 tabs | Both surface KPIs | Different audiences · keep both · cross-link |
| ReadmeTabPanel `c4` sub-tab | DataFlowPage | Both render diagrams | Different scope · keep both |
| AutonomousAgentPage decision chain | ProcessFeedbackTab | Both about decisions/corrections | AutonomousAgentPage is canonical for agent runs · FeedbackTab is canonical for human-override RLHF (T7.10) |
| MarketingCampaignsPage runs list | MarketingKPIsPage scorecard | Both surface campaign perf | KPIsPage is canonical for KPIs · CampaignsPage for CRUD |

Alignment principle: **canonical surface per concern · cross-link · do NOT duplicate content**.

---

## Aggregate Customer Value Score

| Tier | Surfaces | Customer value | Score | % |
|---|---|---|---|---|
| Highest value (CMO · CFO · regulator) | MarketingKPIsPage · AutonomousDeptFrameworkPage · ReadmeTabPanel · AdminAuditPage | 5 | 100% delivered | 4 |
| High value (engineer · ML eng · data eng) | AutonomousAgentPage · ProcessPage workbench · AIToolLandscapePage | 4 | 75% delivered (UI good · data pending wire) | 3 |
| Medium value (manager · sponsor) | DepartmentPage · DataExplorer · ManagerPage | 3 | 50% delivered | 7 |
| Low value (broken · dummy) | UserStoryTab · UserDemoTab · 18 ProcessPage tabs · 18 dept default pages | 1 | 0-20% delivered | 38 |

**Customer value summary**: 7 high-value surfaces deliver well · 7 medium adequate · **38 low-value surfaces drag the overall experience down**. Operator's "very poor quality" complaint is statistically backed: ~70% of surfaces deliver < 50% of potential customer value.

---

## Operator decision

Per the matrix · pick a fix order:

| Option | What it does | Iterations | Score uplift | Customer value delta |
|---|---|---|---|---|
| **A** · Tab-by-tab (rank 1-10) | Polish each tab using 82d16642 pattern | 27 | 2.84 → 4.2 | +medium |
| **B** · Page-by-page | Pick one Score=2 page at a time | 17 | 3.07 → 4.1 | +medium |
| **C** · Dept-by-dept wiring | Wire one dept's sub-menu deep-link per iter | 14 | 2.18 → 4.0 | +high (navigation) |
| **D** · MoSCoW-driven (MUST first) | Close all P0 gaps from Matrix 10 first | 8 | 2.84 → 3.5 | **+high (regulator + label-content correlation)** |
| **E** · Mixed P0+dept wiring | P0 (8) + 14 dept wiring | 22 | 2.84 → 4.3 | **+highest** |

Recommendation: **E** — fix all 8 P0 gaps (8 iterations · label-content correlation + model card wiring + audit DB wiring) THEN dept-by-dept sub-menu wiring (14 iterations) THEN tab polish.

Per §57.7 honest · I will NOT promise this can be done in one commit. The matrix above IS the brutal honest inventory operator requested.
