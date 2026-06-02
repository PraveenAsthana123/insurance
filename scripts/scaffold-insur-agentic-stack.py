#!/usr/bin/env python3
"""
Scaffold INSUR_AGENTIC_STACK.md per dept (§64.40.8 + §67).

Each dept gets a stub describing:
  - Which Layer-10 enterprise apps the dept may touch
  - Required scopes per app
  - 10-layer agentic execution flow (§64.40)
  - 5-OS canonical layering (§67) the dept's agent actions traverse
  - Decision audit row contract (§38.3)
  - HITL escalation path

Per global §59 (MDD) — single per-dept dict drives all 19 files.
Idempotent: re-running preserves any operator edits below the auto-generated
marker. Pass --force to overwrite.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEPTS_ROOT = REPO_ROOT / "global-ai-org" / "departments"

# Per-dept Layer-10 enterprise apps (the systems each dept may take actions on).
# Scopes follow §47.6 SOC2 CC6.2 RBAC naming: <system>.<verb>.<resource>
ENTERPRISE_APPS: dict[str, list[tuple[str, str, str]]] = {
    # dept -> list of (app_name, allowed_action, required_scope)
    "sales": [
        ("Salesforce CRM",      "create/update lead, opportunity",   "crm.write.lead, crm.write.opportunity"),
        ("HubSpot",             "log sequences + activities",        "hubspot.write.sequence"),
        ("DocuSign",            "request signature (NOT auto-sign)", "docusign.write.envelope"),
        ("LinkedIn Sales Nav",  "research only (read)",              "lsn.read.profile"),
    ],
    "finance": [
        ("SAP S/4HANA",         "post journal entry (HITL required)", "sap.write.journal"),
        ("NetSuite",            "create invoice, credit memo",        "netsuite.write.invoice"),
        ("Stripe",              "issue refund (HITL required)",       "stripe.write.refund"),
        ("Plaid",               "read bank transactions",             "plaid.read.transaction"),
    ],
    "hr": [
        ("Workday",             "create/update employee record",      "workday.write.employee"),
        ("Greenhouse",          "schedule interview, send offer",     "greenhouse.write.interview"),
        ("BambooHR",            "log PTO request, leave balance",     "bamboohr.write.pto"),
        ("LinkedIn Recruiter",  "send InMail (HITL on first)",        "lir.write.message"),
    ],
    "procurement": [
        ("Coupa",               "create PO (HITL > $10k)",            "coupa.write.po"),
        ("SAP Ariba",           "issue RFQ, evaluate bids",           "ariba.write.rfq"),
        ("Jaggaer",             "vendor onboarding",                  "jaggaer.write.vendor"),
    ],
    "supply-chain": [
        ("SAP IBP",             "update demand forecast",             "ibp.write.forecast"),
        ("Oracle SCM",          "create transfer order",              "oracle-scm.write.transfer"),
        ("Llamasoft",           "scenario model only (read)",         "llamasoft.read.scenario"),
        ("Shippo / FedEx API",  "create shipping label",              "shippo.write.label"),
    ],
    "manufacturing": [
        ("SAP PP",              "release production order (HITL)",    "sap-pp.write.order"),
        ("MES (Rockwell)",      "log defect, downtime",               "mes.write.event"),
        ("PLM (Windchill)",     "read BOM, change request",           "plm.read.bom"),
    ],
    "operations": [
        ("ServiceNow",          "open/update ITSM ticket",            "snow.write.ticket"),
        ("PagerDuty",           "trigger incident",                   "pd.write.incident"),
        ("Datadog",             "read metrics + create monitor",      "dd.write.monitor"),
        ("Atlassian Jira",      "open/update issue",                  "jira.write.issue"),
    ],
    "engineering": [
        ("GitHub",              "open PR, comment (NOT push to main)","gh.write.pr"),
        ("Jira",                "transition issue status",            "jira.write.issue"),
        ("Linear",              "create/move ticket",                 "linear.write.issue"),
        ("CI/CD (GH Actions)",  "trigger workflow (HITL)",            "gh.write.workflow"),
    ],
    "it-operations": [
        ("Okta",                "request access (HITL approve)",      "okta.write.access-request"),
        ("AWS IAM",              "read policies (NOT write)",          "iam.read.policy"),
        ("Datadog",             "create/update monitor",              "dd.write.monitor"),
        ("PagerDuty",           "trigger + ack incident",             "pd.write.incident"),
    ],
    "marketing": [
        ("HubSpot",             "create email campaign (HITL send)",  "hubspot.write.campaign"),
        ("Google Ads",          "draft ad copy (NOT auto-publish)",   "gads.write.draft"),
        ("Meta Business",       "schedule post (HITL approve)",       "meta.write.scheduled-post"),
        ("Mixpanel / GA4",      "read events + funnels",              "analytics.read.event"),
    ],
    "digital-marketing": [
        ("Marketo",             "trigger smart campaign",             "marketo.write.campaign"),
        ("Adobe Analytics",     "read funnel + segment",              "adobe.read.segment"),
        ("Mailchimp",           "draft email (HITL send)",            "mailchimp.write.draft"),
        ("SEMrush",             "read keyword research",              "semrush.read.kw"),
    ],
    "customer-experience": [
        ("Zendesk",             "open/update support ticket",         "zendesk.write.ticket"),
        ("Intercom",            "send auto-reply (HITL on first)",    "intercom.write.message"),
        ("Qualtrics",           "send NPS survey",                    "qualtrics.write.survey"),
        ("Gainsight",           "log CSM touchpoint",                 "gainsight.write.touchpoint"),
    ],
    "customer-support": [
        ("Zendesk",             "open/update ticket",                 "zendesk.write.ticket"),
        ("Freshdesk",           "open ticket (alt)",                  "freshdesk.write.ticket"),
        ("Slack (#cs)",         "post escalation alert",              "slack.write.channel"),
        ("Knowledge base",      "search articles (read)",             "kb.read.article"),
    ],
    "retail-operations": [
        ("SAP Retail",          "update inventory (HITL > 100 units)","sap-retail.write.inventory"),
        ("Shopify Admin",       "create/update product",              "shopify.write.product"),
        ("Lightspeed POS",      "read sales + create discount",       "ls.write.discount"),
    ],
    "e-commerce": [
        ("Shopify",             "update product, inventory",          "shopify.write.product"),
        ("BigCommerce",         "update product, inventory (alt)",    "bc.write.product"),
        ("Algolia",             "reindex catalog",                    "algolia.write.index"),
        ("Klaviyo",             "trigger transactional email",        "klaviyo.write.email"),
    ],
    "product-rd": [
        ("PLM (Windchill)",     "create change request",              "plm.write.change-request"),
        ("Confluence / Notion", "publish design doc",                 "wiki.write.page"),
        ("Figma",               "read design (HITL on write)",        "figma.read.file"),
        ("Jira",                "create epic, story",                 "jira.write.issue"),
    ],
    "legal": [
        ("DocuSign",            "request signature (HITL on sign)",   "docusign.write.envelope"),
        ("Ironclad",            "draft contract (HITL approve)",      "ironclad.write.draft"),
        ("LegalSifter",         "read contract analysis",             "legalsifter.read.review"),
    ],
    "security-operations": [
        ("Splunk",              "read events + create alert",         "splunk.write.alert"),
        ("CrowdStrike",         "isolate host (HITL — high blast)",   "cs.write.isolation"),
        ("Okta",                "force MFA reset (HITL)",             "okta.write.mfa-reset"),
        ("PagerDuty",           "trigger SecOps incident",            "pd.write.incident"),
        ("ServiceNow SecOps",   "open SIR ticket",                    "snow-secops.write.sir"),
    ],
    "executive-leadership": [
        ("Tableau / PowerBI",   "read board dashboard",               "bi.read.dashboard"),
        ("Looker",              "read curated metrics",               "looker.read.metric"),
        ("Email (Outlook)",     "draft (HITL send)",                  "email.write.draft"),
        ("Calendar (Outlook)",  "read availability + schedule",       "cal.write.event"),
    ],
}

DEPT_TITLE = {
    "sales": "Sales", "finance": "Finance", "hr": "HR",
    "procurement": "Procurement", "supply-chain": "Supply Chain",
    "manufacturing": "Manufacturing", "operations": "Operations",
    "engineering": "Engineering", "it-operations": "IT Operations",
    "marketing": "Marketing", "digital-marketing": "Digital Marketing",
    "customer-experience": "Customer Experience",
    "customer-support": "Customer Support",
    "retail-operations": "Retail Operations", "e-commerce": "E-Commerce",
    "product-rd": "Product R&D", "legal": "Legal",
    "security-operations": "Security Operations",
    "executive-leadership": "Executive Leadership",
}

TEMPLATE = """# INSUR Beverage — {title} — Agentic Stack

> Per global CLAUDE.md §64.40 + §64.40.8 + §67 — every department MUST have
> this artifact. It names the Layer-10 enterprise apps this dept may take
> actions against and the required scope for each. The {title} manager owns
> reviews; AI-Strategy owns scope grants.

## Owner

**Manager ({title})** + **AI-Strategy** + **Information Security**.

## 10-layer execution flow (§64.40)

Every {title} agent action MUST traverse layers 1 → 10 in order. Skipping any
layer is a release blocker.

```
1.  User Goal                 — chat / form / API
2.  Council of Agents         — author + reviewer + chair triage
3.  Planner Agent             — task DAG with dependencies
4.  Task Decomposition        — atomic actions; each tagged with scope_required
5.  Policy / Governance       — RBAC / cost / safety gates (§47.6 + §40)
6.  Computer-Using Agent      — executes against the chosen interface
7.  Stagehand / Browser-Use   — semantic browser primitives
8.  Playwright                — low-level browser automation
9.  Browser / Desktop / API   — runtime target
10. Enterprise Application    — persistent side-effect (see below)
```

## 5-OS layering (§67)

| OS | What it gives {title} agents |
|---|---|
| **MCP** | Standardised tool calls — credit-check, address-verify, vendor-lookup, etc. |
| **Paperclip** | Long-running business workflows (multi-week deal cycles, audits) |
| **OpenClaw** | Execution-level orchestration — retry, reflection, state machines |
| **Harness Agent** | Cross-agent sync between {title} and adjacent depts (handoffs) |
| **PoliAI** | Runtime policy enforcement — every action passes a policy gate first |

## Allowed Layer-10 enterprise applications

| Application | Allowed action | Required scope |
|---|---|---|
{apps_table}

## Scope grant model

Scopes are **not blanket** — they're granted per `(user, agent_role, app, action)`
tuple with an expiry. New scope grants require an InfoSec + AI-Strategy
co-approval. The grant lives in [config/scopes/{dept}.yaml](../../../../config/scopes/{dept}.yaml)
(create the file on first non-trivial grant).

Default scope ceiling for this dept: **READ-ONLY** until explicit write grant.

## Decision audit row (§38.3)

Every action this dept's agents take writes one audit row to the global
decision-audit table. The row's `tool` field is the Layer-10 app name; the
`actor` is the agent (or HITL approver if escalated).

Required fields specific to this dept:
- `request_id` — propagated from layer 1 (per §57.6)
- `tenant_id`, `actor`, `tool`, `latency_ms`, `outcome` — canonical (§57.6)
- `scope_granted` — which scope this action used; missing = denial
- `goal_text` — natural-language description (PII-redacted per §47.6)
- `external_record_id` — the system-of-record ID returned by Layer-10
- `human_override` — true if HITL was required and granted

## HITL escalation path

| Condition | Route to |
|---|---|
| `scope_required` not in `scope_granted` | InfoSec + AI-Strategy co-approval |
| Action cost > daily budget | Finance approval |
| Action irreversible (deletion, signing) | Manager ({title}) approval |
| Confidence < 0.6 | Manager ({title}) review queue |
| Fairness flag triggered | AI-Strategy + Legal review |

Approval surface: `/api/v1/agent-platform/cua/execute` body sets
`require_human_approval=true`; frontend renders the queue at
`/insur/{dept}/agentic` (per §64.40.5).

## Rollback plan

Every Layer-10 write action MUST have a tested rollback before scope grant.
Per-app rollback specs live in
[ops/runbook/{dept}-agentic-rollback.md](../../../../ops/runbook/).

## Drill

`tests/drills/drill_per_dept_artifacts.py` enforces this file's existence
(release blocker). A future drill `tests/drills/drill_agentic_scope_grants.py`
will enforce every grant in `config/scopes/{dept}.yaml` has a matching audit
row + a rollback runbook entry.

## Composes with

- §38 (governance) — every action writes an audit row
- §40 (decision system) — confidence + rule gating before Layer-6 fires
- §47.6 (security) — RBAC enforced at the gateway per SOC2 CC6.2
- §48 (explainability) — chain-of-thought + reasoning trace per row
- §57.6 (canonical fields) — `request_id` propagated 1 → 10
- §64.34 (simulation) — every action above runnable in simulation mode first
- §64.43 (patterns) — this dept defaults to Hub-and-Spoke (§64.43 #1) for
  background fan-out and Hierarchical (§64.43 #4) for multi-step user goals

<!-- AUTO-GENERATED-MARKER — operator edits below this line are preserved on re-scaffold -->
"""


def render(dept: str) -> str:
    apps = ENTERPRISE_APPS.get(dept, [])
    if not apps:
        apps_table = "| _TODO — fill in per dept_ | _action_ | _scope_ |"
    else:
        apps_table = "\n".join(f"| {a} | {act} | `{s}` |" for a, act, s in apps)
    return TEMPLATE.format(
        title=DEPT_TITLE.get(dept, dept.replace("-", " ").title()),
        dept=dept,
        apps_table=apps_table,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="overwrite existing files")
    args = parser.parse_args()

    if not DEPTS_ROOT.exists():
        print(f"ERROR: departments root not found: {DEPTS_ROOT}", file=sys.stderr)
        return 2

    written = skipped = 0
    for dept_dir in sorted(DEPTS_ROOT.iterdir()):
        if not dept_dir.is_dir():
            continue
        dept = dept_dir.name
        target = dept_dir / "business-layer" / "INSUR_AGENTIC_STACK.md"
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists() and not args.force:
            skipped += 1
            continue
        target.write_text(render(dept))
        written += 1
    print(f"scaffold-insur-agentic-stack: written={written} skipped={skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
