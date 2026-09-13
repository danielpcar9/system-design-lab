import type { LessonEs } from "./lessons-types";

export const LESSONS_ES_CORE: Record<string, LessonEs> = {
  auth: {
    title: "Autenticación",
    summary:
      "Rails te inicia sesión con una cookie session cableada por Warden y un puñado de callbacks. FastAPI emite un JWT que armas tú: hash, encode, decode, e inyectas el current user como dependency.",
    railsPhil: "Convention over Configuration",
    fastPhil: "Explicit is better than implicit",
    railsHood: {
      "Puma → Rack":
        "El request entra a Puma y recorre el stack default de Rack middleware antes de que corra tu controller.",
      "ActionDispatch::Session":
        "CookieStore cifra session[:user_id] con secret_key_base. Nunca tocas el serializer.",
      "CSRF / protect_from_forgery":
        "ActionController::Base verifica authenticity_token en no-GET. Las APIs deben hacer opt-out de forma explícita.",
      has_secure_password:
        "ActiveModel mezcla authenticate / password= y hashea BCrypt en password_digest vía un before_save.",
      current_user:
        "Un before_action memoriza User.find_by(id: session[:user_id]). Current.user thread-local es el idioma de Rails 8.",
    },
    fastHood: {
      "Uvicorn → ASGI":
        "El request es un dict de scope ASGI. Lifespan (startup/shutdown) es una coroutine que registras, no un boot oculto.",
      OAuth2PasswordBearer:
        "Busca Authorization: Bearer. Header ausente → 401. Tú elegiste este esquema; nada es session-based a menos que lo añadas.",
      "Pydantic Token / User":
        "Request y response bodies se parsean y se coaccionan antes del endpoint. Una shape inválida nunca llega a tu función.",
      "passlib + python-jose":
        "Tú hasheas, verificas, encodes y decodes. Expiry, audience y rotación son tu código, no un mixin.",
      "Depends(get_current_user)":
        "El grafo de DI corre per-request. Nested Depends(get_db) abre una Session que debes cerrar en un finally / yield.",
    },
    velocity: {
      rails:
        "Una cookie session y has_secure_password entregan un login que funciona en una tarde, incluyendo CSRF y tokens de reset.",
      fastapi:
        "Cableas hashing, claims JWT, esquema OAuth2 y una dependency antes del primer 200. Más archivos, menos sorpresas después.",
    },
    control: {
      rails:
        "Cookie sessions y Warden esconden el wire format. Customizar una API solo JWT significa pelear con los defaults.",
      fastapi:
        "Cada claim, header y status code está en tu repo. Rotación de tokens y APIs multi-audience se quedan obvias.",
    },
    refactor: {
      rails:
        "before_action y Current.user dispersan contexto implícito. Extraer un service object es opcional, así que a menudo nunca pasa.",
      fastapi:
        "Las dependencies son funciones. Cambiar cookie sessions por JWT es un Depends nuevo, no una conversión del framework.",
    },
    runtime: {
      rails:
        "Cookies cifradas y un User.find en cada request. Bien a escala de app; añades Redis sessions cuando no lo es.",
      fastapi:
        "JWT stateless se salta un hit a DB si confías en la signature. La revocación se vuelve una denylist explícita que debes diseñar.",
    },
    verdict:
      "Elige Rails cuando el producto es una web app con cookie-session y quieres el checklist de seguridad ya lleno. Elige FastAPI cuando la historia de auth son tokens, múltiples clients, o necesitas que el request path sea revisable línea a línea.",
  },
  database: {
    title: "Consultas a la base de datos",
    summary:
      "ActiveRecord es un Active Record con identity-map: los modelos son filas, las associations son métodos, los callbacks disparan alrededor de la persistencia. SQLAlchemy 2.0 es un Data Mapper: escribes statements, mapeas filas a objetos y eres dueño de la Session.",
    railsPhil: "El modelo es la fila",
    fastPhil: "El modelo es un mapping",
    railsHood: {
      "Query construction":
        "Cada scope devuelve una Relation lazy. El SQL se compone cuando iteras, no cuando encadenas.",
      "Identity map":
        "Dentro de un request, Post.find(1) dos veces devuelve el mismo objeto. El dirty tracking vive en esa instancia.",
      "includes / preloader":
        "El N+1 se tapa con una segunda query (o LEFT OUTER JOIN). Opt-in; nada error si olvidas.",
      Callbacks:
        "after_create_commit corre después de que el transaction hace commit — los jobs ven la fila. before_save puede mutar attributes en silencio.",
      "Schema & naming":
        "Tabla posts, foreign key author_id e inverse associations se infieren de los class names a menos que overrides.",
    },
    fastHood: {
      "Session lifecycle":
        "get_db yield una Session bound a este request. Commit, rollback y close son tu finally-block, no un after_filter del framework.",
      "select() is SQL":
        "Nada consulta hasta Session.execute. No hay un método implícito `posts` colgando de User.",
      selectinload:
        "Nombres cada eager load. Si olvidas, obtienes lazy IO en una session detached — o un error explícito con expire_on_commit.",
      "Pydantic from_attributes":
        "Las instancias ORM se proyectan a PostOut. Columnas extra nunca se filtran; UserOut anidado es un segundo parse.",
      "Identity map (opt-in)":
        "El identity map de Session existe, pero las units of work son explícitas: add, flush, commit. No hay callbacks after_save a menos que escribas events.",
    },
    velocity: {
      rails:
        "scopes, associations y gems de pagination dejan al controller en cinco líneas. Prototipar un recurso CRUD es el pitch original del framework.",
      fastapi:
        "Declaras table, schema, statement y response model por separado. El primer list endpoint tarda más en tipearse, y es más difícil N+1 por accidente.",
    },
    control: {
      rails:
        "El DSL de Relation esconde joins hasta EXPLAIN. Callbacks y default scopes pueden cambiar el SQL sin que el caller se entere.",
      fastapi:
        "El statement es la query. Ves cada join, load option y WHERE. La Session no puede persistir a menos que lo digas.",
    },
    refactor: {
      rails:
        "Los fat models acumulan callbacks. Mover lógica exige disciplina que el framework no impone. Los cambios de schema van en migrations, que son excelentes.",
      fastapi:
        "Table, domain y HTTP schema ya están partidos. Los refactors tocan una capa. El costo es mantener tres representaciones en sync.",
    },
    runtime: {
      rails:
        "Las allocations de ActiveRecord y el query cache están bien hasta que no. Identity map + callbacks añaden trabajo en cada save.",
      fastapi:
        "SQLAlchemy 2.0 + Pydantic v2 suele ser más magro per request. Igual pagas overhead de Session si olvidas cerrar.",
    },
    verdict:
      "ActiveRecord gana la tarde en que esbozas un producto. SQLAlchemy gana el trimestre en que explicas una query lenta a un teammate que no la escribió. Los equipos dual-stack suelen dejar Rails para admin/CRUD y FastAPI para servicios read-heavy — esa división es el punto de este lab.",
  },
  jobs: {
    title: "Background Jobs",
    summary:
      "Rails dobla los jobs al lifecycle del modelo: after_create_commit enqueue. FastAPI trata al worker como otro proceso que corres, con su propia DB session y un enqueue explícito después del commit.",
    railsPhil: "Persist, then fan out — vía callback",
    fastPhil: "Enqueue es una línea que debes recordar",
    railsHood: {
      after_create_commit:
        "Registrado en el modelo. Dispara solo después de que el INSERT hace commit, así el worker nunca racea una fila ausente.",
      "ActiveJob adapter":
        "perform_later serializa argumentos por ActiveJob. El adapter de Sidekiq tira JSON a Redis.",
      "Sidekiq processor":
        "Un proceso aparte hace pop de jobs, constantiza la class y llama perform. Retries y dead set son defaults de Sidekiq.",
      "AR connection in worker":
        "Cada job saca una connection del pool y la devuelve. Rara vez la abres o cierras tú.",
      "GlobalID arguments":
        "Pasar un modelo como argumento rehidrata vía GlobalID. Pasar un id (como aquí) es el hábito más seguro.",
    },
    fastHood: {
      "Two processes":
        "Uvicorn sirve HTTP. `arq worker.WorkerSettings` es un segundo proceso OS que debes supervisar. Nada lo autoarranca.",
      "Commit, then enqueue":
        "Si encolas antes del commit, el worker puede perder la fila. No hay after_create_commit — el orden es tuyo.",
      "Fresh Session in the job":
        "La Session del request no puede viajar al worker. Open, commit, close dentro del job o filtras connections.",
      "Function registry":
        "WorkerSettings.functions es el allow-list. Un typo en el nombre del job es un no-op silencioso hasta que miras Redis.",
      Retries:
        "Los retries de ARQ se configuran en el worker o per enqueue. Dead-letter no es default del framework — lo añades.",
    },
    velocity: {
      rails:
        "Un callback y una class Job. Sidekiq web UI, retries y cron-vía-sidekiq-scheduler llegan con el ecosistema.",
      fastapi:
        "Módulo worker, process manager, dependency de pool Redis y un protocolo commit/enqueue que documentas para el equipo.",
    },
    control: {
      rails:
        "Los callbacks hacen el enqueue implícito. Un save en consola, un test o un create anidado disparan el job a menos que lo stubbees.",
      fastapi:
        "La llamada enqueue es visible en el endpoint. Los tests la asertan. Los side effects silenciosos no se esconden en el modelo.",
    },
    refactor: {
      rails:
        "Mover un job de un callback a un service es una elección de estilo. GlobalID y adapters de ActiveJob facilitan cambiar backends.",
      fastapi:
        "Los jobs son funciones planas. Reemplazar ARQ con Celery o una class queue es un rewrite del worker, no un config de adapter.",
    },
    runtime: {
      rails:
        "La concurrencia MRI + Sidekiq está acotada por process/thread. Sidekiq es extremadamente rápido en round-trips Redis; el build de objetos AR domina.",
      fastapi:
        "ARQ async solapa IO de Redis. Fan-out CPU-heavy igual quiere un process pool. La victoria es IO, no throughput mágico.",
    },
    verdict:
      "Rails hace el happy path (crear record → job) casi imposible de olvidar, que es también cómo aparecen jobs sorpresa. FastAPI hace el happy path fácil de olvidar, que es también cómo producción se queda aburrida una vez que añades un checklist.",
  },
  "rate-limit": {
    title: "Rate Limiting",
    summary:
      "Rack::Attack es middleware que Rails autoloadea desde un initializer y respalda con Rails.cache. Los rate limits de FastAPI son una librería que montas, un limiter que pegas a Request y un store que apuntas a Redis tú mismo.",
    railsPhil: "Middleware en el stack Rack",
    fastPhil: "Lo montas, o no hace nada",
    railsHood: {
      "Initializer autoload":
        "config/initializers/*.rb corre al boot. Rack::Attack se inserta en el stack de middleware sin que toques application.rb (lo hace el gem).",
      "Before the router":
        "Los throttles corren como Rack middleware — los requests rechazados nunca instancian un controller ni pagan allocations ahí.",
      "Rails.cache counter":
        "Cada throttle key hace INCR en cache. Si el cache es :memory_store, los límites son per-process y están mal en producción. Redis es el default no dicho.",
      "429 + headers":
        "Rack::Attack emite 429 y Retry-After. Puedes customizar el response block; el default ya es razonable.",
    },
    fastHood: {
      add_middleware:
        "El middleware ASGI solo corre si lo añades. Olvida SlowAPIMiddleware y @limiter.limit es decoración sin dientes.",
      "Request must be in the signature":
        "SlowAPI busca el limiter en request.app.state. Un endpoint sin Request: Request se salta el límite en silencio.",
      storage_uri:
        "El store in-memory default es per-worker. Pasas Redis. Límites compartidos entre réplicas son una línea de config tuya.",
      "Decorator vs default_limits":
        "Defaults globales más overrides per-route. La composición es explícita; no hay DSL que lea params[:email] a menos que escribas un key_func.",
    },
    velocity: {
      rails:
        "Un initializer, throttles idiomáticos en path y params, y viaja sobre lo que ya usas para cache.",
      fastapi:
        "Tres pasos de cableado (state, middleware, handler) más recordar Request en cada signature limitada.",
    },
    control: {
      rails:
        "El DSL es request-in, key-out. Keys complejas (user id de un JWT) requieren mirar el env antes de que Warden haya corrido.",
      fastapi:
        "key_func es una función Python con el Request completo. Extraer un user id de un JWT antes del endpoint es código ordinario.",
    },
    refactor: {
      rails:
        "Las reglas viven en un archivo, lo cual es bueno hasta que ese archivo tiene 400 líneas de path strings. Extraer un policy object depende de ti.",
      fastapi:
        "Los límites como decorators se sientan junto a la route, lo cual es bueno hasta que la misma policy se copia ocho veces. Una dependency compartida ayuda.",
    },
    runtime: {
      rails:
        "Middleware antes de la app es el lugar correcto. El costo es un round-trip de cache. MRI igual paga la allocation del env Rack.",
      fastapi:
        "La misma idea de Redis INCR. El middleware Starlette es ligero. Los errores (memory store, Request ausente) fallan abiertos — peor que lento.",
    },
    verdict:
      "Ambos son counters Redis delante de la app. Rails esconde el mount y falla más seguro una vez que el cache es Redis. FastAPI hace visible el mount y falla abierto si te saltas un paso — el clásico impuesto de la explicitud.",
  },
  api: {
    title: "Microservicio",
    summary:
      "Un controller Rails es un objeto con request implícito, params hash y render. Un endpoint FastAPI es una función con parámetros tipados; el framework parsea, valida y serializa alrededor.",
    railsPhil: "params in, render out",
    fastPhil: "La signature es el contrato",
    railsHood: {
      "Journey router":
        "routes.rb compila a un recognizer. Routes faltantes son 404 antes de que nazca un controller. Los route helpers son constants metaprogramadas.",
      "strong parameters":
        "permit es un denylist contra mass assignment. Olvida una key y desaparece en silencio del modelo, no del HTTP request.",
      "Implicit render":
        "Un render faltante busca un template. En modo API-only debes render json o filtras un error de missing-template.",
      "Serializers / jbuilder":
        "La shape JSON es un objeto paralelo (AMS, Alba, Blueprinter). Nada type-checkea la response contra un contrato.",
    },
    fastHood: {
      "Routing + OpenAPI":
        "Los decorators registran path operations. La misma metadata se vuelve /docs. El contrato no es un segundo artefacto.",
      "Pydantic parse":
        "Body, query y path se coaccionan antes de que corra la función. Fallos de constraint son 422 con payload loc/msg.",
      "response_model filter":
        "Devolver una instancia ORM está permitido; FastAPI dump a través de PostOut y tira fields no declarados. Los leaks son una annotation faltante, no un default.",
      "Depends graph":
        "Auth, DB y pagination se componen como parámetros. El call graph es el diagrama de arquitectura del request.",
    },
    velocity: {
      rails:
        "scaffold y resources producen una superficie CRUD que funciona de inmediato. params.require es una línea vs una class schema.",
      fastapi:
        "Escribes modelos In y Out primero. El primer endpoint es más lento; el client OpenAPI generado es gratis.",
    },
    control: {
      rails:
        "El contrato JSON es lo que renderizas. Dos serializers para el mismo modelo divergen. No hay compiler en el camino.",
      fastapi:
        "La signature prohíbe fields no declarados. Status codes, tags y examples son first-class. Hidden params no existen.",
    },
    refactor: {
      rails:
        "Salir de un fat controller hacia un service es cultural. El params hash sigue untyped a menos que añadas un gem.",
      fastapi:
        "Renombrar un field actualiza el schema, los docs y el 422. Los clients downstream se enteran en generate time.",
    },
    runtime: {
      rails:
        "Allocation de objetos por controller, renderer y serializer. Suficientemente rápido; gems JSON (oj) son la palanca habitual.",
      fastapi:
        "Pydantic v2 es validación backed por rust. Para APIs acotadas al request este suele ser el path más rápido a igual lógica de negocio.",
    },
    verdict:
      "Las APIs Rails son controllers que resultan renderizar JSON. Las APIs FastAPI son funciones que resultan hablar HTTP. Si el producto es un contrato público, el estilo function-as-schema paga renta cada vez que un field cambia.",
  },
};
