from app.telemetry import is_telemetry_enabled


def test_telemetry_is_disabled_without_explicit_export_configuration(monkeypatch):
    monkeypatch.delenv("OTEL_EXPORTER_OTLP_ENDPOINT", raising=False)
    monkeypatch.delenv("OTEL_TRACES_EXPORTER", raising=False)

    assert is_telemetry_enabled() is False


def test_telemetry_requires_an_explicit_exporter_or_endpoint(monkeypatch):
    monkeypatch.setenv("OTEL_SERVICE_NAME", "test-only")
    monkeypatch.delenv("OTEL_EXPORTER_OTLP_ENDPOINT", raising=False)
    monkeypatch.delenv("OTEL_TRACES_EXPORTER", raising=False)

    assert is_telemetry_enabled() is False


def test_explicit_none_exporter_wins_over_an_endpoint(monkeypatch):
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://collector:4318")
    monkeypatch.setenv("OTEL_TRACES_EXPORTER", "none")

    assert is_telemetry_enabled() is False
