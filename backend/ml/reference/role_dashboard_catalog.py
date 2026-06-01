"""Shared catalog for HOLY role dashboards + reports (§64.37).

Single source of truth used by:
  - backend/routers/holy.py        (serves /dashboards/{dept}/{role})
  - ~/.claude/scripts/scaffold-holy-role-dashboards.py (renders MD)
  - tests/drills/drill_role_dashboards.py (asserts coverage)

Keeps backend + scaffolder in lockstep — change once, both follow.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Tile:
    label: str
    metric_id: str   # used to fabricate synthetic data deterministically
    unit: str = ""
    higher_is_better: bool = True


@dataclass(frozen=True)
class ChartSpec:
    chart_id: str
    library: str  # "recharts" | "plotly" | "echarts" | "vega-lite"
    type: str     # "line" | "bar" | "boxplot" | "sankey" | "treemap" | "heatmap" | "scatter" | "gauge"
    title: str
    x_axis: str = "x"
    y_axis: str = "y"


@dataclass(frozen=True)
class ReportSpec:
    report_id: str
    name: str
    cadence: str  # daily / weekly / monthly / quarterly / on-demand / per-release
    format: str   # PDF / CSV / Excel / JSON / email
    recipients: str


ROLE_CATALOG: dict[str, dict[str, Any]] = {
    "admin": {
        "summary": "System health + user mgmt + feature-flag state + RBAC events",
        "tiles": [
            Tile("Active users", "active_users", ""),
            Tile("Failed logins (24h)", "failed_logins", "", higher_is_better=False),
            Tile("RBAC changes (7d)", "rbac_changes", ""),
            Tile("Feature flags ON", "flags_on", "/total"),
            Tile("System uptime", "uptime", "%"),
            Tile("Open admin tickets", "admin_tickets", "", higher_is_better=False),
        ],
        "charts": [
            ChartSpec("rbac_timeline", "recharts", "line", "RBAC changes (30d)"),
            ChartSpec("failed_login_heatmap", "plotly", "heatmap", "Failed logins (hour × day)"),
            ChartSpec("flag_adoption_funnel", "recharts", "bar", "Feature-flag adoption"),
        ],
        "reports": [
            ReportSpec("daily_ops", "Daily ops digest", "daily", "PDF", "operator + on-call"),
            ReportSpec("weekly_user_activity", "Weekly user-activity rollup", "weekly", "CSV", "manager + admin"),
            ReportSpec("monthly_rbac_audit", "Monthly RBAC audit", "monthly", "Excel", "security + compliance"),
        ],
    },
    "manager": {
        "summary": "Dept KPIs + ROI + approval queue + team performance",
        "tiles": [
            Tile("Dept KPI", "dept_kpi", ""),
            Tile("Quota attainment", "quota_attainment", "%"),
            Tile("Open approvals", "open_approvals", "", higher_is_better=False),
            Tile("Team velocity", "team_velocity", "/sprint"),
            Tile("Cost vs budget", "cost_vs_budget", "%"),
            Tile("AI auto vs HITL", "auto_hitl", "% auto"),
        ],
        "charts": [
            ChartSpec("kpi_trend_12w", "recharts", "line", "KPI trend (12 weeks)"),
            ChartSpec("approval_funnel", "recharts", "bar", "Approval funnel"),
            ChartSpec("cost_waterfall", "plotly", "waterfall", "Cost waterfall"),
        ],
        "reports": [
            ReportSpec("weekly_business_review", "Weekly business review", "weekly", "PDF", "exec + manager"),
            ReportSpec("monthly_roi", "Monthly ROI rollup", "monthly", "PDF", "exec + finance"),
            ReportSpec("quarterly_okr", "Quarterly OKR scorecard", "quarterly", "PDF", "exec + board"),
        ],
    },
    "team-member": {
        "summary": "Personal queue + my SLA + my next action",
        "tiles": [
            Tile("My open items", "my_open", "", higher_is_better=False),
            Tile("My SLA hit-rate", "my_sla", "%"),
            Tile("My this-week vs last", "my_wow", "%"),
            Tile("Inbox unread", "inbox_unread", "", higher_is_better=False),
            Tile("Mentions", "mentions", ""),
            Tile("Tasks completed (7d)", "tasks_done", ""),
        ],
        "charts": [
            ChartSpec("burndown", "recharts", "line", "My-work burn-down"),
            ChartSpec("sla_trend", "recharts", "line", "My SLA trend"),
            ChartSpec("task_type_dist", "recharts", "pie", "My task-type distribution"),
        ],
        "reports": [
            ReportSpec("daily_brief", "Daily my-work brief", "daily", "email", "self"),
            ReportSpec("weekly_output", "Weekly my-output rollup", "weekly", "CSV", "self + manager"),
            ReportSpec("monthly_impact", "Monthly my-impact summary", "monthly", "PDF", "self"),
        ],
    },
    "tester": {
        "summary": "Test coverage + defect density + flaky tests",
        "tiles": [
            Tile("Coverage %", "coverage", "%"),
            Tile("Open defects", "open_defects", "", higher_is_better=False),
            Tile("Defects/KLOC", "defect_density", "", higher_is_better=False),
            Tile("Flaky tests", "flaky_count", "", higher_is_better=False),
            Tile("Drill pass-rate", "drill_pass", "%"),
            Tile("P1/P2/P3 backlog", "backlog", "", higher_is_better=False),
        ],
        "charts": [
            ChartSpec("coverage_trend", "recharts", "line", "Coverage trend"),
            ChartSpec("defects_per_service", "recharts", "bar", "Defect density per service"),
            ChartSpec("flaky_heatmap", "plotly", "heatmap", "Flaky-test heatmap"),
        ],
        "reports": [
            ReportSpec("pre_release_test", "Pre-release test report", "per release", "PDF", "manager + dev + QA"),
            ReportSpec("weekly_defects", "Weekly defect rollup", "weekly", "CSV", "dev manager"),
            ReportSpec("monthly_test_strategy", "Monthly test-strategy review", "monthly", "PDF", "test-architect + manager"),
        ],
    },
    "security": {
        "summary": "Threat counts + MTTD/MTTR + vuln backlog",
        "tiles": [
            Tile("Open alerts", "open_alerts", "", higher_is_better=False),
            Tile("Alerts (24h)", "alerts_24h", "", higher_is_better=False),
            Tile("MTTD median", "mttd", "min", higher_is_better=False),
            Tile("MTTR median", "mttr", "min", higher_is_better=False),
            Tile("Open CVEs (≥7)", "cves", "", higher_is_better=False),
            Tile("Pen-test findings", "pentest_findings", "", higher_is_better=False),
        ],
        "charts": [
            ChartSpec("alert_volume", "recharts", "line", "Alert volume time-series"),
            ChartSpec("mttr_box", "plotly", "boxplot", "MTTR distribution"),
            ChartSpec("top_vulns_pareto", "recharts", "bar", "Top 10 vuln categories"),
        ],
        "reports": [
            ReportSpec("daily_soc_handoff", "Daily SOC handoff", "daily", "PDF", "next-shift SOC"),
            ReportSpec("weekly_security_posture", "Weekly security posture", "weekly", "PDF", "CISO + manager"),
            ReportSpec("monthly_compliance", "Monthly compliance status", "monthly", "PDF", "compliance + audit"),
        ],
    },
    "devops": {
        "summary": "DORA + infra cost + incident MTTR",
        "tiles": [
            Tile("Deploy frequency", "deploy_freq", "/day"),
            Tile("Lead time", "lead_time", "hr", higher_is_better=False),
            Tile("Change-fail rate", "cfr", "%", higher_is_better=False),
            Tile("MTTR", "mttr", "min", higher_is_better=False),
            Tile("Infra $/month", "infra_cost", "$", higher_is_better=False),
            Tile("P1 incidents (30d)", "p1_incidents", "", higher_is_better=False),
        ],
        "charts": [
            ChartSpec("dora_quad", "recharts", "bar", "DORA quad chart"),
            ChartSpec("cost_treemap", "plotly", "treemap", "Cost per service treemap"),
            ChartSpec("incident_timeline", "recharts", "line", "Incident timeline"),
        ],
        "reports": [
            ReportSpec("weekly_dora", "Weekly DORA report", "weekly", "PDF", "eng manager"),
            ReportSpec("monthly_cost_opt", "Monthly infra-cost optimization", "monthly", "Excel", "finance + eng"),
            ReportSpec("quarterly_capacity", "Quarterly capacity review", "quarterly", "PDF", "manager + finops"),
        ],
    },
    "ai-reviewer": {
        "summary": "Model accuracy drift + fairness + override rate + audit volume",
        "tiles": [
            Tile("Models in prod", "models_prod", ""),
            Tile("Avg accuracy vs baseline", "acc_delta", "%"),
            Tile("PSI/CSI drift", "drift_score", "", higher_is_better=False),
            Tile("HITL override rate", "override_rate", "%", higher_is_better=False),
            Tile("Fairness pass rate", "fairness_pass", "%"),
            Tile("Open model issues", "open_model_issues", "", higher_is_better=False),
        ],
        "charts": [
            ChartSpec("accuracy_per_model", "recharts", "line", "Accuracy trend per model"),
            ChartSpec("drift_heatmap", "plotly", "heatmap", "Drift heatmap (feature × time)"),
            ChartSpec("override_sankey", "plotly", "sankey", "Override-cause breakdown"),
        ],
        "reports": [
            ReportSpec("weekly_model_health", "Weekly model health", "weekly", "PDF", "ai-strategy + manager"),
            ReportSpec("monthly_model_card", "Monthly model-card review", "monthly", "PDF", "compliance + ai-strategy"),
            ReportSpec("quarterly_fairness", "Quarterly fairness audit", "quarterly", "PDF", "ai-strategy + legal"),
        ],
    },
    "digital-transformation": {
        "summary": "AS-IS vs TO-BE progress + automation % + process backlog",
        "tiles": [
            Tile("Processes on AS-IS", "as_is", "", higher_is_better=False),
            Tile("Processes on TO-BE", "to_be", ""),
            Tile("Automation %", "auto_pct", "%"),
            Tile("Time-saved $/yr", "saved_per_year", "$"),
            Tile("AS-IS backlog", "backlog", "", higher_is_better=False),
            Tile("TO-BE deploys (30d)", "tobe_deploys", ""),
        ],
        "charts": [
            ChartSpec("as_to_be_sankey", "plotly", "sankey", "AS-IS → TO-BE process flow shift"),
            ChartSpec("automation_per_process", "recharts", "bar", "Automation % per process"),
            ChartSpec("roi_waterfall", "plotly", "waterfall", "ROI realized vs planned"),
        ],
        "reports": [
            ReportSpec("monthly_dt_scorecard", "Monthly DT scorecard", "monthly", "PDF", "exec + ai-strategy"),
            ReportSpec("quarterly_impact", "Quarterly impact realized", "quarterly", "PDF", "board + exec"),
            ReportSpec("process_delta", "Per-process AS-IS-vs-TO-BE delta", "on-demand", "CSV", "ai-strategy"),
        ],
    },
    "system-architect": {
        "summary": "Service health + dependency graph + capacity vs forecast",
        "tiles": [
            Tile("Healthy services", "healthy_svcs", "/total"),
            Tile("p95 latency system-wide", "p95_latency", "ms", higher_is_better=False),
            Tile("Dep-graph cycles", "dep_cycles", "", higher_is_better=False),
            Tile("Capacity vs forecast", "capacity", "%"),
            Tile("ADRs accepted (30d)", "adrs", ""),
            Tile("Tech-debt backlog", "tech_debt", "", higher_is_better=False),
        ],
        "charts": [
            ChartSpec("dep_graph", "plotly", "scatter", "Service dependency graph"),
            ChartSpec("latency_multi", "recharts", "line", "Latency p50/p95/p99 per service"),
            ChartSpec("capacity_area", "recharts", "area", "Capacity vs forecast"),
        ],
        "reports": [
            ReportSpec("monthly_arch_review", "Monthly architecture review", "monthly", "PDF", "manager + eng"),
            ReportSpec("quarterly_capacity", "Quarterly capacity plan", "quarterly", "PDF", "manager + finops"),
            ReportSpec("adr_landing", "ADR landing summary", "on-demand", "PDF", "architecture council"),
        ],
    },
    "test-architect": {
        "summary": "Test pyramid health + flaky tests + coverage per service",
        "tiles": [
            Tile("Pyramid ratio U:I:E", "pyramid_ratio", ""),
            Tile("Flaky tests", "flaky", "", higher_is_better=False),
            Tile("Mean test duration", "test_duration", "s", higher_is_better=False),
            Tile("Coverage min", "coverage_min", "%"),
            Tile("Drill pass-rate", "drill_pass", "%"),
            Tile("Pen-test gaps", "pentest_gaps", "", higher_is_better=False),
        ],
        "charts": [
            ChartSpec("pyramid_stack", "recharts", "bar", "Test pyramid per service"),
            ChartSpec("flaky_heatmap", "plotly", "heatmap", "Flaky-test heatmap"),
            ChartSpec("coverage_delta", "recharts", "bar", "Coverage delta per release"),
        ],
        "reports": [
            ReportSpec("quarterly_test_strategy", "Quarterly test strategy", "quarterly", "PDF", "eng + QA"),
            ReportSpec("release_pyramid", "Per-release pyramid snapshot", "per release", "PDF", "manager"),
            ReportSpec("flaky_cleanup", "Flaky-test cleanup queue", "weekly", "CSV", "test-architect"),
        ],
    },
    "database-architect": {
        "summary": "Query latency + slow-query list + schema drift + replication lag",
        "tiles": [
            Tile("DB latency p95", "db_p95", "ms", higher_is_better=False),
            Tile("Slow queries (24h)", "slow_queries", "", higher_is_better=False),
            Tile("Schema-drift", "schema_drift", "", higher_is_better=False),
            Tile("Replica lag (max)", "replica_lag", "s", higher_is_better=False),
            Tile("Disk usage", "disk_usage", "%", higher_is_better=False),
            Tile("Migration backlog", "migration_backlog", "", higher_is_better=False),
        ],
        "charts": [
            ChartSpec("slow_query_top20", "recharts", "bar", "Top 20 slow queries"),
            ChartSpec("schema_drift_time", "recharts", "line", "Schema drift over time"),
            ChartSpec("replica_lag_heatmap", "plotly", "heatmap", "Replica lag heatmap"),
        ],
        "reports": [
            ReportSpec("weekly_db_health", "Weekly DB health", "weekly", "PDF", "DBA team + manager"),
            ReportSpec("monthly_query_opt", "Monthly query optimization", "monthly", "Excel", "eng + DBA"),
            ReportSpec("quarterly_schema_review", "Quarterly schema review", "quarterly", "PDF", "manager + system-architect"),
        ],
    },
    "api-architect": {
        "summary": "API latency + error rate + version adoption + deprecation",
        "tiles": [
            Tile("API p95 latency", "api_p95", "ms", higher_is_better=False),
            Tile("Error rate (24h)", "error_rate", "%", higher_is_better=False),
            Tile("Endpoints in prod", "endpoints", ""),
            Tile("v1 vs v2 split", "version_split", "% v2"),
            Tile("Deprecated still used", "deprecated_used", "", higher_is_better=False),
            Tile("Breaking PRs (30d)", "breaking_prs", "", higher_is_better=False),
        ],
        "charts": [
            ChartSpec("endpoint_latency_heatmap", "plotly", "heatmap", "Latency per endpoint heatmap"),
            ChartSpec("version_sankey", "plotly", "sankey", "Version adoption v1→v2"),
            ChartSpec("error_per_endpoint", "recharts", "bar", "Error rate per endpoint"),
        ],
        "reports": [
            ReportSpec("weekly_api_review", "Weekly API contract review", "weekly", "PDF", "eng manager"),
            ReportSpec("quarterly_deprecation", "Quarterly API deprecation plan", "quarterly", "PDF", "eng + product"),
            ReportSpec("release_contract_diff", "Per-release contract diff", "per release", "PDF", "manager"),
        ],
    },
    "data-owner": {
        "summary": "Data quality + lineage gaps + freshness SLA + consumer count",
        "tiles": [
            Tile("DQ score (avg)", "dq_score", ""),
            Tile("Datasets in SLA breach", "sla_breach", "", higher_is_better=False),
            Tile("Freshness lag p95", "freshness_p95", "min", higher_is_better=False),
            Tile("Lineage gaps", "lineage_gaps", "", higher_is_better=False),
            Tile("Consumers / dataset", "consumers", ""),
            Tile("PII findings", "pii_findings", "", higher_is_better=False),
        ],
        "charts": [
            ChartSpec("dq_per_dataset", "recharts", "bar", "DQ score per dataset"),
            ChartSpec("freshness_box", "plotly", "boxplot", "Freshness lag distribution"),
            ChartSpec("lineage_graph", "plotly", "scatter", "Lineage graph"),
        ],
        "reports": [
            ReportSpec("monthly_data_steward", "Monthly data steward report", "monthly", "PDF", "data-owner + ai-strategy"),
            ReportSpec("quarterly_dq_review", "Quarterly DQ review", "quarterly", "PDF", "manager + ai-strategy"),
            ReportSpec("sla_breach_log", "Per-dataset SLA breach log", "weekly", "CSV", "data-owner"),
        ],
    },
    "ai-strategy": {
        "summary": "Automation backlog rank + AS-IS impact tracker + ROI realized",
        "tiles": [
            Tile("Top-10 backlog", "top10_backlog", ""),
            Tile("AS-IS impact $", "as_is_impact", "$"),
            Tile("TO-BE deployed", "tobe_deployed", ""),
            Tile("ROI realized %", "roi_realized", "%"),
            Tile("Open DT items", "dt_items", "", higher_is_better=False),
            Tile("Risk-weighted backlog $", "risk_backlog", "$"),
        ],
        "charts": [
            ChartSpec("backlog_ranked", "recharts", "bar", "Backlog ranked by score"),
            ChartSpec("impact_waterfall", "plotly", "waterfall", "Impact realized vs planned"),
            ChartSpec("maturity_radar", "plotly", "scatter", "Per-dept automation maturity (radar)"),
        ],
        "reports": [
            ReportSpec("quarterly_dt_strategy", "Quarterly DT strategy", "quarterly", "PDF", "exec + board"),
            ReportSpec("monthly_backlog_delta", "Monthly backlog rank delta", "monthly", "PDF", "manager + ai-strategy"),
            ReportSpec("process_roi_scorecard", "Per-process ROI scorecard", "on-demand", "Excel", "ai-strategy + finance"),
        ],
    },
    "information-security": {
        "summary": "Pen-test results + compliance gates + CVE backlog + third-party risk",
        "tiles": [
            Tile("Pen-test findings", "pentest", "", higher_is_better=False),
            Tile("Compliance gates", "compliance", "/total"),
            Tile("CVEs (CVSS≥7)", "cves", "", higher_is_better=False),
            Tile("Third-party risk", "third_party_risk", "/100", higher_is_better=False),
            Tile("Sensitive-data findings", "sensitive_findings", "", higher_is_better=False),
            Tile("Audit-row volume (24h)", "audit_volume", ""),
        ],
        "charts": [
            ChartSpec("compliance_matrix", "plotly", "heatmap", "Compliance gate matrix"),
            ChartSpec("cve_stacked", "recharts", "bar", "CVE backlog by severity"),
            ChartSpec("vendor_risk_heatmap", "plotly", "heatmap", "Third-party risk per vendor"),
        ],
        "reports": [
            ReportSpec("monthly_infosec", "Monthly InfoSec report", "monthly", "PDF", "CISO + compliance"),
            ReportSpec("quarterly_compliance", "Quarterly compliance audit", "quarterly", "PDF", "compliance + board"),
            ReportSpec("vendor_risk_score", "Per-vendor risk score", "on-demand", "Excel", "procurement + InfoSec"),
        ],
    },
}


def synthesize_tile_value(dept: str, role: str, tile: Tile) -> dict[str, Any]:
    """Generate stable synthetic tile data — same dept+role+metric → same value.

    Real systems would back this with actual SQL/Prometheus queries; this
    catalog produces plausible numbers so dashboards render before the
    backing data sources are wired.
    """
    seed = int(hashlib.sha256(f"{dept}/{role}/{tile.metric_id}".encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)

    # Pick a value range based on the tile's unit
    if tile.unit == "%":
        value = round(rng.uniform(60, 95), 1)
        target = 90.0
    elif tile.unit == "$" or tile.unit == "$/month" or tile.metric_id.endswith("_cost"):
        value = round(rng.uniform(10_000, 500_000), 0)
        target = value * 0.85
    elif tile.unit in ("ms", "min", "s", "hr"):
        value = round(rng.uniform(50, 500), 1)
        target = value * 0.7
    elif tile.unit == "/sprint":
        value = rng.randint(15, 40)
        target = 35
    elif tile.unit == "/total":
        denom = rng.randint(50, 200)
        num = rng.randint(int(denom * 0.7), denom)
        return {
            "label": tile.label,
            "metric_id": tile.metric_id,
            "value": f"{num} / {denom}",
            "raw_value": num,
            "raw_total": denom,
            "unit": tile.unit,
            "higher_is_better": tile.higher_is_better,
            "status": "green" if num / denom >= 0.85 else "amber" if num / denom >= 0.7 else "red",
            "delta_pct": round(rng.uniform(-15, 15), 1),
        }
    else:
        value = rng.randint(1, 200)
        target = value * (0.5 if tile.higher_is_better else 1.5)

    # Status: green / amber / red vs target
    if tile.higher_is_better:
        ratio = value / target if target else 1
        status = "green" if ratio >= 0.95 else "amber" if ratio >= 0.8 else "red"
    else:
        ratio = target / value if value else 1
        status = "green" if value <= target else "amber" if value <= target * 1.2 else "red"

    return {
        "label": tile.label,
        "metric_id": tile.metric_id,
        "value": value,
        "unit": tile.unit,
        "target": round(target, 1),
        "higher_is_better": tile.higher_is_better,
        "status": status,
        "delta_pct": round(rng.uniform(-15, 15), 1),
    }


def synthesize_chart_data(dept: str, role: str, chart: ChartSpec) -> dict[str, Any]:
    seed = int(hashlib.sha256(f"{dept}/{role}/{chart.chart_id}".encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)

    if chart.type in ("line", "area"):
        # 12 weeks of synthetic data
        return {
            "chart_id": chart.chart_id, "library": chart.library, "type": chart.type,
            "title": chart.title, "x_axis": "week", "y_axis": "value",
            "data": [
                {"week": f"W{i+1}", "value": round(50 + rng.uniform(-15, 15) + i * 0.5, 1)}
                for i in range(12)
            ],
        }
    if chart.type == "bar":
        labels = ["A", "B", "C", "D", "E", "F"]
        return {
            "chart_id": chart.chart_id, "library": chart.library, "type": chart.type,
            "title": chart.title, "x_axis": "category", "y_axis": "value",
            "data": [{"category": L, "value": rng.randint(10, 100)} for L in labels],
        }
    if chart.type == "pie":
        labels = ["Alpha", "Beta", "Gamma", "Delta", "Other"]
        return {
            "chart_id": chart.chart_id, "library": chart.library, "type": chart.type,
            "title": chart.title,
            "data": [{"label": L, "value": rng.randint(5, 35)} for L in labels],
        }
    if chart.type in ("heatmap", "boxplot", "sankey", "waterfall", "treemap", "scatter"):
        # Generic spec placeholder — frontend uses Plotly's JSON contract
        return {
            "chart_id": chart.chart_id, "library": chart.library, "type": chart.type,
            "title": chart.title,
            "data": {
                "note": f"{chart.type} synthetic data — Plotly figure JSON",
                "z": [[rng.randint(1, 10) for _ in range(7)] for _ in range(5)] if chart.type == "heatmap" else None,
                "values": [rng.uniform(0, 100) for _ in range(20)],
            },
        }
    return {
        "chart_id": chart.chart_id, "library": chart.library, "type": chart.type,
        "title": chart.title, "data": [],
    }


def build_dashboard_payload(dept: str, role: str) -> dict[str, Any] | None:
    focus = ROLE_CATALOG.get(role)
    if not focus:
        return None
    tiles = [synthesize_tile_value(dept, role, t) for t in focus["tiles"]]
    charts = [synthesize_chart_data(dept, role, c) for c in focus["charts"]]
    return {
        "dept": dept,
        "role": role,
        "summary": focus["summary"],
        "tiles": tiles,
        "charts": charts,
        "refreshed_at": _now_iso(),
    }


def build_reports_payload(dept: str, role: str) -> dict[str, Any] | None:
    focus = ROLE_CATALOG.get(role)
    if not focus:
        return None
    return {
        "dept": dept,
        "role": role,
        "reports": [
            {
                "report_id": r.report_id,
                "name": r.name,
                "cadence": r.cadence,
                "format": r.format,
                "recipients": r.recipients,
            }
            for r in focus["reports"]
        ],
    }


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
