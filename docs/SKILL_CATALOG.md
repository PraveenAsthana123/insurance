# SKILL_CATALOG · 2026-06-10 22:08 UTC · 293 skills

- Business skills (Iter 37 seeded): **25**
- System skills (one per endpoint · Iter 45): **268**

## Business skills (25) · reusable across agents

| Skill ID | Name | Category | Risk | Mode | Agents Using | Description |
|---|---|---|---|---|---|---|
| `classify_incident` | Classify Incident | Analysis | Low | Automatic | 13 | Classify Incident · reusable skill · Analysis category |
| `find_service_owner` | Find Service Owner | Catalog | Low | Automatic | 2 | Find Service Owner · reusable skill · Catalog category |
| `notify_team` | Notify Team | Communication | Low | Automatic | 18 | Notify Team · reusable skill · Communication category |
| `audit_decision` | Audit Decision | Compliance | Low | Automatic | 22 | Audit Decision · reusable skill · Compliance category |
| `answer_faq` | Answer FAQ | Conversational | Low | Automatic | 18 | Answer FAQ · reusable skill · Conversational category |
| `enrich_pr` | Enrich PR with context | DevOps | Low | Automatic | 14 | Enrich PR with context · reusable skill · DevOps category |
| `review_code` | Code Review | DevOps | Medium | Automatic | 14 | Code Review · reusable skill · DevOps category |
| `analyze_logs` | Analyze Logs | Diagnostic | Low | Automatic | 23 | Analyze Logs · reusable skill · Diagnostic category |
| `check_cloud_health` | Check Cloud Health | Diagnostic | Low | Automatic | 8 | Check Cloud Health · reusable skill · Diagnostic category |
| `check_kubernetes_pods` | Check Kubernetes Pods | Diagnostic | Medium | Automatic | 6 | Check Kubernetes Pods · reusable skill · Diagnostic category |
| `draft_communication` | Draft Communication | GenAI | Low | Automatic | 22 | Draft Communication · reusable skill · GenAI category |
| `request_approval` | Request Approval | Governance | Low | Automatic | 12 | Request Approval · reusable skill · Governance category |
| `escalate_to_human` | Escalate to Human | HITL | Low | Automatic | 8 | Escalate to Human · reusable skill · HITL category |
| `score_fraud_risk` | Score Fraud Risk | ML | Medium | Automatic | 22 | Score Fraud Risk · reusable skill · ML category |
| `assess_damage` | Assess Damage | ML/CV | Medium | Automatic | 16 | Assess Damage · reusable skill · ML/CV category |
| `extract_claim_data` | Extract Claim Data | OCR/Parsing | Low | Automatic | 15 | Extract Claim Data · reusable skill · OCR/Parsing category |
| `rate_quote` | Generate Quote | Pricing | Medium | Automatic | 21 | Generate Quote · reusable skill · Pricing category |
| `detect_pii` | Detect PII | Privacy | Medium | Automatic | 17 | Detect PII · reusable skill · Privacy category |
| `generate_rca` | Generate RCA | Reasoning | Medium | Automatic | 7 | Generate RCA · reusable skill · Reasoning category |
| `restart_pod` | Restart Pod | Remediation | High | Automatic | 5 | Restart Pod · reusable skill · Remediation category |
| `rollback_deployment` | Rollback Deployment | Remediation | High | Automatic | 4 | Rollback Deployment · reusable skill · Remediation category |
| `validate_coverage` | Validate Coverage | Rules | Medium | Automatic | 33 | Validate Coverage · reusable skill · Rules category |
| `scan_secrets` | Scan for Secrets | Security | High | Automatic | 17 | Scan for Secrets · reusable skill · Security category |
| `verify_identity` | Verify Customer Identity | Security | High | Automatic | 27 | Verify Customer Identity · reusable skill · Security category |
| `create_ticket` | Create Ticket | Workflow | Medium | Automatic | 19 | Create Ticket · reusable skill · Workflow category |

## System skills (268) · one per (method, path) endpoint

| Skill ID | Endpoint | Risk |
|---|---|---|
| `sys_ai_tool_registry_get_/api/v1/ai_tools/by_phase/{phase}` | GET /api/v1/ai-tools/by-phase/{phase} | Low |
| `sys_ai_tool_registry_get_/api/v1/ai_tools/categories` | GET /api/v1/ai-tools/categories | Low |
| `sys_ai_tool_registry_get_/api/v1/ai_tools/health` | GET /api/v1/ai-tools/health | Low |
| `sys_ai_tool_registry_get_/api/v1/ai_tools/stats` | GET /api/v1/ai-tools/stats | Low |
| `sys_ai_tool_registry_get_/api/v1/ai_tools/tools` | GET /api/v1/ai-tools/tools | Low |
| `sys_ai_tool_registry_get_/api/v1/ai_tools/tools/{tool_id}` | GET /api/v1/ai-tools/tools/{tool_id} | Low |
| `sys_ai_tool_registry_get_/api/v1/ai_tools/top_stack` | GET /api/v1/ai-tools/top-stack | Low |
| `sys_alerts_get_/api/v1/alerts/activity` | GET /api/v1/alerts/activity | Low |
| `sys_alerts_get_/api/v1/alerts/counts` | GET /api/v1/alerts/counts | Low |
| `sys_alerts_get_/api/v1/alerts/health` | GET /api/v1/alerts/health | Low |
| `sys_alerts_get_/api/v1/alerts/stream` | GET /api/v1/alerts/stream | Low |
| `sys_alerts_post_/api/v1/alerts/activity` | POST /api/v1/alerts/activity | Medium |
| `sys_alerts_post_/api/v1/alerts/hitl/bulk` | POST /api/v1/alerts/hitl/bulk | Medium |
| `sys_api_changelog_get_/api/v1/changelog` | GET /api/v1/changelog | Low |
| `sys_api_changelog_get_/api/v1/changelog/health` | GET /api/v1/changelog/health | Low |
| `sys_api_changelog_get_/api/v1/changelog/summary` | GET /api/v1/changelog/summary | Low |
| `sys_approval_workflow_get_/api/v1/approvals` | GET /api/v1/approvals | Low |
| `sys_approval_workflow_get_/api/v1/approvals/health` | GET /api/v1/approvals/health | Low |
| `sys_approval_workflow_get_/api/v1/approvals/{req_id}` | GET /api/v1/approvals/{req_id} | Low |
| `sys_approval_workflow_post_/api/v1/approvals/request` | POST /api/v1/approvals/request | Medium |
| `sys_approval_workflow_post_/api/v1/approvals/{req_id}/decide` | POST /api/v1/approvals/{req_id}/decide | Medium |
| `sys_approval_workflow_post_/api/v1/approvals/{req_id}/withdraw` | POST /api/v1/approvals/{req_id}/withdraw | Medium |
| `sys_attribution_get_/api/v1/attribution/compare` | GET /api/v1/attribution/compare | Low |
| `sys_attribution_get_/api/v1/attribution/compute` | GET /api/v1/attribution/compute | Low |
| `sys_attribution_get_/api/v1/attribution/health` | GET /api/v1/attribution/health | Low |
| `sys_attribution_get_/api/v1/attribution/touchpoints` | GET /api/v1/attribution/touchpoints | Low |
| `sys_audit_chain_get_/api/v1/audit_chain/health` | GET /api/v1/audit-chain/health | Low |
| `sys_audit_chain_get_/api/v1/audit_chain/recent` | GET /api/v1/audit-chain/recent | Low |
| `sys_audit_chain_get_/api/v1/audit_chain/verify` | GET /api/v1/audit-chain/verify | Low |
| `sys_audit_chain_post_/api/v1/audit_chain/append` | POST /api/v1/audit-chain/append | Medium |
| `sys_audit_search_get_/api/v1/audit_search` | GET /api/v1/audit-search | Low |
| `sys_audit_search_get_/api/v1/audit_search/export` | GET /api/v1/audit-search/export | Low |
| `sys_audit_search_get_/api/v1/audit_search/health` | GET /api/v1/audit-search/health | Low |
| `sys_audit_search_get_/api/v1/audit_search/stats` | GET /api/v1/audit-search/stats | Low |
| `sys_autonomous_dept_registry_get_/api/v1/autonomous_dept/browser_stack` | GET /api/v1/autonomous-dept/browser-stack | Low |
| `sys_autonomous_dept_registry_get_/api/v1/autonomous_dept/contact_center` | GET /api/v1/autonomous-dept/contact-center | Low |
| `sys_autonomous_dept_registry_get_/api/v1/autonomous_dept/governance` | GET /api/v1/autonomous-dept/governance | Low |
| `sys_autonomous_dept_registry_get_/api/v1/autonomous_dept/health` | GET /api/v1/autonomous-dept/health | Low |
| `sys_autonomous_dept_registry_get_/api/v1/autonomous_dept/hitl_tiers` | GET /api/v1/autonomous-dept/hitl-tiers | Low |
| `sys_autonomous_dept_registry_get_/api/v1/autonomous_dept/hybrids` | GET /api/v1/autonomous-dept/hybrids | Low |
| `sys_autonomous_dept_registry_get_/api/v1/autonomous_dept/marketing_stack` | GET /api/v1/autonomous-dept/marketing-stack | Low |
| `sys_autonomous_dept_registry_get_/api/v1/autonomous_dept/maturity` | GET /api/v1/autonomous-dept/maturity | Low |
| `sys_autonomous_dept_registry_get_/api/v1/autonomous_dept/mcp_categories` | GET /api/v1/autonomous-dept/mcp-categories | Low |
| `sys_autonomous_dept_registry_get_/api/v1/autonomous_dept/stats` | GET /api/v1/autonomous-dept/stats | Low |
| `sys_comments_get_/api/v1/comments/health` | GET /api/v1/comments/health | Low |
| `sys_comments_get_/api/v1/comments/{panel_id}/{process_id}` | GET /api/v1/comments/{panel_id}/{process_id} | Low |
| `sys_comments_post_/api/v1/comments` | POST /api/v1/comments | Medium |
| `sys_content_ops_get_/api/v1/content_ops/contacts` | GET /api/v1/content-ops/contacts | Low |
| `sys_content_ops_get_/api/v1/content_ops/health` | GET /api/v1/content-ops/health | Low |
| `sys_content_ops_get_/api/v1/content_ops/postings` | GET /api/v1/content-ops/postings | Low |
| `sys_content_ops_get_/api/v1/content_ops/postings/monitoring` | GET /api/v1/content-ops/postings/monitoring | Low |
| `sys_content_ops_get_/api/v1/content_ops/postings/{posting_id` | GET /api/v1/content-ops/postings/{posting_id} | Low |
| `sys_content_ops_get_/api/v1/content_ops/schedules` | GET /api/v1/content-ops/schedules | Low |
| `sys_content_ops_get_/api/v1/content_ops/schedules/due` | GET /api/v1/content-ops/schedules/due | Low |
| `sys_content_ops_patch_/api/v1/content_ops/postings/{posting_id` | PATCH /api/v1/content-ops/postings/{posting_id} | Medium |
| `sys_content_ops_patch_/api/v1/content_ops/schedules/{schedule_` | PATCH /api/v1/content-ops/schedules/{schedule_id} | Medium |
| `sys_content_ops_post_/api/v1/content_ops/contacts` | POST /api/v1/content-ops/contacts | Medium |
| `sys_content_ops_post_/api/v1/content_ops/contacts/bulk_upload` | POST /api/v1/content-ops/contacts/bulk-upload | Medium |
| `sys_content_ops_post_/api/v1/content_ops/postings` | POST /api/v1/content-ops/postings | Medium |
| `sys_content_ops_post_/api/v1/content_ops/postings/{posting_id` | POST /api/v1/content-ops/postings/{posting_id}/publish | Medium |
| `sys_content_ops_post_/api/v1/content_ops/schedules` | POST /api/v1/content-ops/schedules | Medium |
| `sys_corrections_get_/api/v1/corrections` | GET /api/v1/corrections | Low |
| `sys_corrections_get_/api/v1/corrections/health` | GET /api/v1/corrections/health | Low |
| `sys_corrections_get_/api/v1/corrections/stats/summary` | GET /api/v1/corrections/stats/summary | Low |
| `sys_corrections_get_/api/v1/corrections/{correction_ref}` | GET /api/v1/corrections/{correction_ref} | Low |
| `sys_corrections_post_/api/v1/corrections` | POST /api/v1/corrections | Medium |
| `sys_cors_admin_get_/api/v1/cors_admin/health` | GET /api/v1/cors-admin/health | Low |
| `sys_cors_admin_get_/api/v1/cors_admin/origins` | GET /api/v1/cors-admin/origins | Low |
| `sys_cors_admin_get_/api/v1/cors_admin/rate_limits` | GET /api/v1/cors-admin/rate-limits | Low |
| `sys_cron_registry_get_/api/v1/cron_registry` | GET /api/v1/cron-registry | Low |
| `sys_cron_registry_get_/api/v1/cron_registry/by_tag` | GET /api/v1/cron-registry/by-tag | Low |
| `sys_cron_registry_get_/api/v1/cron_registry/health` | GET /api/v1/cron-registry/health | Low |
| `sys_data_pipeline_get_/api/v1/data_pipeline/health` | GET /api/v1/data-pipeline/health | Low |
| `sys_data_pipeline_get_/api/v1/data_pipeline/runs/recent` | GET /api/v1/data-pipeline/runs/recent | Low |
| `sys_data_pipeline_get_/api/v1/data_pipeline/tasks` | GET /api/v1/data-pipeline/tasks | Low |
| `sys_data_pipeline_get_/api/v1/data_pipeline/{process_id}/summa` | GET /api/v1/data-pipeline/{process_id}/summary/journey-flow | Low |
| `sys_data_pipeline_get_/api/v1/data_pipeline/{process_id}/tasks` | GET /api/v1/data-pipeline/{process_id}/tasks | Low |
| `sys_data_pipeline_get_/api/v1/data_pipeline/{process_id}/{task` | GET /api/v1/data-pipeline/{process_id}/{task_id} | Low |
| `sys_data_pipeline_post_/api/v1/data_pipeline/{process_id}/{task` | POST /api/v1/data-pipeline/{process_id}/{task_id}/run | Medium |
| `sys_deprecation_delete_/api/v1/deprecation` | DELETE /api/v1/deprecation | High |
| ... | (+188 more in DB) | |