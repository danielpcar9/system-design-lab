module LabFaults
  module_function

  def enabled?
    ENV["LAB_FAULTS"] == "1" && %w[lab development dev test].include?(env)
  end

  def env
    (ENV["LAB_ENV"] || ENV["RAILS_ENV"] || "lab").downcase
  end

  def delay!
    return unless enabled?
    ms = Integer(ENV.fetch("LAB_FAULT_DELAY_MS", "0"))
    sleep(ms / 1000.0) if ms.positive?
  end

  def postgres_down?
    enabled? && ENV["LAB_FAULT_POSTGRES"] == "1"
  end

  def redis_down?
    enabled? && ENV["LAB_FAULT_REDIS"] == "1"
  end

  def worker_down?
    enabled? && ENV["LAB_FAULT_WORKER"] == "1"
  end
end
