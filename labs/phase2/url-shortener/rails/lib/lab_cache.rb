require "json"

module LabCache
  TTL = 300

  module_function

  def read(code)
    client = redis
    return nil unless client

    payload = client.get("link:#{code}")
    return nil unless payload

    JSON.parse(payload)
  rescue LabRedis::Error, JSON::ParserError, SocketError
    nil
  end

  def write(link)
    client = redis
    return unless client

    client.setex(
      "link:#{link.code}",
      TTL,
      { code: link.code, url: link.url, id: link.id }.to_json
    )
  rescue LabRedis::Error, SocketError
    nil
  end

  def redis
    url = ENV["REDIS_URL"]
    return nil if url.blank? || LabFaults.redis_down?

    LabRedis.new(url, timeout: 0.2)
  end
end
