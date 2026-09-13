export type CheatOverlay = {
  title: string;
  kicker: string;
  body: string[];
  rails?: string;
  fastapi?: string;
};

export const CHEAT_ES: Record<string, CheatOverlay> = {
  hashing: {
    title: "Consistent hashing",
    kicker: "Shards que sobreviven a la muerte de un nodo",
    body: [
      "Mapea keys y nodos sobre un anillo. Una key pertenece al primer nodo en sentido horario.",
      "Añade o quita un nodo y solo sus vecinos remontan keys — no todo el dataset.",
      "Los nodos virtuales (muchos puntos por host) evitan que un nodo gordo posea un sector.",
    ],
    rails: "cache_store ring o un hash slot de Redis Cluster — rara vez escribes el anillo.",
    fastapi:
      "Eliges un client que entiende el anillo (redis-py cluster) o hasheas en el código de la app. Explícito.",
  },
  rate: {
    title: "Rate limiting",
    kicker: "Admission control",
    body: [
      "Token bucket: burst, luego steady. Bien para APIs.",
      "Sliding window: más suave que ventanas fijas a costa de dos counters.",
      "Key por IP, user o route. Guarda el counter en Redis, nunca en memoria del proceso.",
    ],
    rails:
      "Rack::Attack como middleware, antes del controller. Rails.cache es el counter si lo apuntaste a Redis.",
    fastapi:
      "SlowAPI + Request en la signature + storage_uri. Olvida cualquiera de los tres y falla abierto.",
  },
  sharding: {
    title: "Sharding",
    kicker: "Cuando un primary ya no es una base de datos",
    body: [
      "La shard key debe aparecer en casi cada query o haces scatter-gather.",
      "Directory / lookup service para users que se movieron. Evita hashear un user_id creciente si vas a reshard.",
      "Los sistemas de chat shardean por chat_id para que el orden viva en un solo lugar.",
    ],
    rails: "Apartments / application_record connected_to por shard. Los joins cross-shard son tu problema.",
    fastapi: "Una Session factory keyed por shard. El mismo problema, menos helpers.",
  },
  index: {
    title: "Database indexing",
    kicker: "Para qué sirve EXPLAIN",
    body: [
      "B-tree para equality y range. Hash solo para equality (limitado en PG).",
      "Índice compuesto: leftmost prefix. (user_id, created_at) no ayuda a created_at solo.",
      "Cada índice extra ralentiza writes. El motor de stress trata SQL write-heavy + sobre-indexado como latencia.",
    ],
    rails: "add_index en una migration. Un índice faltante no error — hace table-scan en producción.",
    fastapi: "Alembic o un DDL crudo. El mismo silencio, el mismo scan.",
  },
  breaker: {
    title: "Circuit breakers",
    kicker: "Fallar a propósito",
    body: [
      "Closed: las llamadas fluyen. Open: fail fast. Half-open: probe.",
      "Párealo con un bulkhead (máximo in-flight) para que una dependencia no se lleve todos los workers.",
      "Siempre escribe el fallback: cache stale, 503, o un path degradado.",
    ],
    rails: "semian alrededor de Redis y SQL. Los tickets son el bulkhead.",
    fastapi:
      "aiobreaker en el await. Comparte estado entre workers o cada loop abre en su propio reloj.",
  },
  "asgi-wsgi": {
    title: "ASGI vs WSGI",
    kicker: "Cómo Python habla con el server",
    body: [
      "WSGI: un request, un stack, sync. Gunicorn + Flask.",
      "ASGI: callable async, lifespan, WebSockets. Uvicorn + FastAPI.",
      "SQL bloqueante dentro de FastAPI async detiene el loop — córrelo en un thread o usa SQLAlchemy async.",
    ],
    fastapi: "FastAPI es nativo ASGI. Lifespan es donde abres el pool de Redis.",
  },
  rack: {
    title: "Rack middleware",
    kicker: "Lo que Rails corre antes de tu action",
    body: [
      "Una app Rack es call(env) → [status, headers, body]. El middleware envuelve a la siguiente app.",
      "Stack default: logger, static, request id, method override, CSRF, session, cookies, luego el router.",
      "Rack::Attack, Warden y tu tracing viven en esta lista. El orden es comportamiento.",
    ],
    rails: "rake middleware imprime el stack. Esa impresión es la vista under-the-hood.",
  },
  "uv-rv": {
    title: "uv vs rv",
    kicker: "Setup y entorno",
    body: [
      "uv (Astral) es el lockfile, venv y runner de Python. uv init, uv add, uv run — nunca actives un venv.",
      "rv es un version manager de Ruby. rv install fija el intérprete; Bundler posee las gems; bin/rails server arranca el proceso.",
      "Commitea el lockfile (uv.lock / Gemfile.lock). No commitees el virtualenv ni vendor/bundle.",
    ],
    rails: "rv install 3.3.6 && bundle add rails && bin/rails server.",
    fastapi: "uv init && uv add fastapi uvicorn sqlalchemy && uv run uvicorn main:app --reload.",
  },
  rag: {
    title: "RAG",
    kicker: "Retrieve, luego generate",
    body: [
      "Chunk en ingest, embed en un job, guarda en un índice vectorial. El request path solo consulta.",
      "Los passages entran al prompt como data. El modelo debe citar un source_id o negarse.",
      "Cambiar el modelo de embedding implica un re-embed. Versiona la collection.",
    ],
    rails: "neighbor/pgvector en un PolicyChunk. Embed en un job de Sidekiq, no en el controller.",
    fastapi: "Client Qdrant/Pinecone en retrieve(). LiteLLM solo ve los passages que ya trajiste.",
  },
  routing: {
    title: "Model routing",
    kicker: "Cheap vs capable",
    body: [
      "Classify, extract y guardrails: modelo pequeño/cheap. Generate y plan: modelo capable.",
      "Un gateway posee keys, timeouts y spend. Los app servers reciben un token interno.",
      "Fallback en timeout a un modelo más pequeño o una respuesta cached — nunca busy-retry un 429.",
    ],
    rails: "Un router PORO alrededor de ruby-openai. Los timeouts ocupan Puma — generate desde un job.",
    fastapi: "LiteLLM Router con model_name cheap/capable. Circuit-break acompletion.",
  },
  context: {
    title: "Context windows",
    kicker: "El presupuesto son tokens, no turnos",
    body: [
      "Una sliding window de los últimos N turnos más un resumen del resto.",
      "System prompt + passages recuperados + window deben caber con max_tokens reservado.",
      "Agent memory es Redis/SQL con TTL. No son los weights del LLM.",
    ],
    rails: "Lista en Rails.cache, trim, resume en ActiveJob. Cookie session es el store incorrecto.",
    fastapi: "Redis LTRIM + un checkpointer LangGraph. thread_id es la key.",
  },
};
