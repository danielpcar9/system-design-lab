import type { DualStackLesson } from "./types";

export const LESSONS_MORE: DualStackLesson[] = [
  {
    kind: "cache",
    title: "Caching",
    summary:
      "Rails.cache is a façade over Memory/Redis/Memcached with fetch, increment, and Russian-doll keys derived from record.cache_key_with_version. FastAPI talks to Redis as a client you inject — there is no global cache, and no automatic key from a model.",
    rails: {
      label: "Rails.cache · Redis",
      philosophy: "fetch or compute",
      snippets: [
        {
          filename: "app/models/short_link.rb",
          language: "ruby",
          code: `class ShortLink < ApplicationRecord
  def self.lookup(code)
    Rails.cache.fetch(["short", code], expires_in: 10.minutes) do
      find_by!(code: code)
    end
  end

  after_commit :bust_cache

  private
  def bust_cache
    Rails.cache.delete(["short", code])
  end
end`,
        },
        {
          filename: "config/environments/production.rb",
          language: "ruby",
          code: `config.cache_store = :redis_cache_store, {
  url: ENV.fetch("REDIS_URL"),
  pool: { size: ENV.fetch("RAILS_MAX_THREADS", 5).to_i }
}`,
        },
      ],
      hood: [
        {
          layer: "ActiveSupport::Cache",
          what: "Rails.cache is a process-wide store. fetch does GET, then SET if miss, with race_condition_ttl to avoid dogpiles.",
          automatic: true,
        },
        {
          layer: "cache_key_with_version",
          what: "Records contribute id plus updated_at. Russian-doll caching in views expires when the row changes, without you naming the key.",
          automatic: true,
        },
        {
          layer: "after_commit bust",
          what: "If you roll your own keys (as here), you must delete them. The callback is the usual hook; forget it and you serve ghosts.",
          automatic: true,
        },
        {
          layer: "Marshal vs JSON",
          what: "The Redis store dumps Ruby objects with Marshal by default. Deploy a class change and old values raise. coder: JSON is the adult setting.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "redis.asyncio · explicit keys",
      philosophy: "GET, SET, DELETE — you",
      snippets: [
        {
          filename: "services/links.py",
          language: "python",
          code: `async def lookup(code: str, db: Session, redis: Redis) -> ShortLink:
    cached = await redis.get(f"short:{code}")
    if cached is not None:
        return ShortLinkOut.model_validate_json(cached)
    row = db.scalar(select(ShortLink).where(ShortLink.code == code))
    if row is None:
        raise HTTPException(status_code=404)
    payload = ShortLinkOut.model_validate(row)
    await redis.set(f"short:{code}", payload.model_dump_json(), ex=600)
    return payload

async def bust(code: str, redis: Redis) -> None:
    await redis.delete(f"short:{code}")`,
        },
      ],
      hood: [
        {
          layer: "Injected client",
          what: "A Redis connection pool lives on app.state, yielded by Depends. There is no Rails.cache singleton.",
          automatic: false,
        },
        {
          layer: "You pick the codec",
          what: "Pydantic dump_json is a contract. No Marshal, no surprise class load after deploy — unless you pickle, which you should not.",
          automatic: false,
        },
        {
          layer: "Miss path is SQL",
          what: "The function is the policy: TTL, 404, stampede. A lock (SET NX) is extra code, not a fetch option.",
          automatic: false,
        },
        {
          layer: "Bust on write",
          what: "The update endpoint must call bust. Nothing in SQLAlchemy will. This is the same footgun as Rails, without a callback to hide it.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails:
          "Rails.cache.fetch plus cache_key makes view and record caching a one-liner. Low-traffic apps never think about Redis.",
        fastapi:
          "You write get/set/delete and a key scheme. The first cache is twenty lines and a dependency.",
        winner: "rails",
      },
      control: {
        rails:
          "Global store + Marshal + implicit keys is convenient and occasionally cursed. Named keys (as in the snippet) are the escape hatch.",
        fastapi:
          "Keys, TTL, and codec are local. Two services cannot collide unless they share a prefix you designed.",
        winner: "fastapi",
      },
      refactor: {
        rails:
          "Russian-doll keys couple cache to updated_at. Touching a record from a callback busts more than you meant.",
        fastapi:
          "A key function is easy to grep. Changing a prefix is a constant. No view layer will invent keys behind your back.",
        winner: "fastapi",
      },
      runtime: {
        rails:
          "redis-rb plus Marshal. Fine. The silent killer is MemoryStore in production or a single global connection without a pool.",
        fastapi:
          "redis.asyncio overlaps well with ASGI. Pipeline/MGET are ordinary awaits. Same Redis, less framework around it.",
        winner: "fastapi",
      },
      verdict:
        "Use Rails.cache when the keys should follow records and views. Use an explicit Redis client when the cache is a system design artifact — hot redirect keys, session denylist, rate counters — and you want it to look like one in the code review.",
    },
  },
  {
    kind: "authorization",
    title: "Authorization",
    summary:
      "Pundit (or Action Policy) hides policy lookup behind authorize @post. FastAPI authorization is a dependency that receives the current user and the resource, or a check you write in the endpoint — nothing is loaded by class name.",
    rails: {
      label: "Pundit",
      philosophy: "policy class per model",
      snippets: [
        {
          filename: "app/policies/post_policy.rb",
          language: "ruby",
          code: `class PostPolicy < ApplicationPolicy
  def show?
    record.published? || record.author_id == user.id
  end

  def update?
    record.author_id == user.id
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      scope.where(author_id: user.id).or(scope.where(status: :published))
    end
  end
end`,
        },
        {
          filename: "app/controllers/posts_controller.rb",
          language: "ruby",
          code: `def show
  @post = Post.find(params[:id])
  authorize @post
end

def index
  @posts = policy_scope(Post).recent
end`,
        },
      ],
      hood: [
        {
          layer: "infer the policy",
          what: "authorize @post constantizes PostPolicy from the class name. Namespaces and STI need overrides or it loads the wrong class.",
          automatic: true,
        },
        {
          layer: "Pundit::NotAuthorizedError",
          what: "A rescue_from in ApplicationController turns it into 403. You never see the raise if the handler is in place.",
          automatic: true,
        },
        {
          layer: "policy_scope",
          what: "Index queries are scoped in Ruby, then become SQL. Forget policy_scope and you leak rows — the show action was authorized, the list was not.",
          automatic: true,
        },
        {
          layer: "headless policies",
          what: "For non-model actions you pass a symbol. The magic is thinner; most apps underuse this and stuff logic into the model policy.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "Dependencies · predicates",
      philosophy: "A function that can raise 403",
      snippets: [
        {
          filename: "authz.py",
          language: "python",
          code: `def can_read(user: User, post: Post) -> bool:
    return post.status == "published" or post.author_id == user.id

def require_post(
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> Post:
    post = db.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=404)
    if not can_read(user, post):
        raise HTTPException(status_code=403, detail="Forbidden")
    return post

@router.get("/posts/{post_id}", response_model=PostOut)
def show_post(post: Annotated[Post, Depends(require_post)]):
    return post`,
        },
      ],
      hood: [
        {
          layer: "Depends(require_post)",
          what: "The resource is loaded and authorized before the endpoint. The function never receives a forbidden Post.",
          automatic: false,
        },
        {
          layer: "No class inference",
          what: "You import can_read. There is no PostPolicy autoload. Rename the model and the compiler tells you, not a NameError at request time.",
          automatic: false,
        },
        {
          layer: "Query-level authz",
          what: "List endpoints add WHERE in the select(). There is no policy_scope — leaking an unfiltered query is an omitted where(), greppable.",
          automatic: false,
        },
        {
          layer: "403 vs 404",
          what: "You choose. Returning 404 for forbidden ids is a one-line change, not a Pundit config. Be consistent on purpose.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails:
          "A generator and authorize @record cover the common case. policy_scope keeps index actions short.",
        fastapi:
          "You write a loader dependency per resource. Copy-paste is the risk; a small authz module is the cure.",
        winner: "rails",
      },
      control: {
        rails:
          "Metaprogrammed policy names and a global rescue_from make the 403 path hard to see in the action.",
        fastapi:
          "The 403 is a raise next to the predicate. Reviewers read the rule without opening a parallel class.",
        winner: "fastapi",
      },
      refactor: {
        rails:
          "Policies cluster by model, which matches CRUD. Cross-resource rules (can this org billing admin…?) fight the convention.",
        fastapi:
          "Predicates compose. A can_read used by HTTP, jobs, and GraphQL is just a function. No inferencer to keep happy.",
        winner: "fastapi",
      },
      runtime: {
        rails:
          "An extra object per authorize. Negligible next to the query. policy_scope SQL quality depends on how you wrote resolve.",
        fastapi:
          "A function call and a query. Same order of magnitude. The difference is never the 403; it is whether the list query was filtered.",
        winner: "tie",
      },
      verdict:
        "Pundit is a naming convention that keeps CRUD honest. FastAPI authorization is software you can call from anywhere. If your rules are resource-shaped, Rails is faster. If they are capability-shaped, write functions.",
    },
  },
  {
    kind: "websocket",
    title: "WebSockets",
    summary:
      "ActionCable hides the socket behind channels, subscriptions, and a Redis pub/sub adapter. FastAPI gives you a WebSocket object and a loop — fan-out, presence, and auth are yours.",
    rails: {
      label: "ActionCable",
      philosophy: "Channel classes and broadcast",
      snippets: [
        {
          filename: "app/channels/room_channel.rb",
          language: "ruby",
          code: `class RoomChannel < ApplicationCable::Channel
  def subscribed
    room = Room.find(params[:room_id])
    reject unless RoomPolicy.new(current_user, room).show?
    stream_for room
  end

  def speak(data)
    Message.create!(room_id: params[:room_id], author: current_user, body: data["body"])
  end
end`,
        },
        {
          filename: "app/models/message.rb",
          language: "ruby",
          code: `class Message < ApplicationRecord
  after_create_commit -> {
    RoomChannel.broadcast_to(room, { type: "message", **as_json })
  }
end`,
        },
      ],
      hood: [
        {
          layer: "cable.js + /cable",
          what: "The client opens a socket to the mounted endpoint. Connection#connect identifies current_user from the session cookie or a signed token.",
          automatic: true,
        },
        {
          layer: "Redis pub/sub adapter",
          what: "broadcast_to publishes on a stream name. Every Puma/Cable worker subscribed to that stream wakes. You do not manage the fan-out list.",
          automatic: true,
        },
        {
          layer: "stream_for",
          what: "Subscribed sockets are registered in process memory plus Redis. A reject drops the subscription without an exception in the client by default.",
          automatic: true,
        },
        {
          layer: "after_create_commit broadcast",
          what: "HTTP create and channel speak both persist a Message; the callback fans out. Two writers, one pipe — convention doing real work.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "WebSocket · broker",
      philosophy: "accept, loop, close",
      snippets: [
        {
          filename: "routers/ws.py",
          language: "python",
          code: `@router.websocket("/ws/rooms/{room_id}")
async def room_socket(
    websocket: WebSocket,
    room_id: int,
    token: str | None = Query(default=None),
):
    user = await user_from_token(token)
    await websocket.accept()
    async with broker.subscribe(room_id) as queue:
        send = asyncio.create_task(_pump_out(websocket, queue))
        recv = asyncio.create_task(_pump_in(websocket, room_id, user))
        done, pending = await asyncio.wait(
            {send, recv}, return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending:
            task.cancel()`,
        },
      ],
      hood: [
        {
          layer: "ASGI websocket scope",
          what: "Starlette accepts the upgrade. You must call accept() or the client hangs. Auth via query token — cookies are awkward across origins.",
          automatic: false,
        },
        {
          layer: "Two tasks",
          what: "Inbound messages and outbound pub/sub are concurrent. You cancel the sibling on first completion. Forget it and you leak tasks.",
          automatic: false,
        },
        {
          layer: "broker.subscribe",
          what: "Your Redis/NATS wrapper. There is no stream_for. Presence (who is in the room) is a SET you maintain on connect/disconnect.",
          automatic: false,
        },
        {
          layer: "HTTP and WS diverge",
          what: "A REST create_message must publish to the same broker channel the socket reads. No callback will glue them unless you write it.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails:
          "A channel, a broadcast, and Hotwire/JS consumer. Presence and typing indicators still take work, but the socket itself is free.",
        fastapi:
          "The echo tutorial is short; a production room (auth, fan-out, reconnect, backpressure) is a service.",
        winner: "rails",
      },
      control: {
        rails:
          "The adapter and stream names are framework-shaped. Custom protocols fight Channel#receive. Horizontal scale is 'run AnyCable'.",
        fastapi:
          "The loop is yours. Binary frames, backpressure, and a custom broker are ordinary. You also own every disconnect bug.",
        winner: "fastapi",
      },
      refactor: {
        rails:
          "Logic in channels plus model callbacks splits the story. Extracting a Broadcaster service is once again cultural.",
        fastapi:
          "A broker module is the seam. HTTP and WS already share it if you started that way. If you did not, there is no callback to migrate off.",
        winner: "fastapi",
      },
      runtime: {
        rails:
          "MRI + ActionCable struggles at tens of thousands of sockets. AnyCable (Go) is the real runtime; Rails becomes the publisher.",
        fastapi:
          "asyncio + Uvicorn handles many idle sockets well. CPU-heavy payloads still need a process plan. Honest async wins here.",
        winner: "fastapi",
      },
      verdict:
        "ActionCable is the fastest path to 'it broadcasts.' FastAPI is the fastest path to 'I understand the socket.' At serious concurrency both end up with a dedicated realtime layer — AnyCable or a broker next to Uvicorn.",
    },
  },
  {
    kind: "files",
    title: "Blob Storage",
    summary:
      "ActiveStorage gives you has_one_attached, direct uploads, and variant processing with almost no code. FastAPI receives UploadFile, streams to S3 with a client you configure, and records the key in a column you added.",
    rails: {
      label: "ActiveStorage",
      philosophy: "has_one_attached :photo",
      snippets: [
        {
          filename: "app/models/listing.rb",
          language: "ruby",
          code: `class Listing < ApplicationRecord
  has_one_attached :cover
  has_many_attached :gallery

  def cover_url
    cover.variant(:card).processed.url if cover.attached?
  end
end`,
        },
        {
          filename: "config/storage.yml",
          language: "ruby",
          code: `amazon:
  service: S3
  access_key_id: <%= Rails.application.credentials.dig(:aws, :access_key_id) %>
  secret_access_key: <%= Rails.application.credentials.dig(:aws, :secret_access_key) %>
  region: us-east-1
  bucket: <%= Rails.application.credentials.dig(:aws, :bucket) %>`,
        },
      ],
      hood: [
        {
          layer: "Two tables",
          what: "active_storage_blobs and attachments are created by a migration you run once. The listing row never holds the file.",
          automatic: true,
        },
        {
          layer: "Direct upload",
          what: "The JS library asks the app for a signed URL, PUTs to S3, then posts the blob id. Rails never sees the bytes on the big path.",
          automatic: true,
        },
        {
          layer: "Variants",
          what: "cover.variant(:card) is a named transformation. First request processes (Vips/ImageMagick) and stores a derivative blob.",
          automatic: true,
        },
        {
          layer: "Purge later",
          what: "Replacing an attachment enqueues a purge job. Orphan blobs are a background concern, not your controller.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "UploadFile · S3 client",
      philosophy: "Stream the bytes yourself",
      snippets: [
        {
          filename: "routers/uploads.py",
          language: "python",
          code: `@router.post("/listings/{id}/cover", response_model=ListingOut)
async def upload_cover(
    id: int,
    file: UploadFile,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    s3: Annotated[S3Client, Depends(get_s3)],
):
    listing = db.get(Listing, id)
    if listing.owner_id != user.id:
        raise HTTPException(status_code=403)
    key = f"listings/{id}/cover/{file.filename}"
    await s3.put_object(
        Bucket=settings.bucket,
        Key=key,
        Body=await file.read(),
        ContentType=file.content_type,
    )
    listing.cover_key = key
    db.commit()
    return listing`,
        },
      ],
      hood: [
        {
          layer: "Spooled UploadFile",
          what: "Starlette spools to a NamedTemporaryFile past a size threshold. await file.read() still loads it — stream with read(chunk) for large objects.",
          automatic: false,
        },
        {
          layer: "S3 client",
          what: "aioboto3 or a pre-signed POST you generate. Direct-to-bucket is extra endpoints (sign, complete), not a library default.",
          automatic: false,
        },
        {
          layer: "A column you own",
          what: "cover_key is a string. There is no attachments table unless you build one. Deleting the listing does not delete the object.",
          automatic: false,
        },
        {
          layer: "Variants",
          what: "Thumbnails are a worker (Pillow, libvips) you run on upload or on first read. Nothing named :card exists until you invent it.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails:
          "has_one_attached is the entire feature for many products. Direct uploads and variants are already designed.",
        fastapi:
          "Sign, PUT, record, delete, and thumbnail are four stories. Fine if files are a side path; painful if they are the product.",
        winner: "rails",
      },
      control: {
        rails:
          "The blob model and signed URLs are framework. Custom ACL, encryption, or a non-S3 vendor means fighting ActiveStorage::Service.",
        fastapi:
          "The object key, ACL, and metadata are arguments. Multi-cloud is a client swap. You will reinvent purge.",
        winner: "fastapi",
      },
      refactor: {
        rails:
          "Moving off ActiveStorage is a data migration of blobs/attachments. Staying on it is cheap. Halfway is misery.",
        fastapi:
          "A storage service class is a normal seam. Changing key layout is a rewrite of strings, not a framework.",
        winner: "fastapi",
      },
      runtime: {
        rails:
          "Variants on-the-fly can stall a web worker. The fix is a job, which Rails will enqueue if you use .processed carefully.",
        fastapi:
          "await file.read() on a 200MB upload is the own-goal. Streaming + pre-signed PUT is as fast as anything Rails does.",
        winner: "tie",
      },
      verdict:
        "If uploads are a product surface, ActiveStorage is one of Rails' remaining killer features. If uploads are a signed URL to a bucket you already run, FastAPI stays out of the way — which is the better kind of nothing.",
    },
  },
  {
    kind: "search",
    title: "Search",
    summary:
      "Rails often starts with pg_search or a gem that syncs to OpenSearch via callbacks. FastAPI talks to the search engine as a client on write and on query — the index is another datastore, not an ActiveRecord feature.",
    rails: {
      label: "pg_search · optional OpenSearch",
      philosophy: "A scope that happens to rank",
      snippets: [
        {
          filename: "app/models/listing.rb",
          language: "ruby",
          code: `class Listing < ApplicationRecord
  include PgSearch::Model
  pg_search_scope :search_text,
    against: { title: "A", description: "B" },
    using: { tsearch: { prefix: true } }

  after_commit :reindex, on: %i[create update]
  after_commit :drop_index, on: :destroy

  def reindex
    SearchIndexerJob.perform_later(id)
  end
end`,
        },
      ],
      hood: [
        {
          layer: "tsvector",
          what: "pg_search emits a full-text query. A generated column + GIN index (or pg_search's extra) is the production form; the gem will not yell if you skip it.",
          automatic: true,
        },
        {
          layer: "Reindex job",
          what: "If you outgrow Postgres, a callback enqueues a document rebuild. The HTTP request does not wait on OpenSearch.",
          automatic: true,
        },
        {
          layer: "The model is the document",
          what: "as_indexed_json is a method on the record. Changing the document shape is a model change plus a reindex rake task.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "OpenSearch client",
      philosophy: "A second write",
      snippets: [
        {
          filename: "services/search.py",
          language: "python",
          code: `async def index_listing(listing: Listing, os: OpenSearch) -> None:
    await os.index(
        index="listings",
        id=str(listing.id),
        body=ListingDoc.model_validate(listing).model_dump(),
    )

@router.get("/search", response_model=list[ListingOut])
async def search(
    q: str,
    os: Annotated[OpenSearch, Depends(get_os)],
    db: Annotated[Session, Depends(get_db)],
):
    resp = await os.search(index="listings", body={
        "query": {"multi_match": {"query": q, "fields": ["title^2", "description"]}}
    })
    ids = [int(h["_id"]) for h in resp["hits"]["hits"]]
    rows = db.scalars(select(Listing).where(Listing.id.in_(ids))).all()
    order = {i: n for n, i in enumerate(ids)}
    return sorted(rows, key=lambda r: order[r.id])`,
        },
      ],
      hood: [
        {
          layer: "Dual write",
          what: "After commit you index. Failure means Postgres and search diverge until a repair job. There is no callback to forget — you can still forget the await.",
          automatic: false,
        },
        {
          layer: "Document schema",
          what: "ListingDoc is a Pydantic model. It is allowed to differ from Listing. That is the point of a search document.",
          automatic: false,
        },
        {
          layer: "IDs then hydrate",
          what: "Search returns ids; SQLAlchemy loads rows. Ranking order is reapplied in Python. You see the join between two stores.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails:
          "pg_search on a couple of columns is a Saturday. Good enough for many SaaS apps without a second cluster.",
        fastapi:
          "A working OpenSearch query is not hard; keeping it in sync with writes is the actual project.",
        winner: "rails",
      },
      control: {
        rails:
          "When you do add OpenSearch, the gem's callbacks can hide mapping changes until a query breaks.",
        fastapi:
          "The mapping and the query body are in the repo. Relevance work looks like relevance work.",
        winner: "fastapi",
      },
      refactor: {
        rails:
          "pg_search to Searchkick is a model rewrite. The HTTP layer barely moves.",
        fastapi:
          "The search service is already a module. Swapping Meilisearch is a client and a document dump.",
        winner: "fastapi",
      },
      runtime: {
        rails:
          "Postgres FTS is operationally cheap and CPU-bound on large corpora. The cliff is real, the ops story is simple.",
        fastapi:
          "A dedicated engine scales relevance better and costs a cluster. Hydrating from Postgres after search is an extra round-trip you chose.",
        winner: "tie",
      },
      verdict:
        "Stay on Postgres FTS as long as it is honest. When you leave, FastAPI's 'second write' model is the one you wanted all along — Rails can do it, it just does not look like that in the tutorial.",
    },
  },
  {
    kind: "load-balancer",
    title: "Load Balancer",
    summary:
      "The balancer is stack-agnostic metal. What changes is what you put behind it: Puma clustered processes with optional sticky sessions for ActionCable, versus Uvicorn workers that stay stateless if you stuck to JWT.",
    rails: {
      label: "Puma cluster behind the LB",
      philosophy: "Processes + threads, sticky if you must",
      snippets: [
        {
          filename: "config/puma.rb",
          language: "ruby",
          code: `workers ENV.fetch("WEB_CONCURRENCY", 2).to_i
max_threads_count = ENV.fetch("RAILS_MAX_THREADS", 5).to_i
min_threads_count = ENV.fetch("RAILS_MIN_THREADS") { max_threads_count }
threads min_threads_count, max_threads_count
preload_app!

on_worker_boot do
  ActiveRecord::Base.establish_connection
end`,
        },
      ],
      hood: [
        {
          layer: "Cluster mode",
          what: "preload_app! forks workers. Connections must be re-established on boot or children share sockets and corrupt traffic.",
          automatic: true,
        },
        {
          layer: "Sticky sessions",
          what: "Cookie sessions survive any worker. ActionCable in-process does not — the LB must pin sockets or you run a dedicated cable host.",
          automatic: true,
        },
        {
          layer: "Health",
          what: "A /up endpoint (Rails 8) is the probe. The LB does not know about jobs or the Redis you also need.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "Uvicorn workers behind the LB",
      philosophy: "Stateless processes, share nothing",
      snippets: [
        {
          filename: "Procfile",
          language: "python",
          code: `# gunicorn -k uvicorn.workers.UvicornWorker -w 4 app.main:app
# Each worker is an event loop. Do not store request state on module globals.

from fastapi import FastAPI
app = FastAPI()

@app.get("/health")
def health():
    return {"ok": True}`,
        },
      ],
      hood: [
        {
          layer: "One loop per worker",
          what: "Uvicorn workers do not share memory. A module-level dict 'for presence' is a per-process lie. Redis is the shared truth.",
          automatic: false,
        },
        {
          layer: "JWT is LB-friendly",
          what: "No sticky sessions for auth. WebSockets still need pinning or a broker. Same topology decision as Cable, without a cookie to hide it.",
          automatic: false,
        },
        {
          layer: "Health",
          what: "You write /health. Include a ping to Postgres and Redis if you want the LB to take you out when a dependency dies.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails: "Puma's default config plus /up is production-shaped out of the box.",
        fastapi: "You pick gunicorn vs uvicorn, worker count, and a health route. Short, but not defaulted.",
        winner: "rails",
      },
      control: {
        rails: "Thread + process mix is a Puma specialty. Mis-set RAILS_MAX_THREADS vs DB pool and you deadlock.",
        fastapi: "Worker math is processes × event loop. Deadlocks are rarer; accidental shared globals are the footgun.",
        winner: "fastapi",
      },
      refactor: {
        rails: "Moving Cable off the web process is the usual scale step. The rest of the app does not notice.",
        fastapi: "Moving sockets off Uvicorn is the same step. Because fan-out was already a broker, the move is smaller.",
        winner: "fastapi",
      },
      runtime: {
        rails: "MRI throughput is process-bound. Puma threads help IO. CPU-heavy endpoints need more workers, more RAM.",
        fastapi: "Async IO shines on lots of wait. Tight CPU loops block the event loop — run them in a threadpool or another service.",
        winner: "tie",
      },
      verdict:
        "The load balancer does not care about your language. It cares whether you stored something in process memory. Rails cookies are portable; Rails sockets are not. FastAPI JWTs are portable; FastAPI module globals are not.",
    },
  },
  {
    kind: "cdn",
    title: "CDN",
    summary:
      "Edge cache sits in front of both stacks. Rails fingerprints assets through Propshaft/Sprockets. FastAPI either serves hashed static files or, more often, does not serve them at all — the SPA is on the CDN already.",
    rails: {
      label: "Propshaft · asset_host",
      philosophy: "Fingerprinted URLs from the app",
      snippets: [
        {
          filename: "config/environments/production.rb",
          language: "ruby",
          code: `config.asset_host = ENV["CDN_HOST"]
config.public_file_server.headers = {
  "Cache-Control" => "public, max-age=31536000, immutable"
}`,
        },
      ],
      hood: [
        {
          layer: "Digest in the filename",
          what: "application-abc123.css. The CDN can cache forever because the next deploy is a new URL. Rails helpers emit the digest.",
          automatic: true,
        },
        {
          layer: "asset_host",
          what: "image_tag and stylesheet_link_tag prefix the CDN. You do not rewrite URLs by hand.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "StaticFiles · or none",
      philosophy: "Usually the SPA is not in this process",
      snippets: [
        {
          filename: "main.py",
          language: "python",
          code: `app.mount("/static", StaticFiles(directory="static", html=False), name="static")
# Production: put hashed assets on the CDN. The API origin stays for JSON.
# Cache-Control is a Response header you set, or the CDN's default.`,
        },
      ],
      hood: [
        {
          layer: "Mount is optional",
          what: "APIs often serve zero bytes of CSS. The CDN origin is object storage or a frontend host, not Uvicorn.",
          automatic: false,
        },
        {
          layer: "Headers",
          what: "You set Cache-Control on responses you want cached (public GET of a short link's metadata, perhaps). Nothing infers immutable from a digest.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails: "Helpers + digest + asset_host is a solved path for server-rendered apps.",
        fastapi: "If you have no assets, there is nothing to solve. If you do, you invent hashing.",
        winner: "rails",
      },
      control: {
        rails: "The asset pipeline is a world. Escaping it (Vite, esbuild) is common and slightly unofficial.",
        fastapi: "No pipeline. Frontend tooling is someone else's app. The API stays an API.",
        winner: "fastapi",
      },
      refactor: { rails: "Moving to a JS bundler is a known trail.", fastapi: "There is nothing to move.", winner: "tie" },
      runtime: {
        rails: "Once fingerprinted, the CDN hit rate is the story, not Ruby.",
        fastapi: "Same, if you set the headers. Easy to forget on JSON that should be cached at the edge.",
        winner: "tie",
      },
      verdict:
        "A CDN is not a Rails feature or a FastAPI feature. Rails will push you toward one for assets. FastAPI will not mention assets. Design the cache keys on the canvas either way.",
    },
  },
  {
    kind: "client",
    title: "Client",
    summary:
      "The browser does not care which stack you picked. Rails often ships HTML (Hotwire) or a same-origin SPA. FastAPI almost always ships JSON to a separate frontend. That choice rewrites auth, CSRF, and how you draw this node.",
    rails: {
      label: "Hotwire or same-origin SPA",
      philosophy: "The app can render the page",
      snippets: [
        {
          filename: "app/views/posts/index.html.erb",
          language: "ruby",
          code: `<%= turbo_stream_from current_user, :timeline %>
<div id="timeline">
  <%= render @posts %>
</div>`,
        },
      ],
      hood: [
        {
          layer: "Same origin",
          what: "Session cookie, CSRF token in meta, and Turbo requests share the host. The LB sees one origin.",
          automatic: true,
        },
        {
          layer: "Progressive enhancement",
          what: "A form works without JS. That is not nostalgia; it is a simpler failure mode than a white SPA screen.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "SPA · CORS · Bearer",
      philosophy: "The app is a JSON API",
      snippets: [
        {
          filename: "main.py",
          language: "python",
          code: `app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)`,
        },
      ],
      hood: [
        {
          layer: "CORS is real",
          what: "The browser will not send your JSON unless the API says so. allow_credentials + wildcard origin is a bug, not a shortcut.",
          automatic: false,
        },
        {
          layer: "Bearer in JS",
          what: "Tokens in memory beat localStorage. Refresh cookies on a dedicated origin are a design project. None of this is default.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails: "One repo, one deploy, forms that work. The first product often ships faster as HTML.",
        fastapi: "Two repos, CORS, and a frontend build. The first product often looks more 'app-like' sooner if you already have a SPA team.",
        winner: "rails",
      },
      control: {
        rails: "Hotwire couples UX to the server. A mobile client then needs an API you did not start with.",
        fastapi: "The API is the product. Web, mobile, and partners consume the same contract. That was the point.",
        winner: "fastapi",
      },
      refactor: {
        rails: "Adding a SPA later is a second client and a CSRF/session rethink.",
        fastapi: "Adding server-rendered pages later is unusual — you probably never will.",
        winner: "tie",
      },
      runtime: {
        rails: "HTML over the wire can be fewer round-trips. Caching at CDN is harder than for a hashed SPA.",
        fastapi: "The SPA is static at the edge; the API is chatty. You design for waterfalls or you get them.",
        winner: "tie",
      },
      verdict:
        "Draw this node honestly. If Rails is serving HTML, the client and API are the same process. If FastAPI is serving JSON, the client is a different origin and CORS belongs on the canvas.",
    },
  },
];
