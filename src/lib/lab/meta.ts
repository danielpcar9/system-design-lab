import type { ComponentKind, KindFamily, Lens } from "./types";

export type KindMeta = {
  kind: ComponentKind;
  title: string;
  family: KindFamily;
  railsLabel: string;
  fastapiLabel: string;
};

export const KIND_META: Record<ComponentKind, KindMeta> = {
  client: {
    kind: "client",
    title: "Client",
    family: "compute",
    railsLabel: "Hotwire / same-origin",
    fastapiLabel: "SPA + CORS",
  },
  cdn: {
    kind: "cdn",
    title: "CDN",
    family: "compute",
    railsLabel: "asset_host",
    fastapiLabel: "static origin",
  },
  "load-balancer": {
    kind: "load-balancer",
    title: "Load Balancer",
    family: "compute",
    railsLabel: "Puma cluster",
    fastapiLabel: "Uvicorn workers",
  },
  gateway: {
    kind: "gateway",
    title: "API Gateway",
    family: "compute",
    railsLabel: "Nginx + Rack",
    fastapiLabel: "Nginx + ASGI",
  },
  api: {
    kind: "api",
    title: "Microservice",
    family: "compute",
    railsLabel: "ActionController",
    fastapiLabel: "APIRouter",
  },
  auth: {
    kind: "auth",
    title: "Authentication",
    family: "compute",
    railsLabel: "Cookie session",
    fastapiLabel: "JWT / OAuth2",
  },
  authorization: {
    kind: "authorization",
    title: "Authorization",
    family: "compute",
    railsLabel: "Pundit",
    fastapiLabel: "Depends predicates",
  },
  database: {
    kind: "database",
    title: "SQL Database",
    family: "persist",
    railsLabel: "ActiveRecord",
    fastapiLabel: "SQLAlchemy",
  },
  nosql: {
    kind: "nosql",
    title: "NoSQL / KV",
    family: "persist",
    railsLabel: "Redis / Mongo",
    fastapiLabel: "redis-py / Motor",
  },
  graph: {
    kind: "graph",
    title: "Graph Database",
    family: "persist",
    railsLabel: "ActiveGraph",
    fastapiLabel: "neo4j driver",
  },
  replica: {
    kind: "replica",
    title: "Read Replica",
    family: "persist",
    railsLabel: "connected_to :reading",
    fastapiLabel: "bind replica engine",
  },
  cache: {
    kind: "cache",
    title: "Caching",
    family: "speed",
    railsLabel: "Rails.cache",
    fastapiLabel: "redis.asyncio",
  },
  jobs: {
    kind: "jobs",
    title: "Background Jobs",
    family: "speed",
    railsLabel: "ActiveJob / Sidekiq",
    fastapiLabel: "ARQ / Celery",
  },
  queue: {
    kind: "queue",
    title: "Message Queue",
    family: "speed",
    railsLabel: "Sidekiq / Karafka",
    fastapiLabel: "RabbitMQ / Kafka",
  },
  "rate-limit": {
    kind: "rate-limit",
    title: "Rate Limiting",
    family: "speed",
    railsLabel: "Rack::Attack",
    fastapiLabel: "SlowAPI",
  },
  files: {
    kind: "files",
    title: "Blob Storage",
    family: "persist",
    railsLabel: "ActiveStorage",
    fastapiLabel: "UploadFile + S3",
  },
  websocket: {
    kind: "websocket",
    title: "WebSockets",
    family: "compute",
    railsLabel: "ActionCable",
    fastapiLabel: "WebSocket loop",
  },
  search: {
    kind: "search",
    title: "Search",
    family: "compute",
    railsLabel: "pg_search",
    fastapiLabel: "OpenSearch client",
  },
  "circuit-breaker": {
    kind: "circuit-breaker",
    title: "Circuit Breaker",
    family: "compute",
    railsLabel: "semian / circuitbox",
    fastapiLabel: "aiobreaker",
  },
  "vector-db": {
    kind: "vector-db",
    title: "Vector Database",
    family: "agentic",
    railsLabel: "neighbor / pgvector",
    fastapiLabel: "Qdrant / Pinecone",
  },
  "agent-memory": {
    kind: "agent-memory",
    title: "Agent Memory",
    family: "agentic",
    railsLabel: "Solid Cache session",
    fastapiLabel: "Redis session store",
  },
  "llm-gateway": {
    kind: "llm-gateway",
    title: "LLM Gateway",
    family: "agentic",
    railsLabel: "ruby-openai router",
    fastapiLabel: "LiteLLM proxy",
  },
  sandbox: {
    kind: "sandbox",
    title: "Code Sandbox",
    family: "agentic",
    railsLabel: "Isolated job worker",
    fastapiLabel: "Restricted exec",
  },
  "token-limiter": {
    kind: "token-limiter",
    title: "Token Rate Limiter",
    family: "agentic",
    railsLabel: "Rack token bucket",
    fastapiLabel: "token bucket + LiteLLM",
  },
  "state-machine": {
    kind: "state-machine",
    title: "State Machine",
    family: "agentic",
    railsLabel: "Temporal / AASM",
    fastapiLabel: "LangGraph / Temporal",
  },
};

export const FAMILY_META: Record<KindFamily, { title: string; hint: string; swatch: string }> = {
  compute: { title: "Compute & Network", hint: "Load balancers, gateways, FastAPI services, CDN", swatch: "bg-cobalt" },
  speed: { title: "Cache & Rails speed", hint: "Redis, ActiveJob, ActiveRecord hot path", swatch: "bg-magenta" },
  persist: { title: "Persistence & State", hint: "SQL, NoSQL, storage, durable records", swatch: "bg-sun" },
  agentic: { title: "Agentic AI", hint: "Vector DBs, memory, LLM gateways, sandboxes", swatch: "bg-violet" },
};

export function stackCaption(kind: ComponentKind, lens: Lens): string {
  const meta = KIND_META[kind];
  if (lens === "rails") return meta.railsLabel;
  if (lens === "fastapi") return meta.fastapiLabel;
  return `${meta.railsLabel} · ${meta.fastapiLabel}`;
}
