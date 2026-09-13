import type { DualStackLesson } from "./types";

export const LESSONS_AGENTIC: DualStackLesson[] = [
  {
    kind: "vector-db",
    title: "Vector Database",
    summary:
      "Embeddings live next to, not inside, the source of truth. Rails usually stores vectors in Postgres via neighbor/pgvector. FastAPI talks to Qdrant or Pinecone as a dedicated ANN service — retrieve, then generate.",
    rails: {
      label: "neighbor · pgvector",
      philosophy: "The index is a column",
      snippets: [
        {
          filename: "app/models/policy_chunk.rb",
          language: "ruby",
          code: `class PolicyChunk < ApplicationRecord
  has_neighbors :embedding

  def self.retrieve(query, k: 6)
    vector = Embedder.encode(query)
    nearest_neighbors(:embedding, vector, distance: "cosine")
      .limit(k)
  end
end`,
        },
      ],
      hood: [
        {
          layer: "pgvector index",
          what: "CREATE INDEX USING hnsw (embedding vector_cosine_ops). The planner, not Ruby, does the ANN.",
          automatic: true,
        },
        {
          layer: "neighbor gem",
          what: "has_neighbors adds nearest_neighbors. You still call the embedder yourself — Rails will not vectorize a string.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "Qdrant / Pinecone",
      philosophy: "A service you query",
      snippets: [
        {
          filename: "retrieve.py",
          language: "python",
          code: `async def retrieve(qdrant: QdrantClient, query: str, k: int = 6):
    vector = await embed(query)
    hits = await qdrant.search(
        collection_name="policy",
        query_vector=vector,
        limit=k,
        with_payload=True,
    )
    return [h.payload for h in hits]`,
        },
      ],
      hood: [
        {
          layer: "Separate ANN cluster",
          what: "Qdrant/Pinecone own HNSW. SQL never sees the vector. Dual-write + a repair job keep them honest.",
          automatic: false,
        },
        {
          layer: "Payload vs embedding",
          what: "The hit carries chunk text and a source_id. The LLM never searches SQL for the passage.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails: "One extra column and a gem. Fine until the corpus outgrows the primary.",
        fastapi: "A second service on day one. Correct for RAG at ticket volume.",
        winner: "rails",
      },
      control: {
        rails: "ANN and OLTP share a box. A rebuild can stall checkouts.",
        fastapi: "Qdrant dying does not take billing with it. You operate two things.",
        winner: "fastapi",
      },
      refactor: {
        rails: "Extracting pgvector into Qdrant is a data move the models will fight.",
        fastapi: "The retrieve() function is already the seam.",
        winner: "fastapi",
      },
      runtime: {
        rails: "HNSW in Postgres is fast at tens of millions, not billions.",
        fastapi: "Dedicated ANN scales independently of the WAL.",
        winner: "fastapi",
      },
      verdict:
        "Draw a vector store when generation must be grounded. Rails will keep it in SQL until it hurts. FastAPI will assume Qdrant. Interviewers want the chunking and the citation, not the logo.",
    },
  },
  {
    kind: "agent-memory",
    title: "Agent Memory",
    summary:
      "Working memory for a session is not the ticket row. Rails parks it in Solid Cache / Redis with a TTL. FastAPI uses a Redis hash keyed by thread_id — LangGraph checkpoints go here, not in the LLM context window.",
    rails: {
      label: "Solid Cache · session store",
      philosophy: "TTL is the schema",
      snippets: [
        {
          filename: "app/models/agent_thread.rb",
          language: "ruby",
          code: `class AgentThread
  def self.append(thread_id, turn)
    key = "agent:#{thread_id}"
    Rails.cache.write(
      key,
      (Rails.cache.read(key) || []).last(12) + [turn],
      expires_in: 2.hours,
    )
  end
end`,
        },
      ],
      hood: [
        {
          layer: "Window, not archive",
          what: "Keep the last N turns. The ticket transcript lives in SQL. Memory is the sliding window you send to the model.",
          automatic: true,
        },
        {
          layer: "No cookie session",
          what: "Do not stuff the conversation into cookie_store. Size and PII will bite you.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "Redis session store",
      philosophy: "A thread_id you pass",
      snippets: [
        {
          filename: "memory.py",
          language: "python",
          code: `async def append(redis: Redis, thread_id: str, turn: dict) -> None:
    key = f"agent:{thread_id}"
    await redis.rpush(key, json.dumps(turn))
    await redis.ltrim(key, -12, -1)
    await redis.expire(key, 60 * 60 * 2)`,
        },
      ],
      hood: [
        {
          layer: "Checkpoint vs transcript",
          what: "LangGraph checkpoints (channel values) go to Redis/Postgres. The user-visible log is a different table.",
          automatic: false,
        },
        {
          layer: "PII redaction",
          what: "Redact before RPUSH. The model window should never contain a card number you already stripped at the gateway.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails: "Rails.cache.write is one line. Easy to confuse with the ticket body.",
        fastapi: "You name the key and the trim. Slower, honest.",
        winner: "rails",
      },
      control: {
        rails: "Cache store config decides Redis vs memory. MemoryStore in prod is a silent fail.",
        fastapi: "The Redis client is in the signature.",
        winner: "fastapi",
      },
      refactor: {
        rails: "Moving window size is a constant. Moving to SQL for audit is a second write.",
        fastapi: "Same two writes, already separated.",
        winner: "tie",
      },
      runtime: {
        rails: "Redis lists are fine. Do not replay 200 turns into the prompt.",
        fastapi: "ltrim is the context budget. Summarize older turns on a job.",
        winner: "tie",
      },
      verdict:
        "Agent memory is a sliding window with a TTL, not a second brain. Rails hides it behind cache. FastAPI makes the list ops visible. Both fail if you concatenate the whole thread into the prompt.",
    },
  },
  {
    kind: "llm-gateway",
    title: "LLM Gateway",
    summary:
      "Never let every service speak to OpenAI directly. A gateway (LiteLLM, a thin ruby-openai router) owns keys, model routing, retries, and spend. Cheap models for classify; capable ones for generate.",
    rails: {
      label: "ruby-openai router",
      philosophy: "One client, many models",
      snippets: [
        {
          filename: "app/services/llm_router.rb",
          language: "ruby",
          code: `class LlmRouter
  def complete(task:, messages:)
    model = task == :classify ? "gpt-4o-mini" : "gpt-4o"
    OPENAI.chat(parameters: {
      model:, messages:, timeout: 20,
    })
  rescue Faraday::TimeoutError
    fallback.complete(task:, messages:)
  end
end`,
        },
      ],
      hood: [
        {
          layer: "Single API key",
          what: "The gateway process holds the secret. App servers get an internal token. Rotation is one place.",
          automatic: true,
        },
        {
          layer: "Timeout + fallback",
          what: "A hung completion occupies a Puma thread. Timeout, then a smaller model or a cached answer.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "LiteLLM proxy",
      philosophy: "One OpenAI-compatible origin",
      snippets: [
        {
          filename: "llm.py",
          language: "python",
          code: `router = Router(model_list=[
    {"model_name": "cheap", "litellm_params": {"model": "gpt-4o-mini"}},
    {"model_name": "capable", "litellm_params": {"model": "gpt-4o"}},
])

async def complete(task: str, messages: list[dict]) -> str:
    name = "cheap" if task == "classify" else "capable"
    r = await router.acompletion(model=name, messages=messages, timeout=20)
    return r.choices[0].message.content`,
        },
      ],
      hood: [
        {
          layer: "LiteLLM",
          what: "Providers look like OpenAI. Routing, fallbacks, and spend live in the proxy, not in every router.",
          automatic: false,
        },
        {
          layer: "No SDK sprawl",
          what: "Services call one base_url. Adding Claude is a config row, not a new gem in twelve repos.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails: "A PORO and the openai gem. Fine for one app.",
        fastapi: "LiteLLM is a deployable. Heavier, and it is the hireable answer.",
        winner: "rails",
      },
      control: {
        rails: "Every Rails app with its own key is how bills surprise you.",
        fastapi: "The proxy is the budget. Model lists are reviewed like infra.",
        winner: "fastapi",
      },
      refactor: {
        rails: "Extracting the PORO into a sidecar is a new service you postponed.",
        fastapi: "You started with the sidecar.",
        winner: "fastapi",
      },
      runtime: {
        rails: "A timeout in the request path still burns a thread.",
        fastapi: "Async completions overlap. Still put a timeout on the await.",
        winner: "fastapi",
      },
      verdict:
        "An LLM gateway is an API gateway for tokens. Rails can fake it with a service object. FastAPI + LiteLLM is what you draw when cost, routing, and keys matter. Interviewers want the fallback model.",
    },
  },
  {
    kind: "sandbox",
    title: "Code Sandbox",
    summary:
      "Agents that write or run code must not share a kernel with the API. Rails isolates via a job worker with no credentials. FastAPI uses a restricted subprocess or a throwaway container. Network and filesystem are the attack surface.",
    rails: {
      label: "Isolated ActiveJob",
      philosophy: "A worker with no secrets",
      snippets: [
        {
          filename: "app/jobs/run_tool_job.rb",
          language: "ruby",
          code: `class RunToolJob < ApplicationJob
  queue_as :sandbox
  def perform(run_id, code)
    raise "network disabled" if code.match?(/Net::|Socket|open\\(/)
    result = IsolatedEval.call(code, timeout: 3)
    AgentRun.find(run_id).update!(result:)
  end
end`,
        },
      ],
      hood: [
        {
          layer: "Separate queue",
          what: "sandbox workers have no DATABASE_URL beyond a write-back token. A jailbreak cannot dump the primary.",
          automatic: true,
        },
        {
          layer: "Timeout is a kill",
          what: "Timeout.timeout plus a process-level cgroup. A tight Ruby loop will not yield.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "Restricted exec",
      philosophy: "A child you can kill",
      snippets: [
        {
          filename: "sandbox.py",
          language: "python",
          code: `async def run_code(code: str, timeout: float = 3.0) -> str:
    proc = await asyncio.create_subprocess_exec(
        "python", "-I", "-c", code,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        limit=1 << 16,
    )
    try:
        out, err = await asyncio.wait_for(proc.communicate(), timeout)
    except TimeoutError:
        proc.kill()
        raise
    return out.decode()[:4000]`,
        },
      ],
      hood: [
        {
          layer: "-I isolated",
          what: "No user site, no ambient imports. Better: a gVisor/Firecracker microVM. RestrictedPython is not a security boundary.",
          automatic: false,
        },
        {
          layer: "No credentials in env",
          what: "The sandbox image does not get the LLM key. Results go back on a queue, not via the parent heap.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails: "A job class looks like any other. Easy to forget it is hostile input.",
        fastapi: "You see the subprocess. Harder to pretend eval is fine.",
        winner: "fastapi",
      },
      control: {
        rails: "$SAFE is gone. Isolation is ops (cgroup, seccomp), not a gem.",
        fastapi: "Same ops story. The child process is the review surface.",
        winner: "tie",
      },
      refactor: {
        rails: "Moving from eval to a container is a worker image change.",
        fastapi: "Same image change. Start with the container.",
        winner: "fastapi",
      },
      runtime: {
        rails: "A stuck sandbox job is one Sidekiq thread. Cap concurrency.",
        fastapi: "asyncio.wait_for plus kill. Still cap concurrent children.",
        winner: "tie",
      },
      verdict:
        "If the agent can run code, the sandbox is a security boundary, not a feature. Draw it. Rails will hide it as a job. FastAPI will show the subprocess. Interviewers want the kill switch and the missing secrets.",
    },
  },
  {
    kind: "token-limiter",
    title: "Token Rate Limiter",
    summary:
      "RPS limiters stop HTTP floods. Token limiters stop invoice floods. Rails counts tokens in Redis per tenant. FastAPI + LiteLLM budgets at the gateway. Both must fail closed when Redis is down.",
    rails: {
      label: "Rack token bucket",
      philosophy: "Admit by tokens, not requests",
      snippets: [
        {
          filename: "app/middleware/token_budget.rb",
          language: "ruby",
          code: `class TokenBudget
  def allow?(tenant_id, tokens)
    key = "tok:#{tenant_id}:#{Time.now.to_i / 60}"
    used = Rails.cache.increment(key, tokens, expires_in: 70)
    used <= tenant_cap(tenant_id)
  end
end`,
        },
      ],
      hood: [
        {
          layer: "Not Rack::Attack",
          what: "Attack keys on IP and route. Token budget keys on tenant and estimated prompt+completion tokens.",
          automatic: true,
        },
        {
          layer: "Fail closed",
          what: "If Redis is gone, reject the completion. Fail-open is how a weekend costs five figures.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "LiteLLM budget",
      philosophy: "Spend is a quota",
      snippets: [
        {
          filename: "budget.py",
          language: "python",
          code: `async def admit(redis: Redis, tenant: str, tokens: int) -> None:
    key = f"tok:{tenant}:{int(time.time()) // 60}"
    used = await redis.incrby(key, tokens)
    await redis.expire(key, 70)
    if used > TENANT_CAP[tenant]:
        raise HTTPException(429, "token budget exceeded")`,
        },
      ],
      hood: [
        {
          layer: "Estimate then settle",
          what: "Reserve max_tokens up front, refund the unused on stream end. Otherwise a slow client hogs the cap.",
          automatic: false,
        },
        {
          layer: "Gateway enforcement",
          what: "LiteLLM max_budget / rpm is the backstop. App-level incrby is the product policy.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails: "increment on cache. You will key it wrong once.",
        fastapi: "incrby in the dependency. Same bug, more visible.",
        winner: "tie",
      },
      control: {
        rails: "Fail-open is the default instinct with cache.fetch.",
        fastapi: "Raising 429 is a line you write. Keep it.",
        winner: "fastapi",
      },
      refactor: {
        rails: "Per-model caps mean more keys.",
        fastapi: "LiteLLM already has model rpm. Use it.",
        winner: "fastapi",
      },
      runtime: {
        rails: "The limiter is O(1) Redis. The cost is the tokens you did not reject.",
        fastapi: "Same. Stream refunds need a finally.",
        winner: "tie",
      },
      verdict:
        "Token rate limiters are how you sleep. Rails can count on Redis. FastAPI should enforce at LiteLLM and in the app. Interviewers want fail-closed and a per-tenant cap.",
    },
  },
  {
    kind: "state-machine",
    title: "State Machine",
    summary:
      "Long-running agents crash. LangGraph checkpoints and Temporal workflows are how you resume. Rails can model this with AASM plus a job, but durable execution is the senior answer.",
    rails: {
      label: "Temporal · AASM",
      philosophy: "The run is a row plus a workflow",
      snippets: [
        {
          filename: "app/models/agent_run.rb",
          language: "ruby",
          code: `class AgentRun < ApplicationRecord
  include AASM
  aasm do
    state :planned, initial: true
    state :tooling, :waiting, :done, :failed
    event :start_tool do
      transitions from: :planned, to: :tooling
    end
  end
end`,
        },
        {
          filename: "app/workflows/agent_workflow.rb",
          language: "ruby",
          code: `class AgentWorkflow < Temporal::Workflow
  def execute(run_id)
    plan = PlanActivity.execute!(run_id)
    plan["steps"].each do |step|
      ToolActivity.execute!(run_id, step)
    end
  end
end`,
        },
      ],
      hood: [
        {
          layer: "AASM is not durable exec",
          what: "AASM is a column. If the worker dies mid-tool, you need a workflow engine or you restart from scratch.",
          automatic: true,
        },
        {
          layer: "Temporal history",
          what: "Each activity is replay-safe. Side effects live in activities, not in the workflow method.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "LangGraph / Temporal",
      philosophy: "Checkpoint every hop",
      snippets: [
        {
          filename: "graph.py",
          language: "python",
          code: `builder = StateGraph(AgentState)
builder.add_node("plan", plan_node)
builder.add_node("tool", tool_node)
builder.add_edge("plan", "tool")
builder.add_conditional_edges("tool", should_continue)
graph = builder.compile(
    checkpointer=PostgresSaver.from_conn_string(DSN),
)`,
        },
      ],
      hood: [
        {
          layer: "Checkpointer",
          what: "PostgresSaver writes channel state after each node. Kill -9 and invoke with the same thread_id to resume.",
          automatic: false,
        },
        {
          layer: "Cycles are the product",
          what: "Conditional edges are how you bound loops (max_steps). Unbounded tool loops are a cost incident.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails: "AASM ships today. Temporal is a cluster you will postpone.",
        fastapi: "LangGraph is a library. Temporal is still a cluster. Start with checkpoints.",
        winner: "fastapi",
      },
      control: {
        rails: "Job + enum is easy to get wrong on retries (double tool call).",
        fastapi: "Idempotent nodes + a checkpointer make double-apply visible.",
        winner: "fastapi",
      },
      refactor: {
        rails: "Replacing AASM with Temporal is a rewrite of control flow.",
        fastapi: "The graph is already the control flow.",
        winner: "fastapi",
      },
      runtime: {
        rails: "Sidekiq retries are not replay. Duplicate charges happen here.",
        fastapi: "Checkpoints cost a write per hop. Worth it past one tool call.",
        winner: "fastapi",
      },
      verdict:
        "State machines are how agentic work survives a crash. Rails will show you an enum. FastAPI will show you LangGraph. Staff answers name the checkpointer and the loop bound.",
    },
  },
];
