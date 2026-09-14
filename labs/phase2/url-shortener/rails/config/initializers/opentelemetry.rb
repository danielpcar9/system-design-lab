# frozen_string_literal: true

# OpenTelemetry configuration for Rails.
# Disabled by default unless OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_TRACES_EXPORTER=otlp is set.

endpoint = ENV["OTEL_EXPORTER_OTLP_ENDPOINT"].to_s.strip
traces_exporter = ENV["OTEL_TRACES_EXPORTER"].to_s.strip.downcase

if traces_exporter != "none" && (endpoint.present? || traces_exporter == "otlp")
  require "opentelemetry/sdk"
  require "opentelemetry/exporter/otlp"
  require "opentelemetry/instrumentation/rails"
  require "opentelemetry/instrumentation/rack"
  require "opentelemetry/instrumentation/action_pack"
  require "opentelemetry/instrumentation/pg"
  require "opentelemetry/instrumentation/redis"

  OpenTelemetry::SDK.configure do |c|
    c.service_name = ENV.fetch("OTEL_SERVICE_NAME", "url-shortener-rails")
    c.use "OpenTelemetry::Instrumentation::Rack", {
      use_rack_events: false
    }
    c.use "OpenTelemetry::Instrumentation::ActionPack"
    c.use "OpenTelemetry::Instrumentation::Rails"
    c.use "OpenTelemetry::Instrumentation::PG"
    c.use "OpenTelemetry::Instrumentation::Redis"
  end

  class SdlOpenTelemetryRequestId
    def initialize(app)
      @app = app
    end

    def call(env)
      request_id = env["action_dispatch.request_id"] || env["HTTP_X_REQUEST_ID"]
      OpenTelemetry::Trace.current_span.set_attribute("app.request_id", request_id.to_s) if request_id.present?
      @app.call(env)
    end
  end

  Rails.application.config.middleware.insert_before 0, SdlOpenTelemetryRequestId

  ActiveSupport::Notifications.subscribe("process_action.action_controller") do |_name, _start, _finish, _id, payload|
    request = payload[:request]
    request_id = request&.request_id || request&.get_header("HTTP_X_REQUEST_ID")
    span = OpenTelemetry::Trace.current_span
    span.set_attribute("app.request_id", request_id.to_s) if request_id.present? && span.recording?
  end
end
