export type CheatSheet = {
  id: string;
  title: string;
  kicker: string;
  body: string[];
  rails?: string;
  fastapi?: string;
};

export const CHEATSHEETS: CheatSheet[] = [
  {
    id: "hashing",
    title: "Consistent hashing",
    kicker: "Shards that survive a node death",
    body: [
      "Map both keys and nodes onto a ring. A key belongs to the first node clockwise.",
      "Add/remove a node and only its neighbors remount keys — not the whole dataset.",
      "Virtual nodes (many points per host) stop one fat node from owning a wedge.",
    ],
    rails: "cache_store ring or a Redis Cluster hash slot — you rarely write the ring.",
    fastapi: "You pick a client that understands the ring (redis-py cluster) or you hash in app code. Explicit.",
  },
  {
    id: "rate",
    title: "Rate limiting",
    kicker: "Admission control",
    body: [
      "Token bucket: burst, then steady. Good for APIs.",
      "Sliding window: smoother than fixed windows at the cost of two counters.",
      "Key by IP, user, or route. Store the counter in Redis, never in process memory.",
    ],
    rails: "Rack::Attack as middleware, before the controller. Rails.cache is the counter if you pointed it at Redis.",
    fastapi: "SlowAPI + Request in the signature + storage_uri. Forget any of the three and it fails open.",
  },
  {
    id: "sharding",
    title: "Sharding",
    kicker: "When one primary is not a database",
    body: [
      "Shard key must appear in almost every query or you scatter-gather.",
      "Directory / lookup service for users that moved. Avoid hashing a growing user_id if you will reshard.",
      "Chat systems shard by chat_id so order lives in one place.",
    ],
    rails: "Apartments / application_record connected_to per shard. Cross-shard joins are your problem.",
    fastapi: "A Session factory keyed by shard. Same problem, fewer helpers.",
  },
  {
    id: "index",
    title: "Database indexing",
    kicker: "What EXPLAIN is for",
    body: [
      "B-tree for equality and range. Hash for equality only (limited in PG).",
      "Composite index: leftmost prefix. (user_id, created_at) does not help created_at alone.",
      "Every extra index slows writes. The stress engine treats write-heavy + over-indexed SQL as latency.",
    ],
    rails: "add_index in a migration. Missing index does not error — it table-scans in production.",
    fastapi: "Alembic or a raw DDL. Same silence, same scan.",
  },
  {
    id: "breaker",
    title: "Circuit breakers",
    kicker: "Fail on purpose",
    body: [
      "Closed: calls flow. Open: fail fast. Half-open: probe.",
      "Pair with a bulkhead (max in-flight) so one dependency cannot take every worker.",
      "Always write the fallback: stale cache, 503, or a degraded path.",
    ],
    rails: "semian around Redis and SQL. Tickets are the bulkhead.",
    fastapi: "aiobreaker on the await. Share state across workers or each loop opens on its own clock.",
  },
  {
    id: "asgi-wsgi",
    title: "ASGI vs WSGI",
    kicker: "How Python talks to the server",
    body: [
      "WSGI: one request, one stack, sync. Gunicorn + Flask.",
      "ASGI: async callable, lifespan, WebSockets. Uvicorn + FastAPI.",
      "Blocking SQL inside async FastAPI stalls the loop — run it in a thread or use async SQLAlchemy.",
    ],
    fastapi: "FastAPI is ASGI-native. Lifespan is where you open the Redis pool.",
  },
  {
    id: "rack",
    title: "Rack middleware",
    kicker: "What Rails runs before your action",
    body: [
      "A Rack app is call(env) → [status, headers, body]. Middleware wraps the next app.",
      "Default stack: logger, static, request id, method override, CSRF, session, cookies, then the router.",
      "Rack::Attack, Warden, and your tracing sit in this list. Order is behavior.",
    ],
    rails: "rake middleware prints the stack. That printout is the under-the-hood view.",
  },
  {
    id: "uv-rv",
    title: "uv vs rv",
    kicker: "Setup & environment",
    body: [
      "uv (Astral) is Python's lockfile, venv, and runner. uv init, uv add, uv run — never activate a venv.",
      "rv is a Ruby version manager. rv install pins the interpreter; Bundler owns gems; bin/rails server starts the process.",
      "Commit the lockfile (uv.lock / Gemfile.lock). Do not commit the virtualenv or vendor/bundle.",
    ],
    rails: "rv install 3.3.6 && bundle add rails && bin/rails server.",
    fastapi: "uv init && uv add fastapi uvicorn sqlalchemy && uv run uvicorn main:app --reload.",
  },
  {
    id: "rag",
    title: "RAG",
    kicker: "Retrieve, then generate",
    body: [
      "Chunk at ingest, embed on a job, store in a vector index. The request path only queries.",
      "Passages go into the prompt as data. The model must cite a source_id or refuse.",
      "Changing the embedding model means a re-embed. Version the collection.",
    ],
    rails: "neighbor/pgvector on a PolicyChunk. Embed in a Sidekiq job, not in the controller.",
    fastapi: "Qdrant/Pinecone client in retrieve(). LiteLLM only sees the passages you already fetched.",
  },
  {
    id: "routing",
    title: "Model routing",
    kicker: "Cheap vs capable",
    body: [
      "Classify, extract, and guardrails: small/cheap model. Generate and plan: capable model.",
      "A gateway owns keys, timeouts, and spend. App servers get an internal token.",
      "Fallback on timeout to a smaller model or a cached answer — never busy-retry a 429.",
    ],
    rails: "A PORO router around ruby-openai. Timeouts occupy Puma — generate from a job.",
    fastapi: "LiteLLM Router with model_name cheap/capable. Circuit-break acompletion.",
  },
  {
    id: "context",
    title: "Context windows",
    kicker: "The budget is tokens, not turns",
    body: [
      "A sliding window of the last N turns plus a summary of the rest.",
      "System prompt + retrieved passages + window must fit with max_tokens reserved.",
      "Agent memory is Redis/SQL with TTL. It is not the LLM's weights.",
    ],
    rails: "Rails.cache list, trim, summarize on ActiveJob. Cookie session is the wrong store.",
    fastapi: "Redis LTRIM + a LangGraph checkpointer. thread_id is the key.",
  },
];
