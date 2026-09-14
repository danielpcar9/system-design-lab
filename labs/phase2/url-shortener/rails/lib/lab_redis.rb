# Tiny RESP client so the lab can fail-open Redis without adding the redis gem.
require "socket"
require "uri"

class LabRedis
  Error = Class.new(StandardError)

  def initialize(url, timeout: 0.05)
    uri = URI.parse(url)
    @host = uri.host || "127.0.0.1"
    @port = uri.port || 6379
    @timeout = timeout
  end

  def get(key)
    call("GET", key)
  end

  def setex(key, ttl, value)
    call("SETEX", key, ttl.to_s, value)
  end

  def ping
    call("PING")
  end

  private

  def call(*args)
    socket = Socket.tcp(@host, @port, connect_timeout: @timeout)
    socket.setsockopt(Socket::IPPROTO_TCP, Socket::TCP_NODELAY, 1)
    socket.write(encode(args))
    read_reply(socket)
  rescue Errno::ECONNREFUSED, Errno::ETIMEDOUT, IOError, SocketError, Errno::EHOSTUNREACH => error
    raise Error, error.message
  ensure
    socket&.close
  end

  def encode(args)
    out = "*#{args.size}\r\n"
    args.each do |arg|
      value = arg.to_s
      out << "$#{value.bytesize}\r\n#{value}\r\n"
    end
    out
  end

  def read_reply(socket)
    socket.read_timeout = @timeout if socket.respond_to?(:read_timeout=)
    line = socket.gets
    raise Error, "empty redis reply" unless line

    case line[0]
    when "+"
      line[1..].strip
    when "-"
      raise Error, line[1..].strip
    when ":"
      line[1..].to_i
    when "$"
      size = line[1..].to_i
      return nil if size < 0
      payload = socket.read(size + 2)
      payload[0, size]
    else
      raise Error, "unsupported redis reply"
    end
  end
end
