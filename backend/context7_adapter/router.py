"""/api/v1/context7/* · §136 · Context7 MCP Stage-1 adapter (upstash/context7)."""
from __future__ import annotations
import os
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from _adapter_helpers import stamp

router = APIRouter(prefix="/api/v1/context7", tags=["context7"])

DEFAULT_URL = "https://mcp.context7.com"


def _check_config():
    """Stage-1 check · returns config status."""
    url = os.environ.get("CONTEXT7_URL", "")
    api_key = os.environ.get("CONTEXT7_API_KEY", "")
    return {
        "env_url_set":     bool(url),
        "env_apikey_set":  bool(api_key),
        "url":             url if url else None,
        "configured":      bool(url) or bool(api_key),
        "default_url":     DEFAULT_URL,
    }


@router.get("/health")
def health():
    cfg = _check_config()
    out = {**stamp(), "tool": "context7-mcp",
           "config": cfg,
           "purpose": "Fetch up-to-date library docs into LLM context",
           "tools_provided": ["resolve-library-id", "get-library-docs"],
           "stage": "Stage-1 per §56",
           "spec": "§136"}
    if cfg["configured"]:
        url = cfg["url"] or DEFAULT_URL
        try:
            r = httpx.get(f"{url}/health", timeout=5)
            out["http_status"] = r.status_code
            out["live"] = r.status_code == 200
        except Exception as e:
            out["live"] = False
            out["error"] = str(e)[:120]
    else:
        out["live"] = False
        out["activate"] = (
            "export CONTEXT7_URL=https://mcp.context7.com\n"
            "export CONTEXT7_API_KEY=ctx7sk-..."
        )
    return out


class ResolveBody(BaseModel):
    library_name: str


@router.post("/resolve")
def resolve_library(body: ResolveBody):
    """Resolve library name → Context7-compatible library ID."""
    cfg = _check_config()
    if not cfg["configured"]:
        # Honest scaffold per §57.7
        return {**stamp(), "scaffold": True,
                "library_name": body.library_name,
                "note": "Context7 not configured · returning local fallback",
                "fallback_id": body.library_name.lower().replace(" ", "-"),
                "activate_with": cfg.get("activate", "set CONTEXT7_URL + CONTEXT7_API_KEY"),
                "spec": "§136 scaffold"}
    url = cfg["url"] or DEFAULT_URL
    api_key = os.environ.get("CONTEXT7_API_KEY", "")
    try:
        r = httpx.post(f"{url}/resolve-library-id",
                        json={"libraryName": body.library_name},
                        headers={"Authorization": f"Bearer {api_key}"},
                        timeout=15)
        return {**stamp(), "library_name": body.library_name,
                "context7_response": r.json() if r.status_code == 200 else None,
                "http_status": r.status_code, "spec": "§136"}
    except Exception as e:
        return {**stamp(), "error": str(e)[:120], "spec": "§136"}


class FetchDocsBody(BaseModel):
    library_id: str
    topic: str = ""
    tokens: int = 2000


@router.post("/fetch-docs")
def fetch_docs(body: FetchDocsBody):
    """Fetch up-to-date library docs · piped into LLM context."""
    cfg = _check_config()
    if not cfg["configured"]:
        return {**stamp(), "scaffold": True,
                "library_id": body.library_id,
                "note": "Context7 not configured · returning local fallback",
                "fallback_doc": (
                    f"# {body.library_id}\n\n"
                    f"Topic: {body.topic}\n\n"
                    "(Real docs would come from Context7 here · "
                    "see https://github.com/upstash/context7)"
                ),
                "spec": "§136 scaffold"}
    url = cfg["url"] or DEFAULT_URL
    api_key = os.environ.get("CONTEXT7_API_KEY", "")
    try:
        r = httpx.post(f"{url}/get-library-docs",
                        json={"context7CompatibleLibraryID": body.library_id,
                              "topic": body.topic, "tokens": body.tokens},
                        headers={"Authorization": f"Bearer {api_key}"},
                        timeout=30)
        return {**stamp(), "library_id": body.library_id,
                "topic": body.topic,
                "tokens_requested": body.tokens,
                "context7_response": r.json() if r.status_code == 200 else None,
                "http_status": r.status_code, "spec": "§136"}
    except Exception as e:
        return {**stamp(), "error": str(e)[:120], "spec": "§136"}


@router.get("/mcp-config")
def mcp_config():
    """Return the MCP server config block · operator pastes into Claude Code settings."""
    return {**stamp(),
            "mcp_servers_block": {
                "context7": {
                    "type": "http",
                    "url": "https://mcp.context7.com/mcp",
                    "headers": {"CONTEXT7_API_KEY": "YOUR_API_KEY_HERE"},
                },
            },
            "alternative_local_stdio": {
                "context7": {
                    "command": "npx",
                    "args":    ["-y", "@upstash/context7-mcp"],
                    "env":     {"CONTEXT7_API_KEY": "YOUR_API_KEY_HERE"},
                },
            },
            "install": "Add to ~/.claude/config.json or via Claude Code settings panel",
            "spec": "§136 MCP config helper"}


@router.get("/overview")
def overview():
    return {**stamp(),
            "title": "Context7 MCP · up-to-date library docs",
            "purpose": "Pull current docs (LangChain · React · etc.) directly into LLM context",
            "tools_provided": ["resolve-library-id", "get-library-docs"],
            "endpoints": [
                "/health             · live config check",
                "/resolve            · library name → context7 ID",
                "/fetch-docs         · pull docs into context",
                "/mcp-config         · paste-able MCP config block",
            ],
            "spec": "§136"}
