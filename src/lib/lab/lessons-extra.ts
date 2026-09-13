import type { DualStackLesson } from "./types";

export const LESSONS_EXTRA: DualStackLesson[] = [
  {
    kind: "gateway",
    title: "API Gateway",
    summary:
      "The edge in front of many services: TLS, routing, auth nibble, rate limit. Rails often is the app behind Nginx. FastAPI is the same, plus you might terminate JWT at the gateway before Uvicorn ever runs.",
    rails: {
      label: "Nginx · Rack",
      philosophy: "The app is still one origin",
      snippets: [
        {
          filename: "config/puma.rb",
          language: "ruby",
          code: `# Nginx terminates TLS and proxies /api to Puma.
# Path-based routing to a second Rails app is another upstream.
workers ENV.fetch("WEB_CONCURRENCY", 2).to_i
threads 3, 5`,
        },
      ],
      hood: [
        {
          layer: "Nginx / Envoy",
          what: "Not Ruby. Health checks, retries, and header sanitizing happen before Rack sees the env.",
          automatic: true,
        },
        {
          layer: "One monolith origin",
          what: "Convention keeps you from needing a gateway until you split services. That is a feature until it is not.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "Nginx · ASGI",
      philosophy: "Services are already split",
      snippets: [
        {
          filename: "gateway.py",
          language: "python",
          code: `@app.middleware("http")
async def strip_internal(request: Request, call_next):
    response = await call_next(request)
    response.headers.pop("X-Internal-Token", None)
    return response`,
        },
      ],
      hood: [
        {
          layer: "ASGI middleware",
          what: "You can put auth, tracing, and 429s here. A real gateway (Kong, Envoy) is still better at TLS and retries.",
          automatic: false,
        },
        {
          layer: "Many uvicorn targets",
          what: "FastAPI services multiply. The gateway is how a mobile client still sees one host.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails: "Skip the gateway until you have two deployables.",
        fastapi: "You draw the gateway on day one because the SPA already talks to an API origin.",
        winner: "rails",
      },
      control: {
        rails: "Nginx config is ops, not the Rails repo, unless you own the chart.",
        fastapi: "Middleware is code. Policy as code is easier to review — and easier to get wrong.",
        winner: "fastapi",
      },
      refactor: {
        rails: "Extracting a service later means introducing the gateway you skipped.",
        fastapi: "The gateway was there; adding a service is another route.",
        winner: "fastapi",
      },
      runtime: {
        rails: "One less hop.",
        fastapi: "One more hop, cheaper retries, better shed.",
        winner: "tie",
      },
      verdict:
        "A gateway is not a framework feature. Rails lets you postpone it. FastAPI assumes you already have an edge. Draw it when you have more than one origin or when TLS and 429s should not live in the app process.",
    },
  },
  {
    kind: "queue",
    title: "Message Queue",
    summary:
      "The buffer between 'accepted' and 'done'. Rails usually means Redis lists via Sidekiq. FastAPI means Redis, RabbitMQ, or Kafka — you pick a broker and a consumer process.",
    rails: {
      label: "Redis · Sidekiq / Karafka",
      philosophy: "The adapter is the queue",
      snippets: [
        {
          filename: "app/jobs/match_driver_job.rb",
          language: "ruby",
          code: `class MatchDriverJob < ApplicationJob
  queue_as :dispatch
  def perform(trip_id)
    trip = Trip.find(trip_id)
    DriverMatcher.new(trip).run!
  end
end`,
        },
      ],
      hood: [
        {
          layer: "Redis list / Kafka gem",
          what: "Sidekiq RPOPBRPOP a queue key. Kafka (Karafka) is opt-in when you outgrow at-least-once jobs.",
          automatic: true,
        },
        {
          layer: "ActiveJob adapter",
          what: "perform_later hides the broker. Switching Redis to Kafka is an adapter plus a rewrite of semantics (ordering, replay).",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "Redis / Kafka consumer",
      philosophy: "A process you run",
      snippets: [
        {
          filename: "consumers/dispatch.py",
          language: "python",
          code: `async def on_trip_requested(ctx, trip_id: int) -> None:
    async with SessionLocal() as db:
        trip = await db.get(Trip, trip_id)
        driver = await nearest_driver(trip.pickup)
        trip.driver_id = driver.id
        await db.commit()`,
        },
      ],
      hood: [
        {
          layer: "Broker choice",
          what: "Redis streams, Rabbit, or Kafka. Ordering and replay are properties of the broker, not of FastAPI.",
          automatic: false,
        },
        {
          layer: "Consumer group",
          what: "You scale consumers. Idempotency keys are yours. There is no after_commit to hide a double publish.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails: "Sidekiq is the queue for most Rails shops. Enough until it is not.",
        fastapi: "You name the broker on day one. Correct, and slower to first job.",
        winner: "rails",
      },
      control: {
        rails: "At-least-once + JSON args. Exactly-once is a story you tell yourself.",
        fastapi: "Kafka semantics are available if you actually operate Kafka.",
        winner: "fastapi",
      },
      refactor: {
        rails: "ActiveJob lets you swap backends until the semantics diverge.",
        fastapi: "The consumer module is already the seam.",
        winner: "tie",
      },
      runtime: {
        rails: "Redis is fast and operationally cheap. Kafka is a platform.",
        fastapi: "Same brokers. Python consumers overlap IO well.",
        winner: "tie",
      },
      verdict:
        "Use a queue when the HTTP request must not wait. Rails makes that a Job class. FastAPI makes it a consumer. The interview question is the edge: mark it async on the canvas.",
    },
  },
  {
    kind: "nosql",
    title: "NoSQL / KV",
    summary:
      "Hot, shapeless, or geospatial data that should not share a WAL with billing rows. Rails talks to Redis/Mongo via gems. FastAPI uses redis-py or Motor and a Pydantic document.",
    rails: {
      label: "Redis / Mongoid",
      philosophy: "A second client on the model",
      snippets: [
        {
          filename: "app/models/driver_location.rb",
          language: "ruby",
          code: `class DriverLocation
  GEO = "drivers:geo"
  def self.ping(driver_id, lng, lat)
    Redis.current.geoadd(GEO, lng, lat, driver_id)
    Redis.current.set("driver:#{driver_id}:ts", Time.now.to_i, ex: 30)
  end
end`,
        },
      ],
      hood: [
        {
          layer: "Separate process, separate failure",
          what: "Redis going down does not roll back the Trip row unless you wrap it. Most apps do not.",
          automatic: true,
        },
        {
          layer: "GEO commands",
          what: "Nearby drivers are a Redis GEO query, not an ActiveRecord where. The ORM does not know this table.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "redis-py / Motor",
      philosophy: "A document you define",
      snippets: [
        {
          filename: "locations.py",
          language: "python",
          code: `async def ping(driver_id: int, lng: float, lat: float, redis: Redis) -> None:
    await redis.geoadd("drivers:geo", (lng, lat, str(driver_id)))
    await redis.set(f"driver:{driver_id}:ts", int(time.time()), ex=30)`,
        },
      ],
      hood: [
        {
          layer: "No identity map",
          what: "There is no DriverLocation model unless you write one. Bytes in, bytes out, plus a GEO index.",
          automatic: false,
        },
        {
          layer: "TTL is the schema",
          what: "Presence expires because you set ex=30. Forget it and the GEO set fills with ghosts.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails: "A Redis gem and a PORO. Fast to add; easy to pretend it is still ActiveRecord.",
        fastapi: "Same Redis calls, fewer illusions.",
        winner: "tie",
      },
      control: {
        rails: "Mixing Mongoid documents with AR in one request is a session soup.",
        fastapi: "Two clients, two explicit sessions. Clearer under review.",
        winner: "fastapi",
      },
      refactor: {
        rails: "Extracting location out of SQL is a data move the models will fight.",
        fastapi: "If you started with a ping function, SQL never had this data.",
        winner: "fastapi",
      },
      runtime: {
        rails: "GEOADD is the same on both stacks. The win is not putting 1Hz pings in Postgres.",
        fastapi: "asyncio overlaps the pings. Same Redis.",
        winner: "fastapi",
      },
      verdict:
        "NoSQL on this canvas means 'not the source of truth for money'. Rails will let you hide that behind a model. FastAPI will not. Interviewers want to hear which data is allowed to vanish.",
    },
  },
  {
    kind: "replica",
    title: "Read Replica",
    summary:
      "Another copy of SQL that serves reads. Rails 6+ has connected_to :reading. FastAPI binds a second Engine and you choose it per statement — nothing will reroute a SELECT for you.",
    rails: {
      label: "connected_to :reading",
      philosophy: "Role switching",
      snippets: [
        {
          filename: "app/models/application_record.rb",
          language: "ruby",
          code: `class ApplicationRecord < ActiveRecord::Base
  connects_to database: { writing: :primary, reading: :replica }
end

ActiveRecord::Base.connected_to(role: :reading) do
  TimelineEntry.where(user_id: id).limit(50)
end`,
        },
      ],
      hood: [
        {
          layer: "Automatic vs block",
          what: "A middleware can send GET to the replica. Writes in a GET (sidekiq-less counters) will explode. The block form is the honest one.",
          automatic: true,
        },
        {
          layer: "Lag",
          what: "read_your_own_writes is not guaranteed. Rails will not wait for replay. You handle stickiness after a POST.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "replica Engine",
      philosophy: "A second bind",
      snippets: [
        {
          filename: "db.py",
          language: "python",
          code: `primary = create_engine(settings.primary_url)
replica = create_engine(settings.replica_url)

def get_read_db():
    with Session(replica) as session:
        yield session`,
        },
      ],
      hood: [
        {
          layer: "Depends(get_read_db)",
          what: "List endpoints take the replica session. Write endpoints take primary. Mix them and you get a confusing bug, not a framework surprise.",
          automatic: false,
        },
        {
          layer: "Lag is yours",
          what: "After a write, read from primary or wait on LSN. No middleware will guess.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails: "A YAML entry and a role block. GET-to-replica middleware ships in guides.",
        fastapi: "Two URLs, two session dependencies. Short, and you will miss one endpoint.",
        winner: "rails",
      },
      control: {
        rails: "Implicit GET routing is convenient and how you write to a replica by accident.",
        fastapi: "The dependency is the policy.",
        winner: "fastapi",
      },
      refactor: {
        rails: "Moving a query to primary is changing a block.",
        fastapi: "Moving a query is changing a Depends.",
        winner: "tie",
      },
      runtime: {
        rails: "Replicas multiply read capacity. Lag is physics.",
        fastapi: "Same Postgres, same lag, fewer surprise writes to the replica.",
        winner: "tie",
      },
      verdict:
        "Replicas are how you survive a read-heavy mix without a bigger primary. Rails will route GETs if you let it. FastAPI will not. Either way, draw the replica on the canvas so the stress engine can count it.",
    },
  },
  {
    kind: "circuit-breaker",
    title: "Circuit Breaker",
    summary:
      "Stop calling a sick dependency. Rails uses semian/circuitbox around Redis and SQL. FastAPI wraps the await with aiobreaker or a hand-rolled counter. Both are explicit compared to most of Rails.",
    rails: {
      label: "semian / circuitbox",
      philosophy: "A wrapper around the client",
      snippets: [
        {
          filename: "config/initializers/semian.rb",
          language: "ruby",
          code: `require "semian/redis"
Redis.new(
  url: ENV["REDIS_URL"],
  semian: { name: :cache, tickets: 32, error_threshold: 10, error_timeout: 10 }
)`,
        },
      ],
      hood: [
        {
          layer: "Resource ticket",
          what: "Semian bulkheads so one slow Redis cannot check out every AR connection. This is production Rails, not the tutorial.",
          automatic: true,
        },
        {
          layer: "Open circuit",
          what: "After N errors the gem raises without hitting the network. You rescue and serve stale or 503.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "aiobreaker",
      philosophy: "Decorate the call",
      snippets: [
        {
          filename: "breakers.py",
          language: "python",
          code: `cache_breaker = CircuitBreakerError(fail_max=10, reset_timeout=10)

@cache_breaker
async def cache_get(redis: Redis, key: str) -> str | None:
    return await redis.get(key)`,
        },
      ],
      hood: [
        {
          layer: "Decorator state",
          what: "The breaker is process-local unless you store counts in Redis. Multi-worker FastAPI needs a shared counter or each worker sheds at different times.",
          automatic: false,
        },
        {
          layer: "Fallback",
          what: "except CircuitBreakerError: return stale. You write the fallback. There is no rescue_from unless you add one.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails: "A gem initializer covers Redis and MySQL with one pattern.",
        fastapi: "One decorator per call site unless you wrap the client once.",
        winner: "rails",
      },
      control: {
        rails: "Tickets and thresholds are config. Fine until you need a per-tenant breaker.",
        fastapi: "A function. Per-tenant is another argument.",
        winner: "fastapi",
      },
      refactor: {
        rails: "Clients constructed outside the gem skip the breaker. Easy to miss.",
        fastapi: "Grep the decorator. Same miss, more visible.",
        winner: "tie",
      },
      runtime: {
        rails: "Bulkheads save the process. The gem is battle-tested at Shopify scale.",
        fastapi: "asyncio + a breaker is enough if the counter is shared.",
        winner: "tie",
      },
      verdict:
        "Breakers are how you fail open or closed on purpose. Add this node when the stress test shows a retry storm. Rails has a gem; FastAPI has a decorator. The interview wants the fallback, not the library name.",
    },
  },
  {
    kind: "graph",
    title: "Graph Database",
    summary:
      "Follow graphs, friend-of-friend, and dispatch neighborhoods. Rails talks to Neo4j through ActiveGraph (an ActiveRecord-shaped wrapper). FastAPI uses the official driver and Cypher you write yourself — no identity map, no callbacks.",
    rails: {
      label: "ActiveGraph",
      philosophy: "The node is a model",
      snippets: [
        {
          filename: "app/models/person.rb",
          language: "ruby",
          code: `class Person
  include ActiveGraph::Node
  property :handle, type: String
  has_many :out, :following, type: :FOLLOWS, model_class: :Person

  def timeline_ids(limit = 50)
    following.posts.order(created_at: :desc).limit(limit).pluck(:id)
  end
end`,
        },
      ],
      hood: [
        {
          layer: "Cypher under the model",
          what: "has_many :following compiles to a MATCH (n)-[:FOLLOWS]->(m) you never see unless you log it. Variable-length paths hide in named associations.",
          automatic: true,
        },
        {
          layer: "Session per request",
          what: "A Rack middleware opens a Neo4j session, similar to AR. Rescue and retry are gems, not your code, until they aren't.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "neo4j driver",
      philosophy: "Cypher is the query",
      snippets: [
        {
          filename: "graph.py",
          language: "python",
          code: `async def following_ids(driver, user_id: int) -> list[int]:
    query = """
    MATCH (u:Person {id: $id})-[:FOLLOWS]->(m)
    RETURN m.id AS id
    """
    async with driver.session() as session:
        result = await session.run(query, id=user_id)
        return [r["id"] async for r in result]`,
        },
      ],
      hood: [
        {
          layer: "No identity map",
          what: "Rows are dicts. Pydantic can wrap them if you want a document, but the driver will not track dirty nodes or issue MERGE for you.",
          automatic: false,
        },
        {
          layer: "Session + await",
          what: "You open, run, close. Blocking the ASGI loop with a sync driver is the classic production bug.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails: "Associations feel like ActiveRecord. Fast to sketch a follow graph.",
        fastapi: "You write Cypher on day one. Slower first path, fewer surprise N+1 walks.",
        winner: "rails",
      },
      control: {
        rails: "Hidden MATCH depth is how you accidentally traverse the whole graph.",
        fastapi: "The query string is the review surface.",
        winner: "fastapi",
      },
      refactor: {
        rails: "Renaming a relationship type is a model plus a migration of edges.",
        fastapi: "Same migration, but callers already named the type in Cypher.",
        winner: "tie",
      },
      runtime: {
        rails: "ActiveGraph still hits the same Neo4j. The cost is object mapping.",
        fastapi: "Less mapping, same Cypher plan. Async overlaps well with IO-bound walks.",
        winner: "fastapi",
      },
      verdict:
        "Put a graph store on the canvas when hops matter more than rows — follow graphs, nearby drivers, fraud rings. Rails will dress it as a model. FastAPI will leave Cypher in the open. Interviewers want the hop budget, not the gem name.",
    },
  },
];
