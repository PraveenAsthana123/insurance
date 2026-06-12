"""/api/v1/chatgroup/* · multi-actor group chat (humans + agents).

Per operator brief 2026-06-12: "did you add chatgroup".

Schema (created in migrations · see scripts/seed_chatgroup.sql equivalent
SQL in chat_group + chat_group_member + chat_group_message tables):

  chat_group         · the room
  chat_group_member  · who's in it (humans OR agents)
  chat_group_message · the conversation log

Endpoints:
  GET  /chatgroup/groups                 · list all visible groups
  POST /chatgroup/groups                 · create a new group
  GET  /chatgroup/groups/{id}            · group detail + member list
  GET  /chatgroup/groups/{id}/messages   · paginated message history
  POST /chatgroup/groups/{id}/messages   · post a new message
  POST /chatgroup/groups/{id}/members    · add member (human or agent)

§57.7 honest: no message moderation yet · no real-time push (poll-based).
Use 'agent' sender_kind to record agent-authored messages with audit
attribution per §38.3.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from core.config import get_settings
from core.role_dependency import require_manager_or_above

router = APIRouter(prefix="/api/v1/chatgroup", tags=["chatgroup"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


def _tenant(request: Request) -> str:
    return request.headers.get("x-tenant-id", "default")


# ─────────────────────────────────────────────────────────────────────
# Pydantic models

class GroupCreate(BaseModel):
    group_id: str = Field(..., min_length=3, max_length=100)
    group_name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    department_id: str | None = None
    visibility: str = "public"


class MemberAdd(BaseModel):
    member_id: str = Field(..., min_length=1, max_length=100)
    member_kind: str = "human"  # 'human' | 'agent'
    role: str = "member"        # 'admin' | 'member' | 'observer'


class MessagePost(BaseModel):
    content: str = Field(..., min_length=1, max_length=10_000)
    sender_id: str = Field(..., min_length=1, max_length=100)
    sender_kind: str = "human"  # 'human' | 'agent' | 'system'
    parent_message_id: str | None = None
    attachments: list[Any] = []


# ─────────────────────────────────────────────────────────────────────
# Group endpoints

@router.get("/groups")
def list_groups(
    request: Request,
    department_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    tenant_id = _tenant(request)
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        sql = """
            SELECT g.*,
                   (SELECT COUNT(*) FROM chat_group_member m WHERE m.group_id = g.group_id) AS n_members,
                   (SELECT COUNT(*) FROM chat_group_message msg WHERE msg.group_id = g.group_id) AS n_messages,
                   (SELECT MAX(created_at) FROM chat_group_message msg WHERE msg.group_id = g.group_id) AS last_message_at
            FROM chat_group g
            WHERE g.tenant_id = %s
        """
        params: list[Any] = [tenant_id]
        if department_id:
            sql += " AND g.department_id = %s"
            params.append(department_id)
        sql += " ORDER BY last_message_at DESC NULLS LAST, g.created_at DESC LIMIT %s OFFSET %s"
        params += [limit, offset]
        cur.execute(sql, params)
        rows = [dict(r) for r in cur.fetchall()]
    return {
        "groups": rows,
        "count": len(rows),
        "filters": {"department_id": department_id, "tenant_id": tenant_id},
    }


@router.post("/groups")
def create_group(
    body: GroupCreate,
    request: Request,
    _role: str = Depends(require_manager_or_above),
):
    tenant_id = _tenant(request)
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            """
            INSERT INTO chat_group (group_id, group_name, description, department_id,
                                    visibility, created_by, tenant_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (group_id) DO NOTHING
            RETURNING group_id
            """,
            (body.group_id, body.group_name, body.description, body.department_id,
             body.visibility, "operator", tenant_id),
        )
        row = cur.fetchone()
        c.commit()
    if row is None:
        raise HTTPException(409, {"detail": f"group already exists: {body.group_id}",
                                   "error_code": "CHATGROUP_CONFLICT"})
    return {"group_id": body.group_id, "created": True}


@router.get("/groups/{group_id}")
def get_group(group_id: str, request: Request):
    tenant_id = _tenant(request)
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM chat_group WHERE group_id = %s AND tenant_id = %s",
            (group_id, tenant_id),
        )
        group = cur.fetchone()
        if not group:
            raise HTTPException(404, {"detail": f"group not found: {group_id}",
                                       "error_code": "CHATGROUP_404"})
        cur.execute(
            "SELECT * FROM chat_group_member WHERE group_id = %s ORDER BY joined_at",
            (group_id,),
        )
        members = [dict(r) for r in cur.fetchall()]
    return {"group": dict(group), "members": members, "n_members": len(members)}


@router.get("/groups/{group_id}/messages")
def list_messages(
    group_id: str,
    request: Request,
    limit: int = 100,
    offset: int = 0,
):
    tenant_id = _tenant(request)
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Confirm group exists in tenant
        cur.execute(
            "SELECT 1 FROM chat_group WHERE group_id = %s AND tenant_id = %s",
            (group_id, tenant_id),
        )
        if not cur.fetchone():
            raise HTTPException(404, {"detail": f"group not found: {group_id}",
                                       "error_code": "CHATGROUP_404"})
        cur.execute(
            """
            SELECT message_id, group_id, sender_id, sender_kind, content,
                   parent_message_id, attachments, created_at
            FROM chat_group_message
            WHERE group_id = %s AND tenant_id = %s
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
            """,
            (group_id, tenant_id, limit, offset),
        )
        rows = [dict(r) for r in cur.fetchall()]
    return {"messages": rows, "count": len(rows), "group_id": group_id}


@router.post("/groups/{group_id}/messages")
def post_message(
    group_id: str,
    body: MessagePost,
    request: Request,
    _role: str = Depends(require_manager_or_above),
):
    tenant_id = _tenant(request)
    message_id = f"msg-{uuid.uuid4().hex[:14]}"
    with _conn() as c, c.cursor() as cur:
        # Confirm group exists in tenant
        cur.execute(
            "SELECT 1 FROM chat_group WHERE group_id = %s AND tenant_id = %s",
            (group_id, tenant_id),
        )
        if not cur.fetchone():
            raise HTTPException(404, {"detail": f"group not found: {group_id}",
                                       "error_code": "CHATGROUP_404"})
        cur.execute(
            """
            INSERT INTO chat_group_message (
                message_id, group_id, sender_id, sender_kind,
                content, parent_message_id, attachments, tenant_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s)
            RETURNING message_id, created_at
            """,
            (message_id, group_id, body.sender_id, body.sender_kind,
             body.content, body.parent_message_id,
             psycopg2.extras.Json(body.attachments), tenant_id),
        )
        row = cur.fetchone()
        # Update group's updated_at
        cur.execute(
            "UPDATE chat_group SET updated_at = NOW() WHERE group_id = %s",
            (group_id,),
        )
        c.commit()
    return {
        "message_id": row[0],
        "group_id": group_id,
        "created_at": row[1].isoformat(),
        "policy_ref": "§ChatGroup · operator 2026-06-12",
    }


@router.post("/groups/{group_id}/members")
def add_member(
    group_id: str,
    body: MemberAdd,
    request: Request,
    _role: str = Depends(require_manager_or_above),
):
    tenant_id = _tenant(request)
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM chat_group WHERE group_id = %s AND tenant_id = %s",
            (group_id, tenant_id),
        )
        if not cur.fetchone():
            raise HTTPException(404, {"detail": f"group not found: {group_id}",
                                       "error_code": "CHATGROUP_404"})
        cur.execute(
            """
            INSERT INTO chat_group_member (group_id, member_id, member_kind, role)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (group_id, member_id) DO UPDATE SET role = EXCLUDED.role
            RETURNING group_id, member_id, role
            """,
            (group_id, body.member_id, body.member_kind, body.role),
        )
        row = cur.fetchone()
        c.commit()
    return {"group_id": row[0], "member_id": row[1], "role": row[2]}


@router.get("/health")
def health():
    """Operator-readable health · sanity-check counts."""
    with _conn() as c, c.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM chat_group")
        n_groups = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM chat_group_member")
        n_members = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM chat_group_message")
        n_messages = cur.fetchone()[0]
    return {
        "module": "chatgroup",
        "n_groups": n_groups,
        "n_members": n_members,
        "n_messages": n_messages,
        "ts_utc": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "policy_ref": "§ChatGroup operator 2026-06-12 · §57.7 honest counts",
    }
