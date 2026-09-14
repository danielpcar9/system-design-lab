# Tiny CORS middleware so the studio can POST /links from the browser.
# Educational lab: open origins. Do not copy this allow-list into a bank.
class LabCors
  HEADERS = {
    "Access-Control-Allow-Origin" => "*",
    "Access-Control-Allow-Methods" => "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers" => "Content-Type, Idempotency-Key, X-Request-Id",
    "Access-Control-Expose-Headers" => "Location, X-Request-Id",
    "Access-Control-Max-Age" => "600",
  }.freeze

  def initialize(app)
    @app = app
  end

  def call(env)
    if env["REQUEST_METHOD"] == "OPTIONS"
      return [204, HEADERS.dup, []]
    end

    status, headers, body = @app.call(env)
    [status, headers.merge(HEADERS), body]
  end
end
