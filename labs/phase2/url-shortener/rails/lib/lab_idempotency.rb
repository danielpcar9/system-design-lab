module LabIdempotency
  STORE = {}

  module_function

  def get(key)
    STORE[key]
  end

  def put(key, payload)
    STORE[key] = payload
  end

  def reset!
    STORE.clear
  end
end
