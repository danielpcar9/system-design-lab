# System Design Lab

Interactive hireable system-design studio: **Rails convention vs FastAPI explicitness**, now with agentic AI labs.

Draw the architecture, read the equivalent code, watch what the framework runs for you, then break it with load — including tokens/sec, LLM p99, and monthly AI spend.

UI is bilingual (**ES / EN**). Code, terminal commands, and architecture terms (Load Balancer, Circuit Breaker, Sharding, Vector DB, Rate Limiter) stay in English.

## What you can do

- **Canvas** — drop clients, gateways, FastAPI services, SQL / NoSQL / Graph, Redis, Kafka, plus vector DBs, LLM gateways, sandboxes, and LangGraph machines.
- **Under the hood** — Rack, callbacks, Pydantic, LiteLLM — and uv versus rv for the boot path.
- **Practice** — write a Rails or FastAPI answer against a per-scenario exercise. Visible + hidden source-inspection tests, persistent mastery, progressive hints. The browser never executes your snippet; `labs/phase2` is the real HTTP path.
- **Stress test** — RPS, mix, data, tokens/request, plus small/medium/large educational cost profiles. Simulated p99, diagnoses that can add the missing box.
- **Interview tracks** — Backend (CAP, sharding, cache, SPOF) and AI Engineer (context, routing, durable agent runs, LLM failure). Chromatic score cards at the end.
- **Cheat sheets** — consistent hashing, rate limiting, RAG, model routing, context windows.

## Labs

**Backend:** URL Shortener · Twitter Feed · WhatsApp · Uber  
**Agentic:** RAG Support Agent · Agentic Pipeline

## Phase 2 backend lab

The first real backend exercise lives in [`labs/phase2`](labs/phase2): one shared URL Shortener contract, FastAPI + Rails 8.1, PostgreSQL, Redis, Solid Queue, injectable faults, and an educational HTTP bench. Roadmap: [`ROADMAP.md`](ROADMAP.md).

## Stack

React 19 · TanStack Start · Tailwind v4 · Zustand · Recharts

## Run locally

```sh
npm install
npm run dev
```

Then open the printed local URL. `npm run typecheck` and `npm run build` are available.

Default language is Spanish. Switch to English with the **ES / EN** control in the header.
