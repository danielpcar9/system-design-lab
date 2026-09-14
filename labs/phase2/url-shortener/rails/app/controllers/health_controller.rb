class HealthController < ActionController::API
  def show
    render json: {
      status: "ok",
      storage: "postgres",
      cache: ENV["REDIS_URL"].present? ? "redis" : "none"
    }
  end

  def ready
    LabFaults.delay!
    if LabFaults.postgres_down?
      return render json: { status: "not-ready", error: "postgres" }, status: :service_unavailable
    end

    ActiveRecord::Base.connection.execute("SELECT 1")
    render json: { status: "ready", storage: "postgres" }
  rescue StandardError => error
    render json: { status: "not-ready", error: error.message }, status: :service_unavailable
  end
end
