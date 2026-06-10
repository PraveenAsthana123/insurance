"""Well-known files · Iter 36.

Serves:
  · /robots.txt           · search engine policy
  · /.well-known/security.txt · per RFC 9116 · security disclosure
  · /.well-known/openid-configuration · OIDC discovery (scaffold)
  · /.well-known/ai-plugin.json · ChatGPT plugin manifest (scaffold)
"""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse, JSONResponse

router = APIRouter(tags=["well-known"])


@router.get("/robots.txt", response_class=PlainTextResponse)
def robots():
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /api/v1/admin/\n"
        "Disallow: /healthz/\n"
        "Sitemap: /sitemap.xml\n"
    )


@router.get("/.well-known/security.txt", response_class=PlainTextResponse)
def security_txt():
    # Per RFC 9116
    return (
        "Contact: mailto:security@example.com\n"
        "Expires: 2027-12-31T23:59:59Z\n"
        "Preferred-Languages: en\n"
        "Canonical: https://example.com/.well-known/security.txt\n"
        "Policy: https://example.com/security-policy\n"
        "Acknowledgments: https://example.com/security-acknowledgments\n"
    )


@router.get("/.well-known/openid-configuration")
def oidc_config():
    # Scaffold · operator wires real OIDC provider
    return JSONResponse({
        "issuer": "https://example.com",
        "authorization_endpoint": "/oauth2/authorize",
        "token_endpoint": "/oauth2/token",
        "userinfo_endpoint": "/oauth2/userinfo",
        "jwks_uri": "/.well-known/jwks.json",
        "response_types_supported": ["code", "id_token", "token"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["RS256", "HS256"],
        "scaffold": True,
        "note": "Replace with real OIDC provider config in production",
    })


@router.get("/.well-known/ai-plugin.json")
def ai_plugin_manifest():
    # ChatGPT plugin manifest scaffold
    return JSONResponse({
        "schema_version": "v1",
        "name_for_model": "insur_analytics",
        "name_for_human": "Insur Analytics",
        "description_for_model": "Insurance AI analytics platform with 427 endpoints across 83 tags",
        "description_for_human": "Insurance analytics + governance",
        "api": {"type": "openapi", "url": "/api/v1/openapi-export"},
        "auth": {"type": "user_http", "authorization_type": "bearer"},
        "scaffold": True,
    })
