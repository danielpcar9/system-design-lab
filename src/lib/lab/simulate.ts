import type {
  ComponentKind,
  Decisions,
  Diagnosis,
  LabEdge,
  LabNode,
  LoadInputs,
  SimResult,
} from "./types";

const AGENTIC_KINDS: ComponentKind[] = [
  "vector-db",
  "agent-memory",
  "llm-gateway",
  "sandbox",
  "token-limiter",
  "state-machine",
];

const AGENTIC_SCENARIOS = new Set(["rag-support", "agentic-pipeline"]);

function has(nodes: LabNode[], kind: ComponentKind): boolean {
  return nodes.some((n) => n.kind === kind);
}

function asyncWrites(edges: LabEdge[]): boolean {
  return edges.some((e) => e.sync === "async" && e.flow !== "read");
}

export function simulate(args: {
  scenarioId: string;
  nodes: LabNode[];
  edges: LabEdge[];
  decisions: Decisions;
  load: LoadInputs;
}): SimResult {
  const { scenarioId, nodes, edges, decisions, load } = args;
  const cache = has(nodes, "cache");
  const replicas = has(nodes, "replica") || decisions.scale === "horizontal";
  const queue = has(nodes, "queue") || has(nodes, "jobs") || asyncWrites(edges);
  const rate = has(nodes, "rate-limit");
  const cdn = has(nodes, "cdn");
  const breaker = has(nodes, "circuit-breaker");
  const ws = has(nodes, "websocket");
  const nosql = has(nodes, "nosql");
  const graph = has(nodes, "graph");
  const blobs = has(nodes, "files");
  const vector = has(nodes, "vector-db");
  const memory = has(nodes, "agent-memory");
  const gateway = has(nodes, "llm-gateway");
  const sandbox = has(nodes, "sandbox");
  const tokenLimit = has(nodes, "token-limiter");
  const machine = has(nodes, "state-machine");
  const agentic =
    AGENTIC_SCENARIOS.has(scenarioId) || nodes.some((n) => AGENTIC_KINDS.includes(n.kind));
  const writes = 1 - load.readRatio;
  const tokPerReq = load.tokPerReq || 1200;

  let capacity = 500;
  if (decisions.scale === "horizontal") capacity *= 4;
  else capacity *= 1.15;
  if (cache) capacity += 1800 * load.readRatio;
  if (replicas) capacity += 900 * load.readRatio;
  if (queue) capacity += 1400 * writes;
  if (cdn) capacity += 400 * load.readRatio;
  if (graph) capacity += 250 * load.readRatio;
  if (blobs) capacity += 80;
  if (vector) capacity += 120 * load.readRatio;
  if (gateway) capacity += 80;
  if (tokenLimit) capacity *= 0.96;
  if (decisions.orm === "data-mapper") capacity *= 1.12;
  if (decisions.orm === "active-record" && !cache) capacity *= 0.78;
  if (rate) capacity *= 0.97;

  const utilization = load.rps / Math.max(capacity, 1);
  const saturated = Math.max(0, utilization - 0.75);

  let p50 = 18;
  if (cdn) p50 -= 4;
  if (cache && load.readRatio > 0.5) p50 -= 6;
  if (decisions.cache === "back" && writes > 0.2) p50 -= 3;
  if (decisions.cache === "through") p50 += 4;
  if (decisions.orm === "active-record") p50 += 6;
  if (vector) p50 += 12;
  if (gateway) p50 += 8;
  p50 += saturated * 90;
  p50 += load.dataGb > 400 ? 8 : 0;
  p50 = Math.max(4, p50);

  let p99 = p50 * 2.4 + saturated * 420;
  if (!cache && load.readRatio > 0.7) p99 += load.rps / 40;
  if (!queue && writes > 0.35 && load.rps > 1200) p99 += 160;
  if (decisions.scale === "vertical" && load.rps > 2500) p99 += 120;
  if (decisions.cap === "cp" && utilization > 0.9) p99 += 80;
  if (agentic && !tokenLimit && load.rps > 900) p99 += 90;

  let availability = 99.95;
  if (decisions.cap === "cp") availability -= utilization > 0.85 ? 0.45 : 0.08;
  if (decisions.cap === "ap") availability -= 0.02;
  if (!queue && writes > 0.4 && load.rps > 1500) availability -= 0.35;
  if (!replicas && load.readRatio > 0.75 && load.rps > 2000) availability -= 0.25;
  if (breaker) availability += 0.08;
  if (rate && load.rps > capacity) availability += 0.12;
  if (machine) availability += 0.06;
  if (agentic && !breaker && load.rps > 1500) availability -= 0.18;
  availability = Math.min(99.99, Math.max(96.4, availability));

  let cost = 90 + load.rps * 0.035 + load.dataGb * 0.55;
  if (cache) cost += 70;
  if (replicas) cost += 180;
  if (queue) cost += 60;
  if (cdn) cost += 35 + load.rps * 0.008;
  if (nosql) cost += 110;
  if (graph) cost += 140;
  if (blobs) cost += 45 + load.dataGb * 0.08;
  if (vector) cost += 160;
  if (gateway) cost += 90;
  if (sandbox) cost += 70;
  if (machine) cost += 50;
  if (decisions.scale === "horizontal") cost *= 1.55;
  if (ws) cost += 40 + load.rps * 0.012;

  let llmP99 = agentic ? 640 : 0;
  if (agentic) {
    if (vector) llmP99 += 90;
    if (gateway) llmP99 -= 140;
    if (cache) llmP99 -= 80;
    if (memory) llmP99 -= 30;
    if (sandbox) llmP99 += 120;
    if (machine) llmP99 += 40;
    if (!tokenLimit && load.rps > 800) llmP99 += 220;
    if (saturated > 0) llmP99 += saturated * 380;
    llmP99 = Math.max(180, llmP99);
  }

  const routed = gateway ? 0.55 : 1;
  const cachedTok = cache ? 0.72 : 1;
  const limited = tokenLimit ? 0.85 : 1.35;
  const rawTokensPerSec = load.rps * tokPerReq;
  const tokensPerSec = Math.round((rawTokensPerSec * (tokenLimit ? 0.82 : 1)) / 1000) * 1000;
  const usdPerMillion = 6 * routed;
  const secondsPerMonth = 86400 * 30;
  const aiCost = agentic
    ? Math.round(
        ((rawTokensPerSec * cachedTok * limited * secondsPerMonth) / 1_000_000) * usdPerMillion,
      )
    : 0;

  const diagnoses: Diagnosis[] = [];

  if (!cache && load.readRatio >= 0.65 && load.rps > 700) {
    diagnoses.push({
      id: "no-cache",
      title: "Primary store is serving the read path",
      body: "SQL collapsed under repeated reads. Add a Redis cache (cache-aside for the hot key) or the p99 will keep climbing with RPS.",
      fixKind: "cache",
    });
  }
  if (!replicas && load.readRatio >= 0.7 && load.rps > 1800) {
    diagnoses.push({
      id: "no-replica",
      title: "Single primary for a read-heavy mix",
      body: "Reads and writes share one writer. Add read replicas, or switch the CAP lever toward AP and accept stale reads from replicas.",
      fixKind: "replica",
    });
  }
  if (!queue && writes >= 0.3 && load.rps > 900) {
    diagnoses.push({
      id: "sync-writes",
      title: "Synchronous writes on the request path",
      body: "Fan-out, matching, or analytics is still in-line. Put it on a queue (Sidekiq / ARQ+Redis or Kafka) and mark the edge async.",
      fixKind: "queue",
    });
  }
  if (!rate && load.rps > 2500) {
    diagnoses.push({
      id: "no-throttle",
      title: "No admission control",
      body: "Without rate limiting, overload becomes 500s instead of 429s. Rack::Attack or SlowAPI in front of the origin protects capacity.",
      fixKind: "rate-limit",
    });
  }
  if (decisions.scale === "vertical" && load.rps > 3000) {
    diagnoses.push({
      id: "vertical-ceiling",
      title: "Vertical scale hit the box size",
      body: "One bigger Puma/Uvicorn host will not buy another order of magnitude. Flip the matrix to horizontal and add a load balancer.",
    });
  }
  if (decisions.orm === "active-record" && !cache && load.rps > 1200) {
    diagnoses.push({
      id: "n-plus-one",
      title: "ActiveRecord N+1 under contention",
      body: "Identity-map convenience turns into query storms when includes() is forgotten. Data Mapper (SQLAlchemy) makes the statement visible — or add a cache so the ORM is not on the hot path.",
    });
  }
  if (decisions.cache === "back" && writes > 0.25 && cache) {
    diagnoses.push({
      id: "write-back-durability",
      title: "Write-back cache can lie",
      body: "Writes ack against Redis before SQL. Fast p50, weak durability. Fine for counters; dangerous for payments. Prefer cache-aside or write-through for source-of-truth rows.",
    });
  }
  if (decisions.cap === "cp" && utilization > 1) {
    diagnoses.push({
      id: "cp-unavailable",
      title: "CP chose consistency over serving",
      body: "Under partition or overload a CP system refuses writes. That is correct for ledgers and wrong for a chat presence map. Flip to AP or add capacity.",
    });
  }
  if (scenarioId === "realtime-chat" && !ws) {
    diagnoses.push({
      id: "no-socket",
      title: "WhatsApp without a socket layer",
      body: "Polling the API for messages will not hold 80k concurrent clients. Add WebSockets (ActionCable / FastAPI WS) and a broker, not another REST poller.",
      fixKind: "websocket",
    });
  }
  if (scenarioId === "social-feed" && !has(nodes, "jobs") && !has(nodes, "queue")) {
    diagnoses.push({
      id: "inline-fanout",
      title: "Fan-out on the POST /posts request",
      body: "Writing into every follower timeline inline is the classic Twitter trap. Enqueue fan-out (Sidekiq / ARQ) and keep the HTTP request to persist-only.",
      fixKind: "jobs",
    });
  }
  if (scenarioId === "uber" && !queue) {
    diagnoses.push({
      id: "sync-match",
      title: "Dispatch is still request-scoped",
      body: "Matching riders to drivers is a search over a geospatial index, not a SQL join in the checkout POST. Queue it and store live location in the NoSQL/Redis node.",
      fixKind: "queue",
    });
  }
  if (scenarioId === "uber" && !nosql && !cache) {
    diagnoses.push({
      id: "location-in-sql",
      title: "Live location in the primary SQL store",
      body: "Driver pings at 1Hz will wreck WAL. Keep trip records in SQL; put the last location in Redis/NoSQL.",
      fixKind: "nosql",
    });
  }
  if (scenarioId === "social-feed" && !graph && load.rps > 3500) {
    diagnoses.push({
      id: "follow-in-sql",
      title: "Follow graph is still a join",
      body: "Friend-of-friend and celebrity neighborhoods are hops, not rows. Add a graph store (or a denormalized adjacency cache) before the SQL join becomes the p99.",
      fixKind: "graph",
    });
  }
  if (scenarioId === "realtime-chat" && !blobs && load.dataGb > 250) {
    diagnoses.push({
      id: "media-in-sql",
      title: "Media is sitting in the message table",
      body: "Voice notes and images blow up the chat WAL. Put blobs in object storage; the message row holds a key. ActiveStorage or UploadFile + S3.",
      fixKind: "files",
    });
  }
  if (!breaker && utilization > 1.1) {
    diagnoses.push({
      id: "no-breaker",
      title: "Downstream is being retry-stormed",
      body: "When p99 blows up, clients retry and finish the remaining capacity. A circuit breaker sheds load until the dependency recovers.",
      fixKind: "circuit-breaker",
    });
  }
  if ((scenarioId === "rag-support" || agentic) && !vector && AGENTIC_SCENARIOS.has(scenarioId)) {
    diagnoses.push({
      id: "no-vector",
      title: "Generation without retrieval",
      body: "The model is answering from weights. Add a vector database (Qdrant / pgvector) and retrieve before generate, or citations are fiction.",
      fixKind: "vector-db",
    });
  }
  if (scenarioId === "rag-support" && !memory) {
    diagnoses.push({
      id: "no-memory",
      title: "The agent is stateless between turns",
      body: "Each ticket turn re-sends the whole thread or forgets it. An agent memory / session store with a sliding window keeps context off the prompt dump.",
      fixKind: "agent-memory",
    });
  }
  if (agentic && !gateway) {
    diagnoses.push({
      id: "no-llm-gw",
      title: "Every service speaks to the model vendor",
      body: "Keys, retries, and spend are scattered. Put LiteLLM (or a ruby-openai router) in front and route classify to a cheap model.",
      fixKind: "llm-gateway",
    });
  }
  if (agentic && !tokenLimit && load.rps > 400) {
    diagnoses.push({
      id: "no-token-cap",
      title: "Token spend is uncapped",
      body: "RPS limiters do not stop a verbose agent. A token rate limiter fail-closed on Redis is the invoice fuse.",
      fixKind: "token-limiter",
    });
  }
  if (scenarioId === "agentic-pipeline" && !sandbox) {
    diagnoses.push({
      id: "no-sandbox",
      title: "Tools run inside the API worker",
      body: "External tool execution belongs in a sandbox with no secrets and a kill timeout. A jailbroken prompt is otherwise production access.",
      fixKind: "sandbox",
    });
  }
  if (scenarioId === "agentic-pipeline" && !machine) {
    diagnoses.push({
      id: "no-graph",
      title: "Long-running work has no checkpoint",
      body: "Kill -9 mid-tool and the run restarts from zero — or double-charges a tool. LangGraph / Temporal with a checkpointer is the senior answer.",
      fixKind: "state-machine",
    });
  }
  if (agentic && !breaker && load.rps > 600) {
    diagnoses.push({
      id: "llm-retry-storm",
      title: "LLM timeouts are being retried blindly",
      body: "Provider 429s plus client retries finish the remaining token budget. Break the circuit and serve a degraded cached answer.",
      fixKind: "circuit-breaker",
    });
  }

  const collapsed = utilization > 1.05 || p99 > 750 || availability < 98.8 || (agentic && llmP99 > 1800);
  const bottleneck = !cache && load.readRatio > 0.65
    ? "Primary database (read path)"
    : agentic && !tokenLimit && load.rps > 600
      ? "Uncapped token spend / LLM queue"
      : agentic && !gateway
        ? "Direct model vendor (no router)"
        : !queue && writes > 0.35
          ? "Synchronous write path"
          : decisions.scale === "vertical" && utilization > 0.9
            ? "Single vertically scaled host"
            : utilization > 1
              ? "API workers at saturation"
              : cache && decisions.cache === "back"
                ? "Cache durability / consistency"
                : "None — headroom remaining";

  const series = Array.from({ length: 24 }, (_, i) => {
    const wave = Math.sin(i / 3) * (8 + saturated * 40);
    const spike = i > 16 && collapsed ? (i - 16) * 28 : 0;
    const llm = agentic && i > 10 ? Math.round(llmP99 / 40) : 0;
    return { t: i, ms: Math.max(4, Math.round(p50 + wave + spike + llm)) };
  });

  return {
    p50: Math.round(p50),
    p99: Math.round(p99),
    cost: Math.round(cost + aiCost),
    availability: Math.round(availability * 100) / 100,
    capacity: Math.round(capacity),
    utilization: Math.round(utilization * 100) / 100,
    collapsed,
    bottleneck,
    diagnoses: diagnoses.slice(0, 4),
    series,
    tokensPerSec: agentic ? Math.max(0, tokensPerSec) : 0,
    llmP99: agentic ? Math.round(llmP99) : 0,
    aiCost: agentic ? Math.round(aiCost) : 0,
    agentic,
  };
}
