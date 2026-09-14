"""OpenTelemetry instrumentation setup for FastAPI lab.

Disabled by default unless OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_TRACES_EXPORTER=otlp is set.
Safely falls back to no-op if the collector is unreachable or packages are missing.
"""

from __future__ import annotations

import logging
import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastapi import FastAPI

logger = logging.getLogger(__name__)


def is_telemetry_enabled() -> bool:
    """Return True only if explicitly configured via standard OpenTelemetry variables."""
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "").strip()
    traces_exporter = os.getenv("OTEL_TRACES_EXPORTER", "").strip().lower()
    if traces_exporter == "none":
        return False
    return bool(endpoint or traces_exporter == "otlp")


def setup_telemetry(app: FastAPI) -> None:
    """Safely configure OpenTelemetry SDK and instrumentations if enabled."""
    if not is_telemetry_enabled():
        return

    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.psycopg import PsycopgInstrumentor
        from opentelemetry.instrumentation.redis import RedisInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        service_name = os.getenv("OTEL_SERVICE_NAME", "url-shortener-fastapi")
        resource = Resource.create({"service.name": service_name})

        provider = TracerProvider(resource=resource)

        endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://jaeger:4318")
        protocol = os.getenv("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf").lower()

        # Build exporter with a short timeout so unreachable collectors do not hang the API
        traces_endpoint = endpoint
        if not traces_endpoint.endswith("/v1/traces"):
            traces_endpoint = f"{traces_endpoint.rstrip('/')}/v1/traces"

        if protocol != "http/protobuf":
            logger.warning("Unsupported OTEL protocol %s; using http/protobuf", protocol)
        exporter = OTLPSpanExporter(endpoint=traces_endpoint, timeout=3)
        span_processor = BatchSpanProcessor(exporter, max_export_batch_size=64, schedule_delay_millis=500)
        provider.add_span_processor(span_processor)

        trace.set_tracer_provider(provider)

        # Server request span hook to tag request_id
        def server_request_hook(span, scope):
            if not span or not span.is_recording():
                return
            headers = dict(scope.get("headers", []))
            req_id = headers.get(b"x-request-id", b"").decode("latin1")
            if req_id:
                span.set_attribute("app.request_id", req_id)

        FastAPIInstrumentor.instrument_app(
            app,
            tracer_provider=provider,
            server_request_hook=server_request_hook,
        )

        # Instrument DB and Redis safely
        PsycopgInstrumentor().instrument(tracer_provider=provider)
        RedisInstrumentor().instrument(tracer_provider=provider)

    except Exception as error:
        # Graceful degradation: never crash application boot if OTel fails
        logger.warning("OpenTelemetry initialization skipped: %s", error)
