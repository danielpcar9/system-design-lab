export type InterviewOverlay = {
  prompt: string;
  fr: Record<string, string>;
  nfr: Record<string, string>;
  dive: Record<string, { question: string; rails: string; fastapi: string }>;
  spof: Record<string, { label: string; mitigation: string }>;
};

export const INTERVIEW_ES: Record<string, InterviewOverlay> = {
  "url-shortener": {
    prompt: "Diseña un acortador de URLs (TinyURL).",
    fr: {
      encode: "Crear un código corto a partir de una URL larga",
      redirect: "HTTP 302 del código corto a la URL larga",
      "optional-auth": "Usuarios autenticados pueden listar / borrar sus links",
      analytics: "Conteo de clicks sin bloquear el redirect",
    },
    nfr: {
      hot: "p99 bajo 20ms en un redirect cached",
      unique: "Los códigos son únicos (CP en insert)",
      "read-heavy": "Read:write alrededor de 100:1",
      abuse: "Admission control contra stampede y enumeración",
    },
    dive: {
      idgen: {
        question: "¿Cómo acuñas códigos cortos únicos sin un lock global?",
        rails:
          "Un unique index en code más rescue de RecordNotUnique en ActiveRecord, o una fila ticket-server. Los callbacks no deben acuñar dentro de after_save — eso racea.",
        fastapi:
          "INSERT … ON CONFLICT y un campo Pydantic code. El statement es el contrato de unicidad; no hay callback que esconda un segundo write.",
      },
      hotpath: {
        question: "¿Qué hay en el path del 302, y qué no?",
        rails:
          "Rack middleware o un controller flaco: Rails.cache.read, luego 302. Los counters de click van a Sidekiq. Cookie session no debe correr en esta route.",
        fastapi:
          "Un APIRouter dedicado que Depends solo de Redis. No abras una Session de SQLAlchemy en el hit path. Analytics es un job ARQ/Celery.",
      },
      stampede: {
        question: "¿Qué pasa cuando el cache está vacío para un código celebrity?",
        rails:
          "cache.fetch con un lock (Redis SETNX) o una tombstone de 1s. Sin eso, los workers de Puma hacen stampede a Postgres.",
        fastapi:
          "asyncio.Lock es per-process — usa Redis SET NX PX. El loop ASGI empeora el stampede si await SQL desde cada worker.",
      },
      enum: {
        question: "¿Cómo detienes la enumeración del espacio de 7 caracteres?",
        rails:
          "Rack::Attack keyed por IP y por prefix de código, en el stack de middleware antes del controller.",
        fastapi:
          "SlowAPI en la route de redirect. Olvida storage_uri y falla abierto en cada worker Uvicorn.",
      },
    },
    spof: {
      sql: { label: "SQL primary único", mitigation: "Réplicas + cache para el path 302" },
      cache: { label: "Cache frío tras un flush", mitigation: "stampede lock / request coalescing" },
      idgen: { label: "Colisión del ID generator", mitigation: "ticket server o unique index hasheado" },
    },
  },
  "social-feed": {
    prompt: "Diseña el home timeline de Twitter.",
    fr: {
      post: "Publicar un post",
      follow: "Follow / unfollow",
      home: "Home timeline de autores followed",
      search: "Buscar posts",
    },
    nfr: {
      fanout: "POST /posts no espera al fan-out de followers",
      celeb: "Los posts de celebrities usan un hybrid read path",
      fresh: "El home feed se siente fresco en segundos, no minutos",
      qps: "La hora pico de write no tumba los reads",
    },
    dive: {
      "fanout-write": {
        question: "¿Por qué fan-out-on-write es el default, y cuándo paras?",
        rails:
          "after_commit { FanoutJob.perform_later(id) }. Follows celebrity (>10k) saltan el job y caen a un hybrid read. No hagas fan-out en el request.",
        fastapi:
          "Publica a Redis/Kafka desde la route después del commit. Un consumer escribe listas por usuario. El HTTP handler no debe iterar followers.",
      },
      "timeline-cache": {
        question: "¿Cuál es la estructura de datos del timeline?",
        rails:
          "Redis list o zset por usuario vía Rails.cache / redis-rb. Trim a N. Cache-aside en read; el job es el writer.",
        fastapi:
          "El mismo zset. redis.asyncio, pipeline explícito. Pydantic es para el HTTP post, no para las entradas de la lista.",
      },
      "follow-graph": {
        question: "¿Dónde vive el grafo de follows cuando importan los hops?",
        rails:
          "SQL está bien para 1-hop. ActiveGraph / un cache de adyacencia denormalizado cuando pides friend-of-friend o 'quién likeó de mi grafo'.",
        fastapi:
          "SQLAlchemy para la tabla de edges; un walk Cypher o un set precomputado cuando el entrevistador pide 2-hop.",
      },
      "search-dual": {
        question: "¿Cómo search se mantiene a segundos de SQL?",
        rails:
          "after_commit indexa en OpenSearch vía un job. pg_search es la respuesta junior; dual-write + repair es la senior.",
        fastapi:
          "El consumer que hace fan-out también indexa. Un repair job desde SQL es la source of truth. Nunca indexar dentro del request.",
      },
    },
    spof: {
      "fanout-job": {
        label: "Lag del worker de fan-out",
        mitigation: "queue + hybrid fan-out para celebrities",
      },
      cache: {
        label: "Tormenta de misses del cache de timeline",
        mitigation: "precompute + cache-aside con TTL",
      },
      search: {
        label: "Drift de dual-write del cluster de search",
        mitigation: "repair job desde SQL",
      },
    },
  },
  "realtime-chat": {
    prompt: "Diseña WhatsApp.",
    fr: {
      one: "Mensajería 1:1",
      group: "Chat de grupo",
      presence: "Online / last seen",
      history: "Historial de mensajes en un dispositivo nuevo",
    },
    nfr: {
      sockets: "Decenas de miles de sockets concurrentes",
      order: "Orden por chat",
      offline: "Queue offline hasta que el dispositivo reconecta",
      ack: "Delivery receipts sin bloquear el send",
    },
    dive: {
      "socket-model": {
        question: "¿Qué vive en el proceso de socket versus Redis?",
        rails:
          "ActionCable Connection autentica; Channel hace stream desde un chat_id. El roster es Redis, no la memoria del worker Puma/Cable.",
        fastapi:
          "WebSocket accept después de JWT. Fan-out a través de un broker (Redis pub/sub). No guardes la sala en un set() del event loop.",
      },
      presence: {
        question: "¿Cómo last-seen es barato y se le permite estar mal?",
        rails:
          "Redis SET con TTL en el ping; AP, no CP. Rails.cache está bien si es Redis, no MemoryStore.",
        fastapi:
          "redis.set(key, ts, ex=30) en cada ping. Presence es AP. No escribas last-seen a SQL a 1Hz.",
      },
      order: {
        question: "¿De dónde sale el orden por chat?",
        rails:
          "Shard key = chat_id. Un seq monotónico por chat, no created_at. Los callbacks de ActiveRecord no deben acuñar seq sin lock o sequence de DB.",
        fastapi:
          "La misma shard key. SQLAlchemy update de chat.seq RETURNING, o un Redis INCR por chat antes de persistir.",
      },
      media: {
        question: "¿Dónde viven las notas de voz y las imágenes?",
        rails: "ActiveStorage a S3. La fila del mensaje guarda la blob key. Direct uploads saltan Puma.",
        fastapi:
          "URL S3 presignada. UploadFile es solo para tools admin pequeñas — los clients suben al bucket y luego POST de la key.",
      },
    },
    spof: {
      "socket-host": {
        label: "Roster en memoria del proceso de socket",
        mitigation: "Presence Redis + broker",
      },
      order: { label: "Reorden entre workers", mitigation: "partition key por chat" },
      offline: { label: "Drop al desconectar", mitigation: "persistir y luego fan-out" },
    },
  },
  uber: {
    prompt: "Diseña Uber.",
    fr: {
      request: "El rider pide un trip",
      match: "Match a un driver cercano",
      track: "Location en vivo durante el trip",
      bill: "Persistir el trip para billing",
    },
    nfr: {
      ping: "Los pings de driver ~1Hz no deben pegar al SQL de trip",
      "match-slo": "Match en un par de segundos in-city",
      money: "El registro del trip es CP / durable",
      geo: "Query de nearby sobre drivers actuales",
    },
    dive: {
      geo: {
        question: "¿A dónde va un ping de driver a 1Hz?",
        rails:
          "Redis GEOADD en un PORO. No un modelo ActiveRecord, no un callback en Trip. TTL para que expiren los ghosts.",
        fastapi:
          "redis.geoadd en la route de ping. Sin session SQLAlchemy. Pydantic valida lng/lat; Redis es el store.",
      },
      match: {
        question: "¿El matching está en el request path?",
        rails:
          "Trip.create luego MatchDriverJob.perform_later. El rider GET hace poll o ActionCable se subscribe. Karafka si superas Sidekiq.",
        fastapi:
          "Publica trip.requested a Rabbit/Kafka. Un consumer GEORADIUS y escribe driver_id. El POST responde 202.",
      },
      billing: {
        question: "¿Qué puede compartir WAL con dinero?",
        rails:
          "Trip y Payment vía ActiveRecord, CP, unique indexes. Location y presence nunca tocan este primary.",
        fastapi:
          "SQLAlchemy en el servicio de billing. Engine distinto al path de ping. Outbox table si haces dual-write a la queue.",
      },
      edge: {
        question: "¿Por qué hay un gateway delante de matching y billing?",
        rails:
          "Nginx rutea /trips al monolito hasta que extraes. El nibble de Auth y los 429s pertenecen al edge, no a cada controller.",
        fastapi:
          "Ya tienes dos targets Uvicorn (location vs billing). El gateway es cómo el client móvil sigue viendo un host.",
      },
    },
    spof: {
      "sql-location": {
        label: "Location en el primary de trip",
        mitigation: "Redis GEO / NoSQL para pings",
      },
      matcher: { label: "Matcher in-line en el HTTP request", mitigation: "queue + worker" },
      city: { label: "Un índice global", mitigation: "shard por city / geohash" },
    },
  },
  "rag-support": {
    prompt: "Diseña un agente autónomo de soporte con RAG.",
    fr: {
      ingest: "Ingestar docs de política en un vector store",
      retrieve: "Retrieve passages grounded antes de generate",
      answer: "Responder el ticket con citas",
      memory: "Mantener una sliding session window entre turnos",
      escalate: "Escalar a un humano cuando la confianza es baja",
    },
    nfr: {
      grounded: "Nada de respuesta sin una cita retrieved",
      pii: "PII recortada antes del prompt",
      budget: "Tope de tokens por tenant, fail closed",
      "llm-slo": "p99 del LLM bajo ~1.5s con retrieval cached",
    },
    dive: {
      chunk: {
        question: "¿Cómo haces chunk y retrieve para que el modelo no alucine política?",
        rails:
          "neighbor/pgvector en PolicyChunk. Embed en ingest (job), retrieve cosine-top-k, pasa passages como system prefix. Nunca embed dentro del request.",
        fastapi:
          "Collection Qdrant con payload source_id. Dual-write desde el worker de ingest. La route de generate solo puede llamar retrieve(), nunca el corpus crudo.",
      },
      context: {
        question: "¿Cómo mantienes contexto sin volcar 40 turnos en la window?",
        rails:
          "Solid Cache / Redis list, ltrim a 12, resume turnos viejos en Sidekiq. El body del ticket se queda en SQL.",
        fastapi:
          "Redis RPUSH + LTRIM. LangGraph thread_id es la key. Resume en un job; no dejes crecer el prompt.",
      },
      route: {
        question: "¿Qué modelo hace classify vs generate, y quién guarda la key?",
        rails:
          "Un router PORO: mini para intent, capable para answer. Un proceso gateway guarda la vendor key.",
        fastapi:
          "LiteLLM model_name cheap vs capable. Los servicios llaman un base_url. Fallback en timeout a FAQ cached.",
      },
      tokens: {
        question: "¿Qué pasa cuando un tenant loopea el agente?",
        rails:
          "Redis incrby de tokens estimados por minuto, fail closed. Rack::Attack no basta — cuenta requests, no tokens.",
        fastapi:
          "Admit en un Depends, refund de max_tokens no usados en finally. LiteLLM max_budget es el backstop.",
      },
    },
    spof: {
      vendor: {
        label: "Outage de un solo vendor LLM",
        mitigation: "Modelo fallback del gateway / FAQ cached",
      },
      drift: {
        label: "Cambio de modelo de embedding vs vectores guardados",
        mitigation: "Job de re-embed + collections versionadas",
      },
      inject: {
        label: "Prompt injection vía el body del ticket",
        mitigation: "Trata docs retrieved como data; allow-list de tools",
      },
      spend: {
        label: "Completion desbocada",
        mitigation: "Token limiter fail-closed + max_tokens",
      },
    },
  },
  "agentic-pipeline": {
    prompt: "Diseña un pipeline agéntico de ejecución con tools externas.",
    fr: {
      plan: "Planear una tarea multi-step desde un goal de usuario",
      tools: "Llamar tools externas (search, code, HTTP)",
      sandbox: "Ejecutar código no confiable en aislamiento",
      resume: "Reanudar un run tras crash de un worker",
      audit: "Persistir un trace replayable del I/O de tools",
    },
    nfr: {
      durable: "Los runs de larga duración sobreviven a la muerte del proceso",
      idempotent: "Los steps de tools son idempotentes en retry",
      bound: "Los loops tienen un tope max-step / tokens",
      escape: "El sandbox no tiene secrets de producción",
    },
    dive: {
      checkpoint: {
        question: "¿Dónde vive el control flow para que un kill -9 no reinicie desde cero?",
        rails:
          "AASM es una columna, no exec durable. Temporal workflow + activities; side effects solo en activities.",
        fastapi:
          "LangGraph compile(checkpointer=PostgresSaver). El mismo thread_id reanuda. Acota ciclos con max_steps.",
      },
      jail: {
        question: "¿Cómo corre el código generado por tools sin compartir kernel con la API?",
        rails:
          "Una queue Sidekiq cuyos workers no tienen DATABASE_URL. Timeout + cgroup kill. Un regex-deny no es un boundary.",
        fastapi:
          "asyncio subprocess o un microVM Firecracker. Isolated -I, sin secrets en env, resultado en una queue.",
      },
      "route-tools": {
        question: "¿Cómo ruteas planner vs classifier cheap vs generación larga?",
        rails: "Router PORO por tarea. Los timeouts ocupan Puma — corre generaciones desde un job.",
        fastapi:
          "Router LiteLLM. El planner puede ser capable; classify por tool es mini. Circuit-break en 429.",
      },
      "llm-fail": {
        question: "¿Cuál es el fallback cuando el modelo da 429 a mitad del grafo?",
        rails:
          "semian alrededor del client; circuito abierto sirve el último checkpoint + un 503 al usuario. No busy-retry.",
        fastapi:
          "aiobreaker en acompletion. Reanuda desde el checkpointer cuando el probe half-open tiene éxito.",
      },
    },
    spof: {
      loop: { label: "Loop de tools sin cota", mitigation: "max_steps + token limiter" },
      timeout: {
        label: "Hang del LLM en un worker Puma/Uvicorn",
        mitigation: "timeout + async job / workflow",
      },
      state: { label: "Estado del grafo in-memory", mitigation: "Checkpointer Postgres/Redis" },
      poison: {
        label: "Output de tool envenenado reentrando al prompt",
        mitigation: "schema-validate el I/O de tools; sandbox",
      },
    },
  },
};

export const SCORE_NOTES_ES = {
  scopeComplete: "El alcance funcional y no funcional está completo.",
  nameRemaining: "Nombra los requisitos que faltan antes de dibujar cajas.",
  tokenQps: "El QPS del token envelope está en el orden de magnitud correcto.",
  envelopeQps: "El QPS del envelope está en el orden de magnitud correcto.",
  expectedQps: "Se esperan ~{n} QPS pico a partir del mix de DAU dado.",
  hldMissing: "El HLD no tiene {names}.",
  hldMatch: "Las cajas high-level coinciden con el esqueleto contratable.",
  diveAgentic: "Deep-dive de seams agénticos pendientes: memoria, routing, sandbox, checkpoints.",
  diveBackend: "Haz deep-dive de los componentes críticos restantes (Rails vs FastAPI).",
  diveDone: "El deep dive cubre el critical path en ambos stacks.",
  spofAgentic: "Nombra los modos de fallo LLM restantes y las cotas de loop.",
  spofBackend: "Nombra los single points of failure restantes.",
};
