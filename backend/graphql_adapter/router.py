"""/api/v1/graphql/* · §56 Stage-1 GraphQL adapter.

Honest stance: project is REST-first (FastAPI 900+ endpoints). GraphQL
adapter ships as Stage-1 — schema declared, resolvers wire to existing REST
when activated, env-gated.
"""
from __future__ import annotations
import json
import os
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/graphql", tags=["graphql"])


def stamp() -> dict:
    return {"ts_utc": datetime.utcnow().isoformat() + "Z",
            "ts_local": datetime.now().isoformat(),
            "tz": os.environ.get("TZ", "America/Edmonton"),
            "spec": "§56 Stage-1 + §140"}


@router.get("/health")
def health():
    """Report installed libs + activation status."""
    libs = {}
    for lib in ["graphene", "strawberry", "ariadne", "gql"]:
        try:
            m = __import__(lib)
            libs[lib] = getattr(m, "__version__", "?")
        except ImportError:
            libs[lib] = None
    return {**stamp(), "service": "graphql-stage-1",
            "libs": libs,
            "activated": bool(os.environ.get("GRAPHQL_ENABLED")),
            "honest_caveat": "Project is REST-first · GraphQL surface NOT yet wired",
            "activate_with": "export GRAPHQL_ENABLED=1"}


@router.get("/schema")
def schema():
    """Static schema declaration (Stage-1 spec, no resolvers wired yet)."""
    return {**stamp(), "schema_sdl": """
type Query {
  # §131 + §133 contracts
  aiType(slug: String!): AIType
  aiTypes(limit: Int = 50, offset: Int = 0): [AIType!]!

  # §140 matrix
  useCaseCell(dept: String!, technique: String!): UseCaseCell
  useCaseMatrix(dept: String, technique: String): [UseCaseCell!]!

  # §139 Odysseus
  odysseusHealth: OdysseusHealth!
  odysseusPredict(input: OdysseusInput!): OdysseusPrediction!
}

type AIType {
  slug: String!
  ai_type: String!
  category: String!
  maturity_level: Int!
  purpose: String!
  data_source: String!
  data_types_handled: [String!]!
  score: String!
  spec: String!
}

type UseCaseCell {
  dept: String!
  technique: String!
  impl_level: String!
  score: Float!
  ref_model_paths: [String!]
  spec_md: String
}

type OdysseusHealth {
  accuracy: Float!
  f1_weighted: Float!
  model_loaded: Boolean!
  data_source: String!
}

type OdysseusPrediction {
  predicted_agent: String!
  confidence: Float!
  top_3_alternates: [AgentAlternate!]!
  action: String!
  latency_ms: Float!
}

type AgentAlternate {
  agent_id: String!
  confidence: Float!
}

input OdysseusInput {
  status: String!
  trigger_kind: String!
  duration_ms: Float!
  cost_usd: Float!
  tokens_in: Int!
  tokens_out: Int!
  retry_count: Int!
  input_text: String!
  skill: String!
}
""",
            "n_queries": 6, "n_types": 6,
            "honest_caveat": "Schema declared · resolvers stub-only · activate via GRAPHQL_ENABLED=1"}


@router.get("/overview")
def overview():
    return {**stamp(), "title": "GraphQL adapter · §56 Stage-1",
            "purpose": "Alternate query surface over §139 Odysseus + §140 matrix + §131 AI types",
            "endpoints": [
                "/health  · libs installed + activation status",
                "/schema  · SDL · 6 queries · 6 types"
            ],
            "alternative": "REST API at /api/v1/* is the primary surface (900 routes)",
            "rationale_for_stage_1": "Project is REST-first per §47 + §56 · GraphQL is optional"}
