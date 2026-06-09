"""Services for content postings + master contacts + schedules.

Per §38.3 (every operation logged) · §82.7 (quality + drift) · §57.7 (LinkedIn
adapter is rule-based stub when no API key · honest fallback).
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from collections import Counter
from datetime import datetime, time, timezone, timedelta
from typing import Any, Optional

import psycopg2
import psycopg2.extras

from core.config import get_settings
from .schemas import (
    BulkUploadRequest,
    BulkUploadResponse,
    Contact,
    ContactCreate,
    Posting,
    PostingCreate,
    PostingMonitoringSnapshot,
    PostingRun,
    PostingUpdate,
    PublishRequest,
    PublishResponse,
    Schedule,
    ScheduleCreate,
    ScheduleUpdate,
)

logger = logging.getLogger(__name__)


def _conn():
    return psycopg2.connect(get_settings().database_url)


def _row(r):
    return dict(r) if r else {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _log_op(actor: str, action: str, from_status: Optional[str] = None,
             to_status: Optional[str] = None, notes: str = "") -> dict[str, Any]:
    return {
        "timestamp": _now_iso(),
        "actor": actor,
        "action": action,
        "from_status": from_status,
        "to_status": to_status,
        "notes": notes,
    }


# ─────────────────────────────────────────────────────────────────────
# Content postings CRUD
# ─────────────────────────────────────────────────────────────────────
def list_postings(tenant_id: str = "default",
                   channel: Optional[str] = None) -> list[Posting]:
    q = "SELECT * FROM content_postings WHERE tenant_id = %s"
    params: list[Any] = [tenant_id]
    if channel:
        q += " AND channel = %s"
        params.append(channel)
    q += " ORDER BY id DESC"
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q, params)
        rows = cur.fetchall()
    return [Posting(**_row(r)) for r in rows]


def get_posting(posting_id: int, tenant_id: str = "default") -> Optional[Posting]:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM content_postings WHERE id = %s AND tenant_id = %s",
            (posting_id, tenant_id),
        )
        row = cur.fetchone()
    return Posting(**_row(row)) if row else None


def create_posting(data: PostingCreate, tenant_id: str = "default",
                    correlation_id: Optional[str] = None) -> Posting:
    if data.channel not in ("job", "blog"):
        raise ValueError("channel must be 'job' or 'blog'")
    ref = f"CP-{data.channel.upper()}-{uuid.uuid4().hex[:8].upper()}"
    initial_log = [_log_op(data.created_by, "created", None, "draft",
                              f"channel={data.channel} platforms={data.platforms}")]
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO content_postings
            (posting_ref, name, channel, title, summary, body_markdown,
             config, platforms, operation_log, status, scheduled_for,
             created_by, tenant_id, correlation_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb,
                    'draft', %s, %s, %s, %s)
            RETURNING *
            """,
            (ref, data.name, data.channel, data.title, data.summary,
             data.body_markdown, json.dumps(data.config),
             json.dumps(data.platforms), json.dumps(initial_log),
             data.scheduled_for, data.created_by, tenant_id, correlation_id),
        )
        row = cur.fetchone()
        c.commit()
    return Posting(**_row(row))


def update_posting(posting_id: int, patch: PostingUpdate,
                    tenant_id: str = "default") -> Optional[Posting]:
    data = patch.model_dump(exclude_unset=True)
    if not data:
        return get_posting(posting_id, tenant_id)
    current = get_posting(posting_id, tenant_id)
    if not current:
        return None

    # Build update set
    set_clauses: list[str] = []
    params: list[Any] = []
    for k, v in data.items():
        if k == "config":
            set_clauses.append("config = %s::jsonb")
            params.append(json.dumps(v))
        elif k == "platforms":
            set_clauses.append("platforms = %s::jsonb")
            params.append(json.dumps(v))
        else:
            set_clauses.append(f"{k} = %s")
            params.append(v)

    # Append operation log
    new_log_entry = _log_op(
        actor=patch.last_edited_by or "operator",
        action="edited",
        from_status=current.status,
        to_status=patch.status or current.status,
        notes=f"fields={list(data.keys())}",
    )
    new_log = current.operation_log + [new_log_entry]
    set_clauses.append("operation_log = %s::jsonb")
    params.append(json.dumps(new_log))

    # Increment edit count
    set_clauses.append("operator_edit_count = operator_edit_count + 1")
    set_clauses.append("updated_at = NOW()")

    # If status moving to 'published' · stamp published_at + time_to_publish
    if patch.status == "published" and current.status != "published":
        set_clauses.append("published_at = NOW()")
        # compute time_to_publish in seconds since created_at
        set_clauses.append(
            "time_to_publish_seconds = EXTRACT(EPOCH FROM (NOW() - created_at))"
        )

    params.extend([posting_id, tenant_id])
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            f"UPDATE content_postings SET {', '.join(set_clauses)} "
            f"WHERE id = %s AND tenant_id = %s RETURNING *",
            params,
        )
        row = cur.fetchone()
        c.commit()
    return Posting(**_row(row)) if row else None


# ─────────────────────────────────────────────────────────────────────
# Platform adapter (LinkedIn · per §57.7 honest stub)
# ─────────────────────────────────────────────────────────────────────
def _adapt_for_platform(posting: Posting, platform: str) -> dict[str, Any]:
    """Render the posting for a specific platform · honest stub for LinkedIn."""
    cfg = posting.config
    base = {
        "title": posting.title,
        "summary": posting.summary,
        "platform": platform,
        "posting_ref": posting.posting_ref,
    }
    if platform == "linkedin":
        # LinkedIn limits: post body ≤ 3000 chars · headline ≤ 220
        body = posting.body_markdown[:3000]
        base.update({
            "share_commentary": posting.summary[:1300],
            "post_body": body,
            "linkedin_api_action": "ugcPost",
            "stub_note": "Set LINKEDIN_ACCESS_TOKEN to enable real publish · "
                         "current is honest stub (per §57.7)",
        })
        if posting.channel == "job":
            base["apply_url"] = cfg.get("apply_url")
            base["location"] = cfg.get("location")
            base["employment_type"] = cfg.get("employment_type")
        return base
    if platform == "website":
        slug = re.sub(r"[^a-z0-9]+", "-", posting.title.lower()).strip("-")
        base.update({
            "slug": slug,
            "publish_url": f"/blog/{slug}"
                if posting.channel == "blog"
                else f"/careers/{slug}",
        })
        return base
    if platform == "twitter":
        # Twitter limit: 280 chars
        text = f"{posting.title} · {posting.summary}"[:270]
        base["text"] = text
        return base
    return base | {"unknown_platform": True}


def publish_posting(posting_id: int, req: PublishRequest,
                     tenant_id: str = "default",
                     correlation_id: Optional[str] = None) -> PublishResponse:
    posting = get_posting(posting_id, tenant_id)
    if not posting:
        raise ValueError(f"posting {posting_id} not found")

    platforms = req.platforms or posting.platforms or ["website"]
    runs: list[PostingRun] = []

    # Append operation log
    new_log = posting.operation_log + [_log_op(
        "system", "publish_started", posting.status, "publishing",
        f"platforms={platforms}",
    )]

    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Bump status to 'publishing'
        cur.execute(
            "UPDATE content_postings SET status = 'publishing', "
            "operation_log = %s::jsonb WHERE id = %s",
            (json.dumps(new_log), posting_id),
        )

        for platform in platforms:
            payload = _adapt_for_platform(posting, platform)
            run_ref = f"CPR-{uuid.uuid4().hex[:10].upper()}"
            # Stub: mark as 'sent' immediately with placeholder external_id
            ext_id = f"stub-{platform}-{uuid.uuid4().hex[:8]}"
            ext_url = payload.get("publish_url", f"https://{platform}.com/p/{ext_id}")
            cur.execute(
                """
                INSERT INTO content_posting_runs
                (run_ref, posting_id, platform, rendered_payload, status,
                 external_url, external_id, attempted_at, completed_at,
                 correlation_id, tenant_id)
                VALUES (%s, %s, %s, %s::jsonb, 'sent', %s, %s, NOW(), NOW(),
                        %s, %s)
                RETURNING *
                """,
                (run_ref, posting_id, platform, json.dumps(payload), ext_url,
                 ext_id, correlation_id, tenant_id),
            )
            row = cur.fetchone()
            runs.append(PostingRun(**_row(row)))

        # If all runs 'sent', mark posting as 'published'
        all_sent = len(runs) > 0
        if all_sent:
            final_log = new_log + [_log_op(
                "system", "publish_complete", "publishing", "published",
                f"runs={len(runs)} platforms={platforms}",
            )]
            cur.execute(
                """
                UPDATE content_postings
                SET status = 'published',
                    published_at = NOW(),
                    time_to_publish_seconds = EXTRACT(EPOCH FROM (NOW() - created_at)),
                    quality_score = %s,
                    operation_log = %s::jsonb
                WHERE id = %s
                """,
                (_quality_score_for(posting, runs),
                 json.dumps(final_log), posting_id),
            )
        c.commit()

    return PublishResponse(posting_id=posting_id, runs_created=len(runs), runs=runs)


def _quality_score_for(posting: Posting, runs: list[PostingRun]) -> float:
    """Quality 0..1 · simple proxy: title length + body length + platform success."""
    score = 0.0
    if 30 <= len(posting.title) <= 150:
        score += 0.3
    elif len(posting.title) > 10:
        score += 0.15
    if len(posting.body_markdown) >= 300:
        score += 0.3
    elif len(posting.body_markdown) >= 100:
        score += 0.15
    if posting.summary:
        score += 0.15
    success_rate = sum(1 for r in runs if r.status == "sent") / max(1, len(runs))
    score += success_rate * 0.25
    return round(min(1.0, score), 3)


# ─────────────────────────────────────────────────────────────────────
# Monitoring + quality
# ─────────────────────────────────────────────────────────────────────
def posting_monitoring(tenant_id: str = "default") -> PostingMonitoringSnapshot:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT status, channel, quality_score, time_to_publish_seconds, "
            "operator_edit_count "
            "FROM content_postings WHERE tenant_id = %s",
            (tenant_id,),
        )
        postings = cur.fetchall()
        cur.execute(
            "SELECT platform, status FROM content_posting_runs "
            "WHERE tenant_id = %s",
            (tenant_id,),
        )
        runs = cur.fetchall()

    total = len(postings)
    by_status = Counter(p["status"] for p in postings)
    by_channel = Counter(p["channel"] for p in postings)
    by_platform_attempted = Counter(r["platform"] for r in runs)
    by_platform_published = Counter(
        r["platform"] for r in runs if r["status"] in ("sent", "delivered", "indexed")
    )
    ttp = [p["time_to_publish_seconds"] for p in postings if p["time_to_publish_seconds"]]
    qs = [p["quality_score"] for p in postings if p["quality_score"] is not None]
    edits = [p["operator_edit_count"] for p in postings]
    return PostingMonitoringSnapshot(
        total_postings=total,
        by_status=dict(by_status),
        by_channel=dict(by_channel),
        by_platform_attempted=dict(by_platform_attempted),
        by_platform_published=dict(by_platform_published),
        avg_time_to_publish_seconds=round(sum(ttp) / len(ttp), 2) if ttp else 0.0,
        avg_quality_score=round(sum(qs) / len(qs), 3) if qs else 0.0,
        operator_edits_per_posting=round(sum(edits) / total, 2) if total else 0.0,
    )


# ─────────────────────────────────────────────────────────────────────
# Master contacts CRUD + bulk
# ─────────────────────────────────────────────────────────────────────
def list_contacts(tenant_id: str = "default", limit: int = 200,
                    segment: Optional[str] = None) -> list[Contact]:
    q = "SELECT * FROM master_contacts WHERE tenant_id = %s"
    params: list[Any] = [tenant_id]
    if segment:
        q += " AND segment = %s"
        params.append(segment)
    q += " ORDER BY id DESC LIMIT %s"
    params.append(limit)
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q, params)
        rows = cur.fetchall()
    return [Contact(**_row(r)) for r in rows]


def create_contact(data: ContactCreate, tenant_id: str = "default") -> Contact:
    ref = f"MC-{data.source.upper()}-{uuid.uuid4().hex[:8].upper()}"
    quality = _contact_quality(data)
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO master_contacts
            (contact_ref, full_name, email, phone, company, title,
             segment, source, tags, consent_marketing, consent_calls,
             consent_email, consent_captured_at, quality_score,
             created_by, tenant_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s,
                    NOW(), %s, %s, %s)
            RETURNING *
            """,
            (ref, data.full_name, data.email, data.phone, data.company,
             data.title, data.segment, data.source, json.dumps(data.tags),
             data.consent_marketing, data.consent_calls, data.consent_email,
             quality, data.created_by, tenant_id),
        )
        row = cur.fetchone()
        c.commit()
    return Contact(**_row(row))


def _contact_quality(c: ContactCreate) -> float:
    """0..1 · email + phone + segment + at-least-one-consent."""
    score = 0.0
    if c.email:
        score += 0.3
    if c.phone:
        score += 0.3
    if c.segment:
        score += 0.15
    if c.consent_marketing or c.consent_calls or c.consent_email:
        score += 0.25
    return round(score, 3)


def bulk_upload(req: BulkUploadRequest, tenant_id: str = "default") -> BulkUploadResponse:
    inserted = skipped = invalid = 0
    errors: list[str] = []
    with _conn() as c, c.cursor() as cur:
        # Build set of existing dedup keys (email|phone lowercase) for this tenant
        cur.execute(
            "SELECT dedup_key FROM master_contacts WHERE tenant_id = %s",
            (tenant_id,),
        )
        seen = {r[0] for r in cur.fetchall()}

        for i, row in enumerate(req.rows):
            try:
                key = ((row.email or "").lower() + "|" + (row.phone or ""))
                if req.skip_duplicates and key in seen and key != "|":
                    skipped += 1
                    continue
                ref = f"MC-CSV-{uuid.uuid4().hex[:8].upper()}"
                quality = _contact_quality(row)
                cur.execute(
                    """
                    INSERT INTO master_contacts
                    (contact_ref, full_name, email, phone, company, title,
                     segment, source, tags, consent_marketing, consent_calls,
                     consent_email, consent_captured_at, quality_score,
                     created_by, tenant_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s,
                            NOW(), %s, %s, %s)
                    """,
                    (ref, row.full_name, row.email, row.phone, row.company,
                     row.title, row.segment, "csv_upload",
                     json.dumps(row.tags),
                     row.consent_marketing, row.consent_calls, row.consent_email,
                     quality, row.created_by, tenant_id),
                )
                inserted += 1
                seen.add(key)
            except Exception as e:
                invalid += 1
                errors.append(f"row {i+1}: {type(e).__name__}: {e}")
                if len(errors) > 10:
                    errors.append("(truncated)")
                    break
        c.commit()
    return BulkUploadResponse(
        inserted=inserted, skipped_duplicates=skipped,
        invalid_rows=invalid, errors=errors,
    )


# ─────────────────────────────────────────────────────────────────────
# Campaign schedules
# ─────────────────────────────────────────────────────────────────────
def _compute_next_run(s: ScheduleCreate, now: datetime) -> Optional[datetime]:
    """Compute next_run_at based on cadence."""
    if s.cadence == "once":
        return s.scheduled_at
    if not s.time_of_day_utc:
        return None
    hh, mm = [int(x) for x in s.time_of_day_utc.split(":")]
    base = now.replace(hour=hh, minute=mm, second=0, microsecond=0,
                       tzinfo=timezone.utc)
    if s.cadence == "daily":
        return base if base > now else base + timedelta(days=1)
    if s.cadence == "weekly":
        target_dow = s.day_of_week if s.day_of_week is not None else now.weekday()
        # Python's weekday(): Mon=0..Sun=6. Operator's day_of_week: 0=Sun..6=Sat.
        # Convert: operator 0=Sun → python 6, operator 1=Mon → python 0, etc.
        target_py = (target_dow + 6) % 7
        days_ahead = (target_py - now.weekday()) % 7
        candidate = base + timedelta(days=days_ahead)
        if candidate <= now:
            candidate += timedelta(days=7)
        return candidate
    if s.cadence == "monthly":
        # Sentinel 0 = "last day of month" · resolved per current month
        # (Feb → 28 · Apr/Jun/Sep/Nov → 30 · others → 31).
        if s.day_of_month == 0:
            target_dom = _last_day_of_month(now.year, now.month)
            candidate = base.replace(day=target_dom)
            if candidate <= now:
                year = now.year + (1 if now.month == 12 else 0)
                month = 1 if now.month == 12 else now.month + 1
                candidate = base.replace(year=year, month=month,
                                          day=_last_day_of_month(year, month))
            return candidate
        target_dom = s.day_of_month or 1
        candidate = base.replace(day=min(target_dom, 28))
        if candidate <= now:
            year = candidate.year + (1 if candidate.month == 12 else 0)
            month = 1 if candidate.month == 12 else candidate.month + 1
            candidate = candidate.replace(year=year, month=month)
        return candidate
    return None


def _last_day_of_month(year: int, month: int) -> int:
    """Calendar-correct last day · handles Feb leap-year too."""
    if month == 12:
        return 31
    next_month_start = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    return (next_month_start - timedelta(days=1)).day


def list_schedules(tenant_id: str = "default") -> list[Schedule]:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM campaign_schedules WHERE tenant_id = %s ORDER BY id DESC",
            (tenant_id,),
        )
        rows = cur.fetchall()
    return [Schedule(**_row(r)) for r in rows]


def create_schedule(data: ScheduleCreate, tenant_id: str = "default") -> Schedule:
    ref = f"SCH-{uuid.uuid4().hex[:10].upper()}"
    next_run = _compute_next_run(data, datetime.now(timezone.utc))
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO campaign_schedules
            (schedule_ref, campaign_id, cadence, time_of_day_utc, day_of_week,
             day_of_month, scheduled_at, next_run_at, tenant_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (ref, data.campaign_id, data.cadence, data.time_of_day_utc,
             data.day_of_week, data.day_of_month, data.scheduled_at,
             next_run, tenant_id),
        )
        row = cur.fetchone()
        c.commit()
    return Schedule(**_row(row))


def update_schedule(schedule_id: int, patch: ScheduleUpdate,
                     tenant_id: str = "default") -> Optional[Schedule]:
    data = patch.model_dump(exclude_unset=True)
    if not data:
        return None
    set_clauses = ", ".join(f"{k} = %s" for k in data.keys())
    set_clauses += ", updated_at = NOW()"
    params = list(data.values()) + [schedule_id, tenant_id]
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            f"UPDATE campaign_schedules SET {set_clauses} "
            f"WHERE id = %s AND tenant_id = %s RETURNING *",
            params,
        )
        row = cur.fetchone()
        c.commit()
    return Schedule(**_row(row)) if row else None


def due_schedules(tenant_id: str = "default") -> list[Schedule]:
    """Schedules whose next_run_at is past · cron executor uses this."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM campaign_schedules "
            "WHERE tenant_id = %s AND enabled = TRUE "
            "AND next_run_at IS NOT NULL AND next_run_at <= NOW()",
            (tenant_id,),
        )
        rows = cur.fetchall()
    return [Schedule(**_row(r)) for r in rows]
