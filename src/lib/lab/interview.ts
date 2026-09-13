import type { ComponentKind, InterviewLevel, InterviewTrack } from "./types";

export type InterviewStepId = "req" | "envelope" | "hld" | "dive" | "spof";

export const BACKEND_STEPS: { id: InterviewStepId; title: string; kicker: string }[] = [
  { id: "req", title: "Requirements", kicker: "01" },
  { id: "envelope", title: "Back-of-the-envelope", kicker: "02" },
  { id: "hld", title: "High-level design", kicker: "03" },
  { id: "dive", title: "Deep dive", kicker: "04" },
  { id: "spof", title: "SPOF and mitigation", kicker: "05" },
];

export const AGENTIC_STEPS: { id: InterviewStepId; title: string; kicker: string }[] = [
  { id: "req", title: "Requirements", kicker: "01" },
  { id: "envelope", title: "Token envelope", kicker: "02" },
  { id: "hld", title: "High-level design", kicker: "03" },
  { id: "dive", title: "Deep dive", kicker: "04" },
  { id: "spof", title: "Resilience", kicker: "05" },
];

export const INTERVIEW_STEPS = BACKEND_STEPS;

export type EnvelopeSpec = {
  dau: number;
  reqPerUser: number;
  peakX: number;
  payloadKb: number;
  retentionDays: number;
  tokensPerReq?: number;
};

export type DiveItem = {
  id: string;
  kind: ComponentKind;
  question: string;
  rails: string;
  fastapi: string;
};

export type InterviewScript = {
  scenarioId: string;
  track: InterviewTrack;
  prompt: string;
  fr: { id: string; label: string }[];
  nfr: { id: string; label: string }[];
  envelope: EnvelopeSpec;
  expectedKinds: ComponentKind[];
  dive: DiveItem[];
  spof: { id: string; label: string; mitigation: string }[];
};

export const INTERVIEWS: Record<string, InterviewScript> = {
  "url-shortener": {
    scenarioId: "url-shortener",
    track: "backend",
    prompt: "Design a URL shortener (TinyURL).",
    fr: [
      { id: "encode", label: "Create a short code from a long URL" },
      { id: "redirect", label: "HTTP 302 from short code to long URL" },
      { id: "optional-auth", label: "Authenticated users can list / delete their links" },
      { id: "analytics", label: "Click counts without blocking the redirect" },
    ],
    nfr: [
      { id: "hot", label: "p99 under 20ms on a cached redirect" },
      { id: "unique", label: "Codes are unique (CP on insert)" },
      { id: "read-heavy", label: "Read:write around 100:1" },
      { id: "abuse", label: "Admission control against stampede and enumeration" },
    ],
    envelope: { dau: 10_000_000, reqPerUser: 8, peakX: 3, payloadKb: 0.5, retentionDays: 365 },
    expectedKinds: ["cdn", "api", "cache", "database", "jobs", "rate-limit"],
    dive: [
      {
        id: "idgen",
        kind: "database",
        question: "How do you mint unique short codes without a global lock?",
        rails: "A unique index on code plus ActiveRecord rescue of RecordNotUnique, or a ticket-server row. Callbacks must not mint inside after_save — that races.",
        fastapi: "INSERT … ON CONFLICT and a Pydantic code field. The statement is the uniqueness contract; there is no callback to hide a second write.",
      },
      {
        id: "hotpath",
        kind: "cache",
        question: "What is on the 302 path, and what is not?",
        rails: "Rack middleware or a skinny controller: Rails.cache.read, then 302. Click counters go to Sidekiq. The cookie session must not run on this route.",
        fastapi: "A dedicated APIRouter that Depends on Redis only. Do not open a SQLAlchemy Session on the hit path. Analytics is an ARQ/Celery job.",
      },
      {
        id: "stampede",
        kind: "cache",
        question: "What happens when the cache is empty for a celebrity code?",
        rails: "cache.fetch with a lock (Redis SETNX) or a 1s tombstone. Without it, Puma workers stampede Postgres.",
        fastapi: "asyncio.Lock is per-process — use Redis SET NX PX. The ASGI loop makes the stampede worse if you await SQL from every worker.",
      },
      {
        id: "enum",
        kind: "rate-limit",
        question: "How do you stop enumeration of the 7-character space?",
        rails: "Rack::Attack keyed by IP and by code prefix, in the middleware stack before the controller.",
        fastapi: "SlowAPI on the redirect route. Forget storage_uri and it fails open in every Uvicorn worker.",
      },
    ],
    spof: [
      { id: "sql", label: "Single primary SQL", mitigation: "Replicas + cache for the 302 path" },
      { id: "cache", label: "Cold cache after flush", mitigation: "stampede lock / request coalescing" },
      { id: "idgen", label: "ID generator collision", mitigation: "ticket server or hashed unique index" },
    ],
  },
  "social-feed": {
    scenarioId: "social-feed",
    track: "backend",
    prompt: "Design Twitter's home timeline.",
    fr: [
      { id: "post", label: "Publish a post" },
      { id: "follow", label: "Follow / unfollow" },
      { id: "home", label: "Home timeline of followed authors" },
      { id: "search", label: "Search posts" },
    ],
    nfr: [
      { id: "fanout", label: "POST /posts does not wait on follower fan-out" },
      { id: "celeb", label: "Celebrity posts use a hybrid read path" },
      { id: "fresh", label: "Home feed feels seconds-fresh, not minutes" },
      { id: "qps", label: "Peak write hour does not take down reads" },
    ],
    envelope: { dau: 2_000_000, reqPerUser: 40, peakX: 4, payloadKb: 2, retentionDays: 30 },
    expectedKinds: ["api", "auth", "database", "cache", "jobs", "search"],
    dive: [
      {
        id: "fanout-write",
        kind: "jobs",
        question: "Why is fan-out-on-write the default, and when do you stop?",
        rails: "after_commit { FanoutJob.perform_later(id) }. Celebrity follows (>10k) skip the job and fall back to a hybrid read. Do not fan out in the request.",
        fastapi: "Publish to Redis/Kafka from the route after commit. A consumer writes per-user lists. The HTTP handler must not loop followers.",
      },
      {
        id: "timeline-cache",
        kind: "cache",
        question: "What is the timeline data structure?",
        rails: "Redis list or zset per user via Rails.cache / redis-rb. Trim to N. Cache-aside on read; the job is the writer.",
        fastapi: "Same zset. redis.asyncio, explicit pipeline. Pydantic is for the HTTP post, not for the list entries.",
      },
      {
        id: "follow-graph",
        kind: "graph",
        question: "Where does the follow graph live once hops matter?",
        rails: "SQL is fine for 1-hop. ActiveGraph / a denormalized adjacency cache when you ask friend-of-friend or 'who liked from my graph'.",
        fastapi: "SQLAlchemy for the edge table; a Cypher walk or a precomputed set when the interviewer asks for 2-hop.",
      },
      {
        id: "search-dual",
        kind: "search",
        question: "How does search stay within seconds of SQL?",
        rails: "after_commit indexes into OpenSearch via a job. pg_search is the junior answer; dual-write + repair is the senior one.",
        fastapi: "The consumer that fans out also indexes. Repair job from SQL is the source of truth. Never index inside the request.",
      },
    ],
    spof: [
      { id: "fanout-job", label: "Fan-out worker lag", mitigation: "queue + hybrid fan-out for celebrities" },
      { id: "cache", label: "Timeline cache miss storm", mitigation: "precompute + cache-aside with TTL" },
      { id: "search", label: "Search cluster dual-write drift", mitigation: "repair job from SQL" },
    ],
  },
  "realtime-chat": {
    scenarioId: "realtime-chat",
    track: "backend",
    prompt: "Design WhatsApp.",
    fr: [
      { id: "one", label: "1:1 messaging" },
      { id: "group", label: "Group chat" },
      { id: "presence", label: "Online / last seen" },
      { id: "history", label: "Message history on a new device" },
    ],
    nfr: [
      { id: "sockets", label: "Tens of thousands of concurrent sockets" },
      { id: "order", label: "Per-chat ordering" },
      { id: "offline", label: "Offline queue until the device reconnects" },
      { id: "ack", label: "Delivery receipts without blocking send" },
    ],
    envelope: { dau: 5_000_000, reqPerUser: 60, peakX: 3, payloadKb: 1, retentionDays: 90 },
    expectedKinds: ["load-balancer", "websocket", "api", "cache", "database", "jobs"],
    dive: [
      {
        id: "socket-model",
        kind: "websocket",
        question: "What lives in the socket process versus Redis?",
        rails: "ActionCable Connection authenticates; Channel streams from a chat_id. The roster is Redis, not the Puma/Cable worker's memory.",
        fastapi: "WebSocket accept after JWT. Fan-out through a broker (Redis pub/sub). Do not keep the room in a set() on the event loop.",
      },
      {
        id: "presence",
        kind: "cache",
        question: "How is last-seen cheap and allowed to be wrong?",
        rails: "Redis SET with TTL on ping; AP, not CP. Rails.cache is fine if it is Redis, not MemoryStore.",
        fastapi: "redis.set(key, ts, ex=30) on each ping. Presence is AP. Do not write last-seen to SQL at 1Hz.",
      },
      {
        id: "order",
        kind: "database",
        question: "Where does per-chat order come from?",
        rails: "Shard key = chat_id. A monotonic seq per chat, not created_at. ActiveRecord callbacks must not mint seq without a lock or DB sequence.",
        fastapi: "Same shard key. SQLAlchemy update of chat.seq RETURNING, or a Redis INCR per chat before persist.",
      },
      {
        id: "media",
        kind: "files",
        question: "Where do voice notes and images live?",
        rails: "ActiveStorage to S3. The message row stores the blob key. Direct uploads skip Puma.",
        fastapi: "Presigned S3 URL. UploadFile is only for small admin tools — clients upload to the bucket, then POST the key.",
      },
    ],
    spof: [
      { id: "socket-host", label: "Socket process memory roster", mitigation: "Redis presence + broker" },
      { id: "order", label: "Multi-worker reorder", mitigation: "per-chat partition key" },
      { id: "offline", label: "Drop on disconnect", mitigation: "persist then fan out" },
    ],
  },
  uber: {
    scenarioId: "uber",
    track: "backend",
    prompt: "Design Uber.",
    fr: [
      { id: "request", label: "Rider requests a trip" },
      { id: "match", label: "Match to a nearby driver" },
      { id: "track", label: "Live location during the trip" },
      { id: "bill", label: "Persist the trip for billing" },
    ],
    nfr: [
      { id: "ping", label: "Driver pings ~1Hz must not hit trip SQL" },
      { id: "match-slo", label: "Match under a couple of seconds in-city" },
      { id: "money", label: "Trip record is CP / durable" },
      { id: "geo", label: "Nearby query over current drivers" },
    ],
    envelope: { dau: 1_000_000, reqPerUser: 20, peakX: 5, payloadKb: 1, retentionDays: 365 },
    expectedKinds: ["gateway", "api", "auth", "cache", "nosql", "database", "queue", "jobs"],
    dive: [
      {
        id: "geo",
        kind: "nosql",
        question: "Where does a 1Hz driver ping go?",
        rails: "Redis GEOADD in a PORO. Not an ActiveRecord model, not a callback on Trip. TTL so ghosts expire.",
        fastapi: "redis.geoadd in the ping route. No SQLAlchemy session. Pydantic validates lng/lat; Redis is the store.",
      },
      {
        id: "match",
        kind: "queue",
        question: "Is matching on the request path?",
        rails: "Trip.create then MatchDriverJob.perform_later. The rider GET polls or ActionCable subscribes. Karafka if you outgrow Sidekiq.",
        fastapi: "Publish trip.requested to Rabbit/Kafka. A consumer GEORADIUS and writes driver_id. The POST returns 202.",
      },
      {
        id: "billing",
        kind: "database",
        question: "What is allowed to share a WAL with money?",
        rails: "Trip and Payment via ActiveRecord, CP, unique indexes. Location and presence never touch this primary.",
        fastapi: "SQLAlchemy on the billing service. Different Engine than the ping path. Outbox table if you dual-write to the queue.",
      },
      {
        id: "edge",
        kind: "gateway",
        question: "Why is there a gateway in front of matching and billing?",
        rails: "Nginx routes /trips to the monolith until you extract. Auth nibble and 429s belong at the edge, not in every controller.",
        fastapi: "You already have two Uvicorn targets (location vs billing). The gateway is how the mobile client still sees one host.",
      },
    ],
    spof: [
      { id: "sql-location", label: "Location in the trip primary", mitigation: "Redis GEO / NoSQL for pings" },
      { id: "matcher", label: "Inline matcher in the HTTP request", mitigation: "queue + worker" },
      { id: "city", label: "One global index", mitigation: "shard by city / geohash" },
    ],
  },
  "rag-support": {
    scenarioId: "rag-support",
    track: "agentic",
    prompt: "Design an autonomous support agent with RAG.",
    fr: [
      { id: "ingest", label: "Ingest policy docs into a vector store" },
      { id: "retrieve", label: "Retrieve grounded passages before generate" },
      { id: "answer", label: "Answer the ticket with citations" },
      { id: "memory", label: "Keep a sliding session window across turns" },
      { id: "escalate", label: "Escalate to a human when confidence is low" },
    ],
    nfr: [
      { id: "grounded", label: "No answer without a retrieved citation" },
      { id: "pii", label: "PII stripped before the prompt" },
      { id: "budget", label: "Per-tenant token cap, fail closed" },
      { id: "llm-slo", label: "LLM p99 under ~1.5s on cached retrieval" },
    ],
    envelope: {
      dau: 80_000,
      reqPerUser: 3,
      peakX: 4,
      payloadKb: 8,
      retentionDays: 180,
      tokensPerReq: 1800,
    },
    expectedKinds: ["gateway", "api", "llm-gateway", "vector-db", "agent-memory", "token-limiter", "database"],
    dive: [
      {
        id: "chunk",
        kind: "vector-db",
        question: "How do you chunk and retrieve so the model cannot hallucinate policy?",
        rails: "neighbor/pgvector on PolicyChunk. Embed at ingest (job), retrieve cosine-top-k, pass passages as a system prefix. Never embed inside the request.",
        fastapi: "Qdrant collection with payload source_id. Dual-write from the ingest worker. The generate route may only call retrieve(), never the raw corpus.",
      },
      {
        id: "context",
        kind: "agent-memory",
        question: "How do you keep context without dumping 40 turns into the window?",
        rails: "Solid Cache / Redis list, ltrim to 12, summarize older turns on Sidekiq. The ticket body stays in SQL.",
        fastapi: "Redis RPUSH + LTRIM. LangGraph thread_id is the key. Summarize on a job; do not grow the prompt.",
      },
      {
        id: "route",
        kind: "llm-gateway",
        question: "Which model does classify vs. generate, and who holds the key?",
        rails: "A router PORO: mini for intent, capable for answer. One gateway process holds the vendor key.",
        fastapi: "LiteLLM model_name cheap vs capable. Services call one base_url. Fallback on timeout to cached FAQ.",
      },
      {
        id: "tokens",
        kind: "token-limiter",
        question: "What happens when a tenant loops the agent?",
        rails: "Redis incrby of estimated tokens per minute, fail closed. Rack::Attack is not enough — it counts requests, not tokens.",
        fastapi: "Admit in a Depends, refund unused max_tokens in finally. LiteLLM max_budget is the backstop.",
      },
    ],
    spof: [
      { id: "vendor", label: "Single LLM vendor outage", mitigation: "Gateway fallback model / cached FAQ" },
      { id: "drift", label: "Embedding model change vs. stored vectors", mitigation: "Re-embed job + versioned collections" },
      { id: "inject", label: "Prompt injection via the ticket body", mitigation: "Treat retrieved docs as data; tool allow-list" },
      { id: "spend", label: "Runaway completion", mitigation: "Token limiter fail-closed + max_tokens" },
    ],
  },
  "agentic-pipeline": {
    scenarioId: "agentic-pipeline",
    track: "agentic",
    prompt: "Design an agentic execution pipeline with external tools.",
    fr: [
      { id: "plan", label: "Plan a multi-step task from a user goal" },
      { id: "tools", label: "Call external tools (search, code, HTTP)" },
      { id: "sandbox", label: "Execute untrusted code in isolation" },
      { id: "resume", label: "Resume a run after a worker crash" },
      { id: "audit", label: "Persist a replayable trace of tool I/O" },
    ],
    nfr: [
      { id: "durable", label: "Long-running runs survive process death" },
      { id: "idempotent", label: "Tool steps are idempotent on retry" },
      { id: "bound", label: "Loops have a max-step / token bound" },
      { id: "escape", label: "Sandbox has no production secrets" },
    ],
    envelope: {
      dau: 20_000,
      reqPerUser: 6,
      peakX: 3,
      payloadKb: 12,
      retentionDays: 90,
      tokensPerReq: 4000,
    },
    expectedKinds: [
      "api",
      "state-machine",
      "llm-gateway",
      "sandbox",
      "queue",
      "agent-memory",
      "token-limiter",
      "circuit-breaker",
    ],
    dive: [
      {
        id: "checkpoint",
        kind: "state-machine",
        question: "Where does control flow live so a kill -9 does not restart from zero?",
        rails: "AASM is a column, not durable exec. Temporal workflow + activities; side effects only in activities.",
        fastapi: "LangGraph compile(checkpointer=PostgresSaver). Same thread_id resumes. Bound cycles with max_steps.",
      },
      {
        id: "jail",
        kind: "sandbox",
        question: "How does tool-generated code run without sharing a kernel with the API?",
        rails: "A Sidekiq queue whose workers have no DATABASE_URL. Timeout + cgroup kill. Regex-deny is not a boundary.",
        fastapi: "asyncio subprocess or a Firecracker microVM. Isolated -I, no env secrets, result on a queue.",
      },
      {
        id: "route-tools",
        kind: "llm-gateway",
        question: "How do you route planner vs. cheap classifier vs. long generation?",
        rails: "Router PORO by task. Timeouts occupy Puma — run generations from a job.",
        fastapi: "LiteLLM router. Planner can be capable; per-tool classify is mini. Circuit-break on 429.",
      },
      {
        id: "llm-fail",
        kind: "circuit-breaker",
        question: "What is the fallback when the model 429s mid-graph?",
        rails: "semian around the client; open circuit serves last checkpoint + a 503 to the user. Do not busy-retry.",
        fastapi: "aiobreaker on acompletion. Resume from checkpointer when half-open probe succeeds.",
      },
    ],
    spof: [
      { id: "loop", label: "Unbounded tool loop", mitigation: "max_steps + token limiter" },
      { id: "timeout", label: "LLM hang on a Puma/Uvicorn worker", mitigation: "timeout + async job / workflow" },
      { id: "state", label: "In-memory graph state", mitigation: "Postgres/Redis checkpointer" },
      { id: "poison", label: "Poisoned tool output re-entering the prompt", mitigation: "schema-validate tool I/O; sandbox" },
    ],
  },
};

export function expectedQps(spec: EnvelopeSpec): number {
  return Math.round((spec.dau * spec.reqPerUser * spec.peakX) / 86400);
}

export function expectedStorageGb(spec: EnvelopeSpec): number {
  const perDay = spec.dau * spec.reqPerUser * spec.payloadKb * 1024;
  return Math.round((perDay * spec.retentionDays) / 1024 ** 3 * 10) / 10;
}

export function expectedMonthlyAiCost(spec: EnvelopeSpec, qps: number): number {
  const tok = spec.tokensPerReq ?? 0;
  if (!tok) return 0;
  return Math.round(((qps * tok * 86400 * 30) / 1_000_000) * 6);
}

export const LEVEL_BAR: Record<InterviewLevel, number> = {
  junior: 55,
  mid: 70,
  senior: 82,
  staff: 90,
  "ai-engineer": 84,
};

export const PROFILE_META: {
  id: InterviewLevel;
  title: string;
  family: "compute" | "speed" | "agentic";
  blurb: string;
}[] = [
  {
    id: "senior",
    title: "Senior",
    family: "compute",
    blurb: "Owns CAP, sharding, caching, and a hireable HLD. Deep-dives the hot path.",
  },
  {
    id: "staff",
    title: "Staff",
    family: "speed",
    blurb: "Names SPOFs, repair jobs, and the failure you did not draw. Bar is 90.",
  },
  {
    id: "ai-engineer",
    title: "AI Engineer",
    family: "agentic",
    blurb: "Context budgets, model routing, durable agent runs, LLM failure modes.",
  },
];

export function stepsFor(track: InterviewTrack) {
  return track === "agentic" ? AGENTIC_STEPS : BACKEND_STEPS;
}

export function scriptsForTrack(track: InterviewTrack): InterviewScript[] {
  return Object.values(INTERVIEWS).filter((s) => s.track === track);
}
