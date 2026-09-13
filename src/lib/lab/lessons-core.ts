import type { DualStackLesson } from "./types";

export const LESSONS_CORE: DualStackLesson[] = [
  {
    kind: "auth",
    title: "Authentication",
    summary:
      "Rails signs you in with a cookie session wired through Warden and a handful of callbacks. FastAPI issues a JWT you assemble yourself: hash, encode, decode, and inject the current user as a dependency.",
    rails: {
      label: "has_secure_password · cookie session",
      philosophy: "Convention over Configuration",
      snippets: [
        {
          filename: "app/models/user.rb",
          language: "ruby",
          code: `class User < ApplicationRecord
  has_secure_password
  has_many :sessions, dependent: :destroy

  generates_token_for :password_reset, expires_in: 15.minutes
end`,
        },
        {
          filename: "app/controllers/sessions_controller.rb",
          language: "ruby",
          code: `class SessionsController < ApplicationController
  skip_before_action :require_login, only: %i[new create]

  def create
    if (user = User.authenticate_by(email: params[:email], password: params[:password]))
      session[:user_id] = user.id
      redirect_to dashboard_path
    else
      render :new, status: :unprocessable_entity
    end
  end
end`,
        },
      ],
      hood: [
        {
          layer: "Puma → Rack",
          what: "The request enters Puma and walks the default Rack middleware stack before your controller runs.",
          automatic: true,
        },
        {
          layer: "ActionDispatch::Session",
          what: "CookieStore encrypts session[:user_id] with secret_key_base. You never touch the serializer.",
          automatic: true,
        },
        {
          layer: "CSRF / protect_from_forgery",
          what: "ActionController::Base verifies authenticity_token on non-GET. APIs must opt out explicitly.",
          automatic: true,
        },
        {
          layer: "has_secure_password",
          what: "ActiveModel mixes in authenticate / password= and BCrypt-hashes into password_digest via a before_save.",
          automatic: true,
        },
        {
          layer: "current_user",
          what: "A before_action memoizes User.find_by(id: session[:user_id]). Thread-local Current.user is the Rails 8 idiom.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "OAuth2PasswordBearer · JWT",
      philosophy: "Explicit is better than implicit",
      snippets: [
        {
          filename: "auth.py",
          language: "python",
          code: `pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=12)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.secret_key,
        algorithm="HS256",
    )`,
        },
        {
          filename: "deps.py",
          language: "python",
          code: `async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc
    user = db.get(User, int(sub))
    if user is None:
        raise credentials_exc
    return user`,
        },
      ],
      hood: [
        {
          layer: "Uvicorn → ASGI",
          what: "The request is an ASGI scope dict. Lifespan (startup/shutdown) is a coroutine you register, not a hidden boot.",
          automatic: false,
        },
        {
          layer: "OAuth2PasswordBearer",
          what: "Looks up Authorization: Bearer. Missing header → 401. You chose this scheme; nothing is session-based unless you add it.",
          automatic: false,
        },
        {
          layer: "Pydantic Token / User",
          what: "Request and response bodies are parsed and coerced before the endpoint. Invalid shape never reaches your function.",
          automatic: false,
        },
        {
          layer: "passlib + python-jose",
          what: "You hash, verify, encode, and decode. Expiry, audience, and rotation are your code, not a mixin.",
          automatic: false,
        },
        {
          layer: "Depends(get_current_user)",
          what: "The DI graph runs per-request. Nested Depends(get_db) opens a Session you must close in a finally / yield.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails:
          "A session cookie and has_secure_password ship a working login in an afternoon, including CSRF and reset tokens.",
        fastapi:
          "You wire hashing, JWT claims, OAuth2 scheme, and a dependency before the first 200. More files, fewer surprises later.",
        winner: "rails",
      },
      control: {
        rails:
          "Cookie sessions and Warden hide the wire format. Customizing a JWT-only API means fighting the defaults.",
        fastapi:
          "Every claim, header, and status code is in your repo. Token rotation and multi-audience APIs stay obvious.",
        winner: "fastapi",
      },
      refactor: {
        rails:
          "before_action and Current.user scatter implicit context. Extracting a service object is optional, so it often never happens.",
        fastapi:
          "Dependencies are functions. Swapping cookie sessions for JWT is a new Depends, not a framework conversion.",
        winner: "fastapi",
      },
      runtime: {
        rails:
          "Encrypted cookies and a User.find on every request. Fine at app scale; you add Redis sessions when it isn't.",
        fastapi:
          "Stateless JWT skips a DB hit if you trust the signature. Revocation then becomes an explicit denylist you must design.",
        winner: "tie",
      },
      verdict:
        "Pick Rails when the product is a cookie-session web app and you want the security checklist filled in. Pick FastAPI when the auth story is tokens, multiple clients, or you need the request path to be reviewable line by line.",
    },
  },
  {
    kind: "database",
    title: "Database Queries",
    summary:
      "ActiveRecord is an identity-map Active Record: models are rows, associations are methods, callbacks fire around persistence. SQLAlchemy 2.0 is a Data Mapper: you write statements, map rows onto objects, and own the Session.",
    rails: {
      label: "ActiveRecord",
      philosophy: "The model is the row",
      snippets: [
        {
          filename: "app/models/post.rb",
          language: "ruby",
          code: `class Post < ApplicationRecord
  belongs_to :author, class_name: "User"
  has_many :comments, dependent: :destroy
  has_many :taggings
  has_many :tags, through: :taggings

  scope :published, -> { where(status: :published) }
  scope :recent, -> { order(published_at: :desc) }

  after_create_commit :fanout_timeline
end`,
        },
        {
          filename: "app/controllers/posts_controller.rb",
          language: "ruby",
          code: `def index
  @posts = current_user
    .posts
    .published
    .recent
    .includes(:author, :tags)
    .page(params[:page])
end`,
        },
      ],
      hood: [
        {
          layer: "Query construction",
          what: "Each scope returns a lazy Relation. SQL is composed when you iterate, not when you chain.",
          automatic: true,
        },
        {
          layer: "Identity map",
          what: "Inside one request, Post.find(1) twice returns the same object. Dirty tracking lives on that instance.",
          automatic: true,
        },
        {
          layer: "includes / preloader",
          what: "N+1 is papered over by a second query (or LEFT OUTER JOIN). You opt in; nothing errors if you forget.",
          automatic: true,
        },
        {
          layer: "Callbacks",
          what: "after_create_commit runs after the transaction commits — jobs see the row. before_save can silently mutate attributes.",
          automatic: true,
        },
        {
          layer: "Schema & naming",
          what: "posts table, author_id foreign key, and inverse associations are inferred from class names unless you override.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "SQLAlchemy 2.0 · Pydantic",
      philosophy: "The model is a mapping",
      snippets: [
        {
          filename: "models.py",
          language: "python",
          code: `class Post(Base):
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str]
    published_at: Mapped[datetime | None]
    author: Mapped["User"] = relationship(back_populates="posts")
    tags: Mapped[list["Tag"]] = relationship(secondary="taggings")

class PostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    author: UserOut
    tags: list[TagOut]`,
        },
        {
          filename: "routers/posts.py",
          language: "python",
          code: `@router.get("/posts", response_model=list[PostOut])
def list_posts(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    page: int = 1,
    size: int = 20,
):
    stmt = (
        select(Post)
        .where(Post.author_id == user.id, Post.status == "published")
        .options(selectinload(Post.author), selectinload(Post.tags))
        .order_by(Post.published_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    return db.scalars(stmt).all()`,
        },
      ],
      hood: [
        {
          layer: "Session lifecycle",
          what: "get_db yields a Session bound to this request. Commit, rollback, and close are your finally-block, not a framework after_filter.",
          automatic: false,
        },
        {
          layer: "select() is SQL",
          what: "Nothing queries until Session.execute. There is no implicit `posts` method hanging off User.",
          automatic: false,
        },
        {
          layer: "selectinload",
          what: "You name every eager load. Forget it and you get lazy IO in a detached session — or an explicit error with expire_on_commit.",
          automatic: false,
        },
        {
          layer: "Pydantic from_attributes",
          what: "ORM instances are projected onto PostOut. Extra columns never leak; nested UserOut is a second parse.",
          automatic: false,
        },
        {
          layer: "Identity map (opt-in)",
          what: "The Session identity map exists, but units of work are explicit: add, flush, commit. No after_save callbacks unless you write events.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails:
          "scopes, associations, and pagination gems let a controller stay five lines. Prototyping a CRUD resource is the framework's original pitch.",
        fastapi:
          "You declare table, schema, statement, and response model separately. The first list endpoint is slower to type, and harder to N+1 by accident.",
        winner: "rails",
      },
      control: {
        rails:
          "The Relation DSL hides joins until EXPLAIN. Callbacks and default scopes can change SQL without the caller noticing.",
        fastapi:
          "The statement is the query. You see every join, load option, and WHERE. The Session cannot persist unless you say so.",
        winner: "fastapi",
      },
      refactor: {
        rails:
          "Fat models accumulate callbacks. Moving logic out requires discipline the framework does not enforce. Schema changes ride migrations, which are excellent.",
        fastapi:
          "Table, domain, and HTTP schema are already split. Refactors touch one layer. The cost is keeping three representations in sync.",
        winner: "fastapi",
      },
      runtime: {
        rails:
          "ActiveRecord allocations and query cache are fine until they aren't. Identity map + callbacks add work on every save.",
        fastapi:
          "SQLAlchemy 2.0 + Pydantic v2 is typically leaner per request. You still pay for Session overhead if you forget to close.",
        winner: "fastapi",
      },
      verdict:
        "ActiveRecord wins the afternoon you are sketching a product. SQLAlchemy wins the quarter you are explaining a slow query to a teammate who did not write it. Dual-stack teams often keep Rails for admin/CRUD and FastAPI for read-heavy services — that split is the point of this lab.",
    },
  },
  {
    kind: "jobs",
    title: "Background Jobs",
    summary:
      "Rails folds jobs into the model lifecycle: after_create_commit enqueue. FastAPI treats the worker as another process you run, with its own DB session and an explicit enqueue after commit.",
    rails: {
      label: "ActiveJob · Sidekiq",
      philosophy: "Persist, then fan out — via callback",
      snippets: [
        {
          filename: "app/jobs/timeline_fanout_job.rb",
          language: "ruby",
          code: `class TimelineFanoutJob < ApplicationJob
  queue_as :fanout
  retry_on ActiveRecord::Deadlocked, wait: :polynomially_longer

  def perform(post_id)
    post = Post.find(post_id)
    post.author.followers.find_each do |follower|
      TimelineEntry.create!(user: follower, post: post)
    end
  end
end`,
        },
        {
          filename: "app/models/post.rb",
          language: "ruby",
          code: `class Post < ApplicationRecord
  after_create_commit -> { TimelineFanoutJob.perform_later(id) }
end`,
        },
      ],
      hood: [
        {
          layer: "after_create_commit",
          what: "Registered on the model. Fires only after the INSERT commits, so the worker never races a missing row.",
          automatic: true,
        },
        {
          layer: "ActiveJob adapter",
          what: "perform_later serializes arguments through ActiveJob. The Sidekiq adapter dumps JSON to Redis.",
          automatic: true,
        },
        {
          layer: "Sidekiq processor",
          what: "A separate process pops jobs, constantizes the class, and calls perform. Retries and the dead set are Sidekiq defaults.",
          automatic: true,
        },
        {
          layer: "AR connection in worker",
          what: "Each job checks out a connection from the pool and returns it. You rarely open or close it yourself.",
          automatic: true,
        },
        {
          layer: "GlobalID arguments",
          what: "Passing a model as an argument rehydrates via GlobalID. Passing an id (as here) is the safer habit.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "ARQ · Redis",
      philosophy: "Enqueue is a line of code you must remember",
      snippets: [
        {
          filename: "worker.py",
          language: "python",
          code: `async def fanout_timeline(ctx: dict, post_id: int) -> None:
    db = SessionLocal()
    try:
        post = db.get(Post, post_id)
        ids = db.scalars(
            select(Follow.follower_id).where(Follow.followee_id == post.author_id)
        ).all()
        db.add_all(TimelineEntry(user_id=fid, post_id=post.id) for fid in ids)
        db.commit()
    finally:
        db.close()

class WorkerSettings:
    functions = [fanout_timeline]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)`,
        },
        {
          filename: "routers/posts.py",
          language: "python",
          code: `@router.post("/posts", response_model=PostOut)
async def create_post(
    payload: PostIn,
    db: Annotated[Session, Depends(get_db)],
    redis: Annotated[ArqRedis, Depends(get_redis)],
):
    post = Post(**payload.model_dump(), author_id=user.id)
    db.add(post)
    db.commit()
    db.refresh(post)
    await redis.enqueue_job("fanout_timeline", post.id)
    return post`,
        },
      ],
      hood: [
        {
          layer: "Two processes",
          what: "Uvicorn serves HTTP. `arq worker.WorkerSettings` is a second OS process you must supervise. Nothing autostarts it.",
          automatic: false,
        },
        {
          layer: "Commit, then enqueue",
          what: "If you enqueue before commit, the worker can miss the row. There is no after_create_commit — the order is yours.",
          automatic: false,
        },
        {
          layer: "Fresh Session in the job",
          what: "The request Session cannot travel to the worker. Open, commit, close inside the job or you leak connections.",
          automatic: false,
        },
        {
          layer: "Function registry",
          what: "WorkerSettings.functions is the allow-list. A typo in the job name is a silent no-op until you look at Redis.",
          automatic: false,
        },
        {
          layer: "Retries",
          what: "ARQ retries are configured on the worker or per enqueue. Dead-letter is not a framework default — you add it.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails:
          "One callback and a Job class. Sidekiq web UI, retries, and cron-via-sidekiq-scheduler arrive with the ecosystem.",
        fastapi:
          "Worker module, process manager, Redis pool dependency, and a commit/enqueue protocol you document for the team.",
        winner: "rails",
      },
      control: {
        rails:
          "Callbacks make enqueue implicit. A save in a console, a test, or a nested create all fire the job unless you stub it.",
        fastapi:
          "The enqueue call is visible in the endpoint. Tests assert it. Quiet side effects do not hide on the model.",
        winner: "fastapi",
      },
      refactor: {
        rails:
          "Moving a job off a callback into a service is a style choice. GlobalID and ActiveJob adapters ease swapping backends.",
        fastapi:
          "Jobs are plain functions. Replacing ARQ with Celery or a queue class is a worker rewrite, not an adapter config.",
        winner: "tie",
      },
      runtime: {
        rails:
          "MRI + Sidekiq concurrency is process/thread bound. Sidekiq is extremely fast at Redis round-trips; AR object build dominates.",
        fastapi:
          "Async ARQ overlaps Redis IO. CPU-heavy fanout still wants a process pool. The win is IO, not magic throughput.",
        winner: "tie",
      },
      verdict:
        "Rails makes the happy path (create record → job) almost hard to forget, which is also how surprise jobs appear. FastAPI makes the happy path easy to forget, which is also how production stays boring once you add a checklist.",
    },
  },
  {
    kind: "rate-limit",
    title: "Rate Limiting",
    summary:
      "Rack::Attack is middleware Rails will autoload from an initializer and back with Rails.cache. FastAPI rate limits are a library you mount, a limiter you attach to Request, and a store you point at Redis yourself.",
    rails: {
      label: "Rack::Attack",
      philosophy: "Middleware in the Rack stack",
      snippets: [
        {
          filename: "config/initializers/rack_attack.rb",
          language: "ruby",
          code: `class Rack::Attack
  throttle("req/ip", limit: 300, period: 5.minutes, &:ip)

  throttle("logins/ip", limit: 5, period: 20.seconds) do |req|
    req.ip if req.path == "/session" && req.post?
  end

  throttle("logins/email", limit: 5, period: 60.seconds) do |req|
    if req.path == "/session" && req.post?
      req.params["email"].to_s.downcase.presence
    end
  end
end`,
        },
      ],
      hood: [
        {
          layer: "Initializer autoload",
          what: "config/initializers/*.rb runs at boot. Rack::Attack inserts itself into the middleware stack without you touching application.rb (the gem does).",
          automatic: true,
        },
        {
          layer: "Before the router",
          what: "Throttles run as Rack middleware — rejected requests never instantiate a controller or pay for allocations there.",
          automatic: true,
        },
        {
          layer: "Rails.cache counter",
          what: "Each throttle key INCR in cache. If cache is :memory_store, limits are per-process and wrong in production. Redis is the unspoken default.",
          automatic: true,
        },
        {
          layer: "429 + headers",
          what: "Rack::Attack emits 429 and Retry-After. You can customize the response block; the default is already sensible.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "SlowAPI · middleware",
      philosophy: "You mount it, or it does nothing",
      snippets: [
        {
          filename: "main.py",
          language: "python",
          code: `limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60/minute"],
    storage_uri=settings.redis_url,
)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@router.post("/token")
@limiter.limit("5/20seconds")
def login(request: Request, form: OAuth2PasswordRequestForm = Depends()):
    ...`,
        },
      ],
      hood: [
        {
          layer: "add_middleware",
          what: "ASGI middleware runs only if you add it. Forget SlowAPIMiddleware and @limiter.limit is decoration with no teeth.",
          automatic: false,
        },
        {
          layer: "Request must be in the signature",
          what: "SlowAPI looks up the limiter from request.app.state. An endpoint without Request: Request silently skips the limit.",
          automatic: false,
        },
        {
          layer: "storage_uri",
          what: "Default in-memory store is per-worker. You pass Redis. Shared limits across replicas are a config line you own.",
          automatic: false,
        },
        {
          layer: "Decorator vs default_limits",
          what: "Global defaults plus per-route overrides. The composition is explicit; there is no DSL that reads params[:email] unless you write a key_func.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails:
          "One initializer, idiomatic throttles on path and params, and it rides whatever you already use for cache.",
        fastapi:
          "Three wiring steps (state, middleware, handler) plus remembering Request in every limited signature.",
        winner: "rails",
      },
      control: {
        rails:
          "The DSL is request-in, key-out. Complex keys (user id from a JWT) require peeking into the env before Warden has run.",
        fastapi:
          "key_func is a Python function with the full Request. Extracting a user id from a JWT before the endpoint is ordinary code.",
        winner: "fastapi",
      },
      refactor: {
        rails:
          "Rules live in one file, which is good until that file is 400 lines of path strings. Extracting a policy object is on you.",
        fastapi:
          "Limits as decorators sit next to the route, which is good until the same policy is copied eight times. A shared dependency helps.",
        winner: "tie",
      },
      runtime: {
        rails:
          "Middleware before the app is the right place. Cost is a cache round-trip. MRI still pays the Rack env allocation.",
        fastapi:
          "Same Redis INCR idea. Starlette middleware is light. Mistakes (memory store, missing Request) fail open — worse than slow.",
        winner: "tie",
      },
      verdict:
        "Both are Redis counters in front of the app. Rails hides the mount and fails safer once cache is Redis. FastAPI makes the mount visible and fails open if you skip a step — the classic explicitness tax.",
    },
  },
  {
    kind: "api",
    title: "Microservice",
    summary:
      "A Rails controller is an object with an implicit request, params hash, and render. A FastAPI endpoint is a function with typed parameters; the framework parses, validates, and serializes around it.",
    rails: {
      label: "ActionController · routes.rb",
      philosophy: "params in, render out",
      snippets: [
        {
          filename: "config/routes.rb",
          language: "ruby",
          code: `Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :posts, only: %i[index show create]
    end
  end
end`,
        },
        {
          filename: "app/controllers/api/v1/posts_controller.rb",
          language: "ruby",
          code: `class Api::V1::PostsController < ApplicationController
  def create
    post = current_user.posts.build(post_params)
    if post.save
      render json: post, status: :created, serializer: PostSerializer
    else
      render json: { errors: post.errors }, status: :unprocessable_entity
    end
  end

  private
  def post_params
    params.require(:post).permit(:title, :body, :status)
  end
end`,
        },
      ],
      hood: [
        {
          layer: "Journey router",
          what: "routes.rb compiles to a recognizer. Missing routes are 404 before a controller is born. Route helpers are metaprogrammed constants.",
          automatic: true,
        },
        {
          layer: "strong parameters",
          what: "permit is a denylist against mass assignment. Forget a key and it vanishes silently from the model, not from the HTTP request.",
          automatic: true,
        },
        {
          layer: "Implicit render",
          what: "A missing render looks for a template. In API-only mode you must render json or you leak a missing-template error.",
          automatic: true,
        },
        {
          layer: "Serializers / jbuilder",
          what: "The JSON shape is a parallel object (AMS, Alba, Blueprinter). Nothing type-checks the response against a contract.",
          automatic: true,
        },
      ],
    },
    fastapi: {
      label: "APIRouter · Pydantic",
      philosophy: "The signature is the contract",
      snippets: [
        {
          filename: "routers/posts.py",
          language: "python",
          code: `class PostIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    body: str
    status: Literal["draft", "published"] = "draft"

class PostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    status: str
    author: UserOut

@router.post("/posts", response_model=PostOut, status_code=201)
def create_post(
    payload: PostIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    post = Post(**payload.model_dump(), author_id=user.id)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post`,
        },
      ],
      hood: [
        {
          layer: "Routing + OpenAPI",
          what: "Decorators register path operations. The same metadata becomes /docs. The contract is not a second artifact.",
          automatic: false,
        },
        {
          layer: "Pydantic parse",
          what: "Body, query, and path are coerced before the function runs. Constraint failures are 422 with a loc/msg payload.",
          automatic: false,
        },
        {
          layer: "response_model filter",
          what: "Returning an ORM instance is allowed; FastAPI dumps through PostOut and drops undeclared fields. Leaks are a missing annotation, not a default.",
          automatic: false,
        },
        {
          layer: "Depends graph",
          what: "Auth, DB, and pagination compose as parameters. The call graph is the architecture diagram of the request.",
          automatic: false,
        },
      ],
    },
    tradeoffs: {
      velocity: {
        rails:
          "scaffold and resources produce a working CRUD surface immediately. params.require is one line vs a schema class.",
        fastapi:
          "You write In and Out models first. The first endpoint is slower; the generated OpenAPI client is free.",
        winner: "rails",
      },
      control: {
        rails:
          "The JSON contract is whatever you render. Two serializers for the same model drift. There is no compiler in the way.",
        fastapi:
          "The signature forbids undeclared fields. Status codes, tags, and examples are first-class. Hidden params do not exist.",
        winner: "fastapi",
      },
      refactor: {
        rails:
          "Moving off a fat controller into a service is cultural. The params hash remains untyped unless you add a gem.",
        fastapi:
          "Renaming a field updates the schema, the docs, and the 422. Downstream clients notice at generate time.",
        winner: "fastapi",
      },
      runtime: {
        rails:
          "Object allocation per controller, renderer, and serializer. Fast enough; JSON gems (oj) are the usual lever.",
        fastapi:
          "Pydantic v2 is rust-backed validation. For request-bound APIs this is often the faster path at equal business logic.",
        winner: "fastapi",
      },
      verdict:
        "Rails APIs are controllers that happen to render JSON. FastAPI APIs are functions that happen to speak HTTP. If the product is a public contract, the function-as-schema style pays rent every time a field changes.",
    },
  },
];
