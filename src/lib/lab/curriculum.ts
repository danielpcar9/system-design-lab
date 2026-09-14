import type { Bilingual } from "../i18n/locale.ts";
import type { ComponentKind, StackId } from "./types.ts";

export type Mastery = "not-started" | "in-progress" | "mastered";

export type ExerciseTest = {
  id: string;
  visible: boolean;
  label: Bilingual;
  /** Static source inspection — never executes student code. */
  match: (code: string, stack: StackId) => boolean;
};

export type Exercise = {
  id: string;
  scenarioId: string;
  kind: ComponentKind;
  title: Bilingual;
  challenge: Bilingual;
  objectives: Bilingual[];
  prerequisites: Bilingual[];
  concepts: { id: string; label: Bilingual }[];
  success: Bilingual[];
  hints: Bilingual[];
  reflection: Bilingual;
  starters: Record<StackId, string>;
  tests: ExerciseTest[];
};

function hasAny(code: string, needles: string[]): boolean {
  const n = code.toLowerCase();
  return needles.some((item) => n.includes(item.toLowerCase()));
}

export const EXERCISES: Exercise[] = [
  {
    id: "shortener-create",
    scenarioId: "url-shortener",
    kind: "api",
    title: { en: "Create a short link", es: "Crear un link corto" },
    challenge: {
      en: "Implement POST /links: validate an absolute HTTP(S) URL, persist a unique code, return 201, and make a collision a 409.",
      es: "Implementa POST /links: valida una URL HTTP(S) absoluta, persiste un código único, responde 201 y convierte una colisión en 409.",
    },
    objectives: [
      { en: "Validate at the HTTP boundary, not after persist.", es: "Valida en el borde HTTP, no después de persistir." },
      { en: "Keep uniqueness in the database constraint.", es: "Deja la unicidad en el constraint de la base de datos." },
      { en: "Return an explicit 409 instead of a generic 500.", es: "Devuelve un 409 explícito, no un 500 genérico." },
    ],
    prerequisites: [
      { en: "You can read a Rails controller or a FastAPI route.", es: "Sabes leer un controller Rails o una ruta FastAPI." },
      { en: "You know what a unique index is for.", es: "Sabes para qué sirve un unique index." },
    ],
    concepts: [
      { id: "http-contract", label: { en: "HTTP contract", es: "Contrato HTTP" } },
      { id: "unique-index", label: { en: "Unique index", es: "Unique index" } },
      { id: "collision", label: { en: "Collision as 409", es: "Colisión como 409" } },
    ],
    success: [
      { en: "Valid payload → 201 { code, url }", es: "Payload válido → 201 { code, url }" },
      { en: "Invalid URL → 422 { error }", es: "URL inválida → 422 { error }" },
      { en: "Duplicate generated code after retries → 409 { error }", es: "Código duplicado tras reintentos → 409 { error }" },
    ],
    hints: [
      { en: "Write the status codes first, then the persist call.", es: "Escribe primero los status codes, luego el persist." },
      { en: "Rescue RecordNotUnique / UniqueViolation — do not swallow it.", es: "Haz rescue de RecordNotUnique / UniqueViolation — no lo tragues." },
      { en: "A unique index on code is the source of truth, not an if in memory.", es: "El unique index en code es la fuente de verdad, no un if en memoria." },
    ],
    reflection: {
      en: "Why is a unique index stronger than an application-level `if code exists` check under two concurrent POSTs?",
      es: "¿Por qué un unique index es más fuerte que un `if code exists` en la app con dos POST concurrentes?",
    },
    starters: {
      rails: `class LinksController < ApplicationController
  def create
    # validate params
    # persist a unique short code
    # return 201 or 409
  end
end`,
      fastapi: `@router.post("/links", status_code=201)
async def create_link(payload: LinkIn, db: Session = Depends(get_db)):
    # validate payload
    # persist a unique short code
    # return 201 or 409
    pass`,
    },
    tests: [
      {
        id: "contract",
        visible: true,
        label: { en: "Declares POST /links or #create", es: "Declara POST /links o #create" },
        match: (code, stack) =>
          stack === "rails" ? hasAny(code, ["def create", "post"]) : hasAny(code, ["post", "/links", "create_link"]),
      },
      {
        id: "failure",
        visible: true,
        label: { en: "Makes collision an explicit 409", es: "Hace de la colisión un 409 explícito" },
        match: (code) => hasAny(code, ["409", "conflict", "recordnotunique", "uniqueviolation"]),
      },
      {
        id: "persistence",
        visible: true,
        label: { en: "Mentions unique / insert / commit", es: "Menciona unique / insert / commit" },
        match: (code) => hasAny(code, ["unique", "commit", "insert", "create!"]),
      },
      {
        id: "validation",
        visible: true,
        label: { en: "Validates HTTP(S) URL", es: "Valida URL HTTP(S)" },
        match: (code) => hasAny(code, ["http", "https", "uri", "urlparse", "field_validator", "validates"]),
      },
      {
        id: "no-analytics-inline",
        visible: false,
        label: { en: "Does not increment clicks on the create path", es: "No incrementa clicks en el create" },
        match: (code) => !hasAny(code, ["clicks +=", "click_count", "increment!(:clicks)"]),
      },
    ],
  },
  {
    id: "shortener-cache",
    scenarioId: "url-shortener",
    kind: "cache",
    title: { en: "Redirect from cache", es: "Redirect desde cache" },
    challenge: {
      en: "GET /r/:code must 302 from Redis on hit and load SQL on miss. If Redis is down, still redirect from PostgreSQL.",
      es: "GET /r/:code debe hacer 302 desde Redis en hit y cargar SQL en miss. Si Redis cae, aún redirige desde PostgreSQL.",
    },
    objectives: [
      { en: "Cache-aside for the hot redirect key.", es: "Cache-aside para la key caliente del redirect." },
      { en: "Fail open to SQL when Redis times out.", es: "Falla abierto a SQL cuando Redis hace timeout." },
    ],
    prerequisites: [{ en: "Finish create-link first.", es: "Termina create-link primero." }],
    concepts: [
      { id: "cache-aside", label: { en: "Cache-aside", es: "Cache-aside" } },
      { id: "fail-open", label: { en: "Redis fail-open", es: "Redis fail-open" } },
    ],
    success: [
      { en: "Hit path does not open a SQL session.", es: "El hit no abre una sesión SQL." },
      { en: "Redis timeout still 302s from SQL.", es: "Timeout de Redis aún hace 302 desde SQL." },
    ],
    hints: [
      { en: "GET cache, on miss SELECT, then SETEX.", es: "GET cache, en miss SELECT, luego SETEX." },
      { en: "Wrap Redis in try/except — never let it 500 the redirect.", es: "Envuelve Redis en try/except — no dejes que un 500 mate el redirect." },
    ],
    reflection: {
      en: "When is fail-open on Redis the right call, and when would fail-closed be safer?",
      es: "¿Cuándo fail-open en Redis es correcto y cuándo fail-closed sería más seguro?",
    },
    starters: {
      rails: `def redirect
  # cache.read, on miss Link.find_by!, then cache.write
  # Redis timeout must not 500
end`,
      fastapi: `def redirect_link(code: str):
    # redis GET, on miss SQL, SETEX
    # Redis timeout must not 500
    pass`,
    },
    tests: [
      {
        id: "redirect",
        visible: true,
        label: { en: "Implements the redirect path", es: "Implementa el path de redirect" },
        match: (code) => hasAny(code, ["302", "redirect", "found"]),
      },
      {
        id: "cache",
        visible: true,
        label: { en: "Reads Redis / cache on the hot path", es: "Lee Redis / cache en el hot path" },
        match: (code) => hasAny(code, ["redis", "cache", "setex", "rails.cache"]),
      },
      {
        id: "fallback",
        visible: true,
        label: { en: "Falls back to SQL on cache failure", es: "Cae a SQL si el cache falla" },
        match: (code) => hasAny(code, ["rescue", "except", "timeout", "fallback", "sql"]),
      },
      {
        id: "no-write-on-get",
        visible: false,
        label: { en: "Does not persist a new row on GET", es: "No persiste una fila nueva en GET" },
        match: (code) => !hasAny(code, ["insert into", "link.create"]),
      },
    ],
  },
  {
    id: "feed-fanout",
    scenarioId: "social-feed",
    kind: "jobs",
    title: { en: "Fan-out on write", es: "Fan-out on write" },
    challenge: {
      en: "POST /posts must persist then enqueue fan-out. The HTTP request must not loop followers.",
      es: "POST /posts debe persistir y encolar fan-out. El request HTTP no debe iterar followers.",
    },
    objectives: [
      { en: "after_commit / enqueue after commit, never before.", es: "after_commit / enqueue después del commit, nunca antes." },
    ],
    prerequisites: [{ en: "Know why inline fan-out blows p99.", es: "Saber por qué el fan-out inline rompe el p99." }],
    concepts: [
      { id: "async-edge", label: { en: "Async edge", es: "Arista async" } },
      { id: "after-commit", label: { en: "after_commit", es: "after_commit" } },
    ],
    success: [{ en: "HTTP path persist-only; job writes timelines.", es: "HTTP solo persiste; el job escribe timelines." }],
    hints: [
      { en: "perform_later / enqueue after the INSERT commits.", es: "perform_later / enqueue después del INSERT." },
      { en: "Celebrity follows skip the job — hybrid read.", es: "Los follows celebrity saltan el job — hybrid read." },
    ],
    reflection: {
      en: "When do you stop fan-out-on-write and switch to a hybrid read path?",
      es: "¿Cuándo dejas fan-out-on-write y pasas a un hybrid read path?",
    },
    starters: {
      rails: `after_commit { FanoutJob.perform_later(id) }\n# skip when followers > 10_000`,
      fastapi: `# publish after commit, consumer writes per-user lists\n# do not loop followers in the HTTP handler`,
    },
    tests: [
      {
        id: "job",
        visible: true,
        label: { en: "Enqueues a job / queue", es: "Encola un job / queue" },
        match: (code) => hasAny(code, ["perform_later", "enqueue", "publish", "after_commit", "queue"]),
      },
      {
        id: "no-loop",
        visible: true,
        label: { en: "Does not loop followers on the request", es: "No itera followers en el request" },
        match: (code) => !hasAny(code, ["followers.each", "for follower in", "for f in followers"]),
      },
      {
        id: "hybrid",
        visible: false,
        label: { en: "Mentions celebrity / hybrid skip", es: "Menciona celebrity / hybrid skip" },
        match: (code) => hasAny(code, ["10_000", "10000", "celebrity", "hybrid"]),
      },
    ],
  },
  {
    id: "chat-socket",
    scenarioId: "realtime-chat",
    kind: "websocket",
    title: { en: "Roster lives in Redis", es: "El roster vive en Redis" },
    challenge: {
      en: "Authenticate the socket upgrade, fan out through a broker, and keep presence in Redis — not process memory.",
      es: "Autentica el upgrade del socket, haz fan-out por un broker y guarda presence en Redis — no en memoria del proceso.",
    },
    objectives: [
      { en: "Process memory is not a roster.", es: "La memoria del proceso no es un roster." },
    ],
    prerequisites: [{ en: "You know why sticky sockets still need a broker.", es: "Sabes por qué los sockets sticky aún necesitan un broker." }],
    concepts: [
      { id: "presence", label: { en: "Presence is AP", es: "Presence es AP" } },
      { id: "broker", label: { en: "Pub/sub broker", es: "Broker pub/sub" } },
    ],
    success: [{ en: "Room set is Redis; worker death does not drop the roster.", es: "El set de la sala es Redis; matar el worker no borra el roster." }],
    hints: [
      { en: "ActionCable Connection authenticates; Channel streams from chat_id.", es: "ActionCable Connection autentica; Channel hace stream de chat_id." },
      { en: "Do not keep the room in a Python set() on the event loop.", es: "No guardes la sala en un set() de Python en el event loop." },
    ],
    reflection: {
      en: "What happens to ordering if two workers both deliver the same chat_id?",
      es: "¿Qué pasa con el orden si dos workers entregan el mismo chat_id?",
    },
    starters: {
      rails: `# Connection#connect identifies current_user\n# roster in Redis, not the Cable worker`,
      fastapi: `# accept after JWT\n# fan-out through Redis pub/sub, not a local set()`,
    },
    tests: [
      {
        id: "socket",
        visible: true,
        label: { en: "Mentions WebSocket / ActionCable", es: "Menciona WebSocket / ActionCable" },
        match: (code) => hasAny(code, ["websocket", "actioncable", "cable", "accept"]),
      },
      {
        id: "redis-roster",
        visible: true,
        label: { en: "Roster / presence in Redis", es: "Roster / presence en Redis" },
        match: (code) => hasAny(code, ["redis", "presence", "pubsub", "pub/sub"]),
      },
      {
        id: "no-local-set",
        visible: false,
        label: { en: "Does not store the room in a local set()", es: "No guarda la sala en un set() local" },
        match: (code) => !hasAny(code, ["rooms = set", "roster = {}", "ROOMS ="]),
      },
    ],
  },
  {
    id: "uber-geo",
    scenarioId: "uber",
    kind: "nosql",
    title: { en: "Pings stay off the WAL", es: "Los pings no van al WAL" },
    challenge: {
      en: "1Hz driver pings go to Redis GEO. The trip row stays in SQL. Matching is a job, not the POST.",
      es: "Los pings de driver a 1Hz van a Redis GEO. La fila del trip queda en SQL. El matching es un job, no el POST.",
    },
    objectives: [
      { en: "Hot lossy location ≠ durable billing row.", es: "Location caliente y lossy ≠ fila durable de billing." },
    ],
    prerequisites: [{ en: "You can name a WAL.", es: "Sabes qué es un WAL." }],
    concepts: [
      { id: "geo", label: { en: "Redis GEO", es: "Redis GEO" } },
      { id: "cp-money", label: { en: "Money is CP", es: "El dinero es CP" } },
    ],
    success: [{ en: "Ping path has no SQLAlchemy/ActiveRecord session.", es: "El ping no abre sesión SQLAlchemy/ActiveRecord." }],
    hints: [
      { en: "GEOADD with TTL. Not Trip.update(lat:, lng:).", es: "GEOADD con TTL. No Trip.update(lat:, lng:)." },
      { en: "MatchDriverJob after Trip.create.", es: "MatchDriverJob después de Trip.create." },
    ],
    reflection: {
      en: "What is allowed to share a WAL with money?",
      es: "¿Qué puede compartir WAL con el dinero?",
    },
    starters: {
      rails: `# Redis GEOADD in a PORO. Not an ActiveRecord callback on Trip.`,
      fastapi: `# redis.geoadd in the ping route. No SQLAlchemy session.`,
    },
    tests: [
      {
        id: "geo",
        visible: true,
        label: { en: "Uses GEO / Redis for pings", es: "Usa GEO / Redis para pings" },
        match: (code) => hasAny(code, ["geoadd", "georadius", "redis", "nosql"]),
      },
      {
        id: "queue-match",
        visible: true,
        label: { en: "Matching is queued", es: "El matching va a una cola" },
        match: (code) => hasAny(code, ["perform_later", "queue", "202", "job"]),
      },
      {
        id: "no-sql-ping",
        visible: false,
        label: { en: "Does not UPDATE trips on each ping", es: "No hace UPDATE de trips en cada ping" },
        match: (code) => !hasAny(code, ["update(lat", "trip.lat =", "update trips set"]),
      },
    ],
  },
  {
    id: "rag-retrieve",
    scenarioId: "rag-support",
    kind: "vector-db",
    title: { en: "Retrieve, then generate", es: "Retrieve, then generate" },
    challenge: {
      en: "The generate route may only call retrieve(). No answer without a citation. Tokens are capped per tenant.",
      es: "La ruta generate solo puede llamar retrieve(). Sin cita no hay respuesta. Tokens tope por tenant.",
    },
    objectives: [
      { en: "Grounding is a retrieve-before-generate invariant.", es: "El grounding es un invariante retrieve-before-generate." },
    ],
    prerequisites: [{ en: "You know why weights are not a policy store.", es: "Sabes por qué los weights no son un policy store." }],
    concepts: [
      { id: "rag", label: { en: "RAG", es: "RAG" } },
      { id: "token-cap", label: { en: "Token limiter", es: "Token limiter" } },
    ],
    success: [{ en: "No generate without source_id. Fail closed on the cap.", es: "No generate sin source_id. Fail closed en el tope." }],
    hints: [
      { en: "Embed at ingest (job). Request path only queries.", es: "Embed en ingest (job). El request solo consulta." },
      { en: "Rack::Attack counts requests — you need tokens.", es: "Rack::Attack cuenta requests — necesitas tokens." },
    ],
    reflection: {
      en: "What happens when the embedding model changes versus stored vectors?",
      es: "¿Qué pasa cuando cambia el modelo de embeddings frente a los vectores guardados?",
    },
    starters: {
      rails: `# neighbor/pgvector retrieve cosine-top-k, then generate with citations`,
      fastapi: `# retrieve() then LiteLLM. refuse if passages empty`,
    },
    tests: [
      {
        id: "retrieve",
        visible: true,
        label: { en: "Retrieves before generate", es: "Hace retrieve antes de generate" },
        match: (code) => hasAny(code, ["retrieve", "vector", "pgvector", "qdrant", "nearest"]),
      },
      {
        id: "cite",
        visible: true,
        label: { en: "Requires a citation / source_id", es: "Exige citation / source_id" },
        match: (code) => hasAny(code, ["source_id", "citation", "cite", "refuse"]),
      },
      {
        id: "tokens",
        visible: false,
        label: { en: "Caps tokens, not only RPS", es: "Limita tokens, no solo RPS" },
        match: (code) => hasAny(code, ["token", "max_tokens", "budget"]),
      },
    ],
  },
  {
    id: "pipeline-checkpoint",
    scenarioId: "agentic-pipeline",
    kind: "state-machine",
    title: { en: "Checkpoint the graph", es: "Checkpoint del grafo" },
    challenge: {
      en: "Tool I/O runs in a sandbox. State resumes after kill -9. Loops have max_steps.",
      es: "El I/O de tools corre en un sandbox. El estado resume tras kill -9. Los loops tienen max_steps.",
    },
    objectives: [
      { en: "AASM is a column, not durable exec.", es: "AASM es una columna, no ejecución durable." },
    ],
    prerequisites: [{ en: "You can name a checkpointer.", es: "Puedes nombrar un checkpointer." }],
    concepts: [
      { id: "checkpoint", label: { en: "Checkpointer", es: "Checkpointer" } },
      { id: "sandbox", label: { en: "Sandbox", es: "Sandbox" } },
    ],
    success: [{ en: "Same thread_id resumes. Sandbox has no secrets.", es: "El mismo thread_id resume. El sandbox no tiene secretos." }],
    hints: [
      { en: "LangGraph compile(checkpointer=…). Temporal activities hold side effects.", es: "LangGraph compile(checkpointer=…). Los side effects viven en activities de Temporal." },
      { en: "Sandbox workers have no DATABASE_URL.", es: "Los workers del sandbox no tienen DATABASE_URL." },
    ],
    reflection: {
      en: "Why is in-memory graph state a SPOF for a minutes-long tool run?",
      es: "¿Por qué el estado in-memory del grafo es un SPOF en un run de minutos?",
    },
    starters: {
      rails: `# Temporal workflow + activities. AASM is not enough.`,
      fastapi: `# LangGraph checkpointer=PostgresSaver. sandbox subprocess, no secrets.`,
    },
    tests: [
      {
        id: "checkpoint",
        visible: true,
        label: { en: "Names a checkpointer / Temporal", es: "Nombra checkpointer / Temporal" },
        match: (code) => hasAny(code, ["checkpoint", "checkpointer", "temporal", "thread_id", "postgresaver"]),
      },
      {
        id: "sandbox",
        visible: true,
        label: { en: "Runs tools in a sandbox", es: "Corre tools en un sandbox" },
        match: (code) => hasAny(code, ["sandbox", "subprocess", "firecracker", "cgroup"]),
      },
      {
        id: "bound",
        visible: false,
        label: { en: "Bounds loops with max_steps", es: "Acota loops con max_steps" },
        match: (code) => hasAny(code, ["max_steps", "max-step", "bound"]),
      },
    ],
  },
];

export function exercisesFor(scenarioId: string): Exercise[] {
  return EXERCISES.filter((item) => item.scenarioId === scenarioId);
}

export function nextRecommended(
  scenarioId: string,
  statusOf: (id: string) => Mastery,
): Exercise | undefined {
  const list = exercisesFor(scenarioId);
  if (list.length === 0) return undefined;
  const retry = list.find((item) => statusOf(item.id) === "in-progress");
  if (retry) return retry;
  return list.find((item) => statusOf(item.id) === "not-started") ?? list[list.length - 1];
}

export function scenarioMastery(
  scenarioId: string,
  statusOf: (id: string) => Mastery,
): Mastery {
  const list = exercisesFor(scenarioId);
  if (list.length === 0) return "not-started";
  if (list.every((item) => statusOf(item.id) === "mastered")) return "mastered";
  if (list.every((item) => statusOf(item.id) === "not-started")) return "not-started";
  return "in-progress";
}

export function conceptIdsFor(scenarioId: string): string[] {
  return [...new Set(exercisesFor(scenarioId).flatMap((item) => item.concepts.map((c) => c.id)))];
}

export function nextGlobal(statusOf: (id: string) => Mastery): Exercise | undefined {
  const retry = EXERCISES.find((item) => statusOf(item.id) === "in-progress");
  if (retry) return retry;
  return EXERCISES.find((item) => statusOf(item.id) === "not-started");
}

export function exerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((item) => item.id === id);
}

export const EXERCISE_ORDER = EXERCISES.map((item) => item.id);

export const ERROR_TIPS: Record<string, Bilingual> = {
  contract: {
    en: "Name the route or action so a reviewer can grep the contract.",
    es: "Nombra la ruta o action para que un reviewer pueda hacer grep del contrato.",
  },
  failure: {
    en: "A swallowed UniqueViolation becomes a 500. Map it to 409.",
    es: "Un UniqueViolation tragado se vuelve 500. Mapealo a 409.",
  },
  persistence: {
    en: "If uniqueness is only an `if` in memory, two workers will collide.",
    es: "Si la unicidad es solo un `if` en memoria, dos workers van a chocar.",
  },
  validation: {
    en: "Reject relative URLs and javascript: at the parser, not in SQL.",
    es: "Rechaza URLs relativas y javascript: en el parser, no en SQL.",
  },
  cache: {
    en: "The 302 path should ask Redis first.",
    es: "El path del 302 debería preguntar a Redis primero.",
  },
  fallback: {
    en: "A Redis timeout must not take down redirects.",
    es: "Un timeout de Redis no debe tumbar los redirects.",
  },
  job: {
    en: "Fan-out belongs after commit, on a queue.",
    es: "El fan-out va después del commit, en una cola.",
  },
  retrieve: {
    en: "Generate without retrieve is the model answering from weights.",
    es: "Generate sin retrieve es el modelo contestando desde los weights.",
  },
  checkpoint: {
    en: "Without a checkpointer, kill -9 restarts the run from zero.",
    es: "Sin checkpointer, kill -9 reinicia el run desde cero.",
  },
};
