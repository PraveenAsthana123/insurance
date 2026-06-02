"""OTel instrumentation bootstrap — call once at backend boot.

Per ADR-009 + global §57.6 (canonical fields) + Codex 2026-06-01.

Usage in your FastAPI app:
    from core.otel_instrumentation import setup_otel
    setup_otel(app, service_name="insur-backend")
"""
from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


def setup_otel(app, service_name: str = "insur-backend") -> None:
    """Initialize OpenTelemetry + auto-instrument FastAPI / httpx / psycopg.

    Args:
        app: FastAPI application instance
        service_name: How this service identifies itself in traces
    """
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
            OTLPSpanExporter,
        )
    except ImportError:
        logger.warning(
            "OpenTelemetry SDK not installed; OTel disabled. "
            "Install: pip install opentelemetry-api opentelemetry-sdk "
            "opentelemetry-exporter-otlp opentelemetry-instrumentation-fastapi "
            "opentelemetry-instrumentation-httpx opentelemetry-instrumentation-psycopg"
        )
        return

    endpoint = os.getenv("INSUR_OTLP_ENDPOINT",
                         "http://otel-collector:4317")

    resource = Resource.create({
        "service.name": service_name,
        "service.namespace": "insur",
        "deployment.environment": os.getenv("ENV", "dev"),
    })

    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(
        OTLPSpanExporter(endpoint=endpoint, insecure=True)
    ))
    trace.set_tracer_provider(provider)

    # Auto-instrument common libraries
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        FastAPIInstrumentor.instrument_app(app)
    except ImportError:
        logger.warning("opentelemetry-instrumentation-fastapi not installed")

    try:
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        HTTPXClientInstrumentor().instrument()
    except ImportError:
        pass

    try:
        from opentelemetry.instrumentation.psycopg import PsycopgInstrumentor
        PsycopgInstrumentor().instrument(enable_commenter=True)
    except ImportError:
        pass

    logger.info("OTel initialized; export → %s", endpoint)
