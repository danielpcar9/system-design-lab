import type { LessonEs } from "./lessons-types";

export const LESSONS_ES_MORE: Record<string, LessonEs> = {
  cache: {
    title: "Caching",
    summary:
      "Rails.cache es una fachada sobre Memory/Redis/Memcached con fetch, increment y keys Russian-doll derivadas de record.cache_key_with_version. FastAPI habla con Redis como un client que inyectas — no hay cache global ni key automática desde un modelo.",
    railsPhil: "fetch or compute",
    fastPhil: "GET, SET, DELETE — tú",
    railsHood: {
      "ActiveSupport::Cache":
        "Rails.cache es un store process-wide. fetch hace GET, luego SET si miss, con race_condition_ttl para evitar dogpiles.",
      cache_key_with_version:
        "Los records aportan id más updated_at. El caching Russian-doll en views expira cuando cambia la fila, sin que nombres la key.",
      "after_commit bust":
        "Si ruedas tus propias keys (como aquí), debes borrarlas. El callback es el hook habitual; olvídalo y sirves ghosts.",
      "Marshal vs JSON":
        "El store Redis tira objetos Ruby con Marshal por default. Deployea un cambio de class y los valores viejos raise. coder: JSON es el setting adulto.",
    },
    fastHood: {
      "Injected client":
        "Un pool de connections Redis vive en app.state, yielded por Depends. No hay singleton Rails.cache.",
      "You pick the codec":
        "Pydantic dump_json es un contrato. Nada de Marshal, nada de class load sorpresa tras un deploy — a menos que pickle, que no deberías.",
      "Miss path is SQL":
        "La función es la policy: TTL, 404, stampede. Un lock (SET NX) es código extra, no una opción de fetch.",
      "Bust on write":
        "El endpoint de update debe llamar bust. Nada en SQLAlchemy lo hará. Es el mismo footgun que Rails, sin un callback que lo esconda.",
    },
    velocity: {
      rails:
        "Rails.cache.fetch más cache_key hace del caching de views y records un one-liner. Apps de bajo tráfico nunca piensan en Redis.",
      fastapi:
        "Escribes get/set/delete y un esquema de keys. El primer cache son veinte líneas y una dependency.",
    },
    control: {
      rails:
        "Store global + Marshal + keys implícitas es conveniente y a veces maldito. Named keys (como en el snippet) son la escape hatch.",
      fastapi:
        "Keys, TTL y codec son locales. Dos servicios no pueden colisionar a menos que compartan un prefix que diseñaste.",
    },
    refactor: {
      rails:
        "Las keys Russian-doll acoplan el cache a updated_at. Tocar un record desde un callback bustea más de lo que querías.",
      fastapi:
        "Una key function es fácil de grep. Cambiar un prefix es una constant. Ninguna capa de views inventará keys a tus espaldas.",
    },
    runtime: {
      rails:
        "redis-rb más Marshal. Bien. El asesino silencioso es MemoryStore en producción o una connection global sin pool.",
      fastapi:
        "redis.asyncio se solapa bien con ASGI. Pipeline/MGET son awaits ordinarios. El mismo Redis, menos framework alrededor.",
    },
    verdict:
      "Usa Rails.cache cuando las keys deban seguir records y views. Usa un client Redis explícito cuando el cache es un artefacto de system design — hot keys de redirect, denylist de session, counters de rate — y quieres que se vea así en el code review.",
  },
  authorization: {
    title: "Autorización",
    summary:
      "Pundit (o Action Policy) esconde el lookup de policy detrás de authorize @post. La autorización FastAPI es una dependency que recibe el current user y el recurso, o un check que escribes en el endpoint — nada se carga por class name.",
    railsPhil: "policy class por modelo",
    fastPhil: "Una función que puede raise 403",
    railsHood: {
      "infer the policy":
        "authorize @post constantiza PostPolicy desde el class name. Namespaces y STI necesitan overrides o carga la class incorrecta.",
      "Pundit::NotAuthorizedError":
        "Un rescue_from en ApplicationController lo convierte en 403. Nunca ves el raise si el handler está en su sitio.",
      policy_scope:
        "Las queries de index se scopean en Ruby y luego se vuelven SQL. Olvida policy_scope y filtras filas — el show estaba autorizado, la lista no.",
      "headless policies":
        "Para actions sin modelo pasas un symbol. La magia es más delgada; la mayoría de apps lo subusan y meten lógica en el policy del modelo.",
    },
    fastHood: {
      "Depends(require_post)":
        "El recurso se carga y se autoriza antes del endpoint. La función nunca recibe un Post prohibido.",
      "No class inference":
        "Importas can_read. No hay autoload de PostPolicy. Renombra el modelo y el compiler te avisa, no un NameError en request time.",
      "Query-level authz":
        "Los list endpoints añaden WHERE en el select(). No hay policy_scope — filtrar una query sin filtro es un where() omitido, grepeable.",
      "403 vs 404":
        "Tú eliges. Devolver 404 para ids prohibidos es un cambio de una línea, no un config de Pundit. Sé consistente a propósito.",
    },
    velocity: {
      rails:
        "Un generator y authorize @record cubren el caso común. policy_scope mantiene cortas las actions de index.",
      fastapi:
        "Escribes una loader dependency por recurso. El copy-paste es el riesgo; un módulo authz pequeño es la cura.",
    },
    control: {
      rails:
        "Nombres de policy metaprogramados y un rescue_from global hacen el path 403 difícil de ver en la action.",
      fastapi:
        "El 403 es un raise junto al predicado. Los reviewers leen la regla sin abrir una class paralela.",
    },
    refactor: {
      rails:
        "Los policies se agrupan por modelo, lo que encaja con CRUD. Reglas cross-resource (¿puede este admin de billing de org…?) pelean con la convención.",
      fastapi:
        "Los predicados se componen. Un can_read usado por HTTP, jobs y GraphQL es solo una función. No hay inferencer que contentar.",
    },
    runtime: {
      rails:
        "Un objeto extra por authorize. Despreciable junto a la query. La calidad SQL de policy_scope depende de cómo escribiste resolve.",
      fastapi:
        "Una llamada a función y una query. El mismo orden de magnitud. La diferencia nunca es el 403; es si la query de lista estaba filtrada.",
    },
    verdict:
      "Pundit es una convención de nombres que mantiene honesto el CRUD. La autorización FastAPI es software que puedes llamar desde cualquier lado. Si tus reglas tienen forma de recurso, Rails es más rápido. Si tienen forma de capability, escribe funciones.",
  },
  websocket: {
    title: "WebSockets",
    summary:
      "ActionCable esconde el socket detrás de channels, subscriptions y un adapter Redis pub/sub. FastAPI te da un objeto WebSocket y un loop — fan-out, presence y auth son tuyos.",
    railsPhil: "Channel classes y broadcast",
    fastPhil: "accept, loop, close",
    railsHood: {
      "cable.js + /cable":
        "El client abre un socket al endpoint montado. Connection#connect identifica current_user desde la session cookie o un signed token.",
      "Redis pub/sub adapter":
        "broadcast_to publica en un stream name. Cada worker Puma/Cable suscrito a ese stream despierta. Tú no gestionas la lista de fan-out.",
      stream_for:
        "Los sockets suscritos se registran en memoria del proceso más Redis. Un reject tira la subscription sin exception en el client por default.",
      "after_create_commit broadcast":
        "HTTP create y el channel hablan; ambos persisten un Message; el callback hace fan-out. Dos writers, un pipe — convención haciendo trabajo real.",
    },
    fastHood: {
      "ASGI websocket scope":
        "Starlette acepta el upgrade. Debes llamar accept() o el client se cuelga. Auth vía query token — las cookies son incómodas cross-origin.",
      "Two tasks":
        "Mensajes inbound y pub/sub outbound son concurrentes. Cancelas al sibling en la primera completion. Olvídalo y filtras tasks.",
      "broker.subscribe":
        "Tu wrapper Redis/NATS. No hay stream_for. Presence (quién está en la sala) es un SET que mantienes en connect/disconnect.",
      "HTTP and WS diverge":
        "Un REST create_message debe publicar al mismo canal broker que lee el socket. Ningún callback los pega a menos que lo escribas.",
    },
    velocity: {
      rails:
        "Un channel, un broadcast y un consumer Hotwire/JS. Presence e indicadores de typing aún toman trabajo, pero el socket en sí es gratis.",
      fastapi:
        "El tutorial echo es corto; una sala de producción (auth, fan-out, reconnect, backpressure) es un servicio.",
    },
    control: {
      rails:
        "El adapter y los stream names tienen forma de framework. Protocolos custom pelean con Channel#receive. Scale horizontal es 'corre AnyCable'.",
      fastapi:
        "El loop es tuyo. Binary frames, backpressure y un broker custom son ordinarios. También eres dueño de cada bug de disconnect.",
    },
    refactor: {
      rails:
        "Lógica en channels más callbacks del modelo parte la historia. Extraer un service Broadcaster es, otra vez, cultural.",
      fastapi:
        "Un módulo broker es el seam. HTTP y WS ya lo comparten si empezaste así. Si no, no hay callback del que migrar.",
    },
    runtime: {
      rails:
        "MRI + ActionCable sufre a decenas de miles de sockets. AnyCable (Go) es el runtime real; Rails se vuelve el publisher.",
      fastapi:
        "asyncio + Uvicorn maneja bien muchos sockets idle. Payloads CPU-heavy igual necesitan un plan de procesos. Async honesto gana aquí.",
    },
    verdict:
      "ActionCable es el path más rápido a 'hace broadcast'. FastAPI es el path más rápido a 'entiendo el socket'. A concurrencia seria ambos terminan con una capa realtime dedicada — AnyCable o un broker junto a Uvicorn.",
  },
  files: {
    title: "Blob Storage",
    summary:
      "ActiveStorage te da has_one_attached, direct uploads y variant processing con casi nada de código. FastAPI recibe UploadFile, streamea a S3 con un client que configuras y registra la key en una columna que añadiste.",
    railsPhil: "has_one_attached :photo",
    fastPhil: "Streamea los bytes tú mismo",
    railsHood: {
      "Two tables":
        "active_storage_blobs y attachments se crean con una migration que corres una vez. La fila del listing nunca guarda el archivo.",
      "Direct upload":
        "La librería JS pide a la app una signed URL, hace PUT a S3 y luego postea el blob id. Rails nunca ve los bytes en el path grande.",
      Variants:
        "cover.variant(:card) es una transformación nombrada. El primer request procesa (Vips/ImageMagick) y guarda un blob derivado.",
      "Purge later":
        "Reemplazar un attachment encola un purge job. Los blobs huérfanos son un concern de background, no de tu controller.",
    },
    fastHood: {
      "Spooled UploadFile":
        "Starlette spool a un NamedTemporaryFile al pasar un umbral de tamaño. await file.read() igual lo carga — streamea con read(chunk) para objetos grandes.",
      "S3 client":
        "aioboto3 o un POST pre-signed que generas. Direct-to-bucket son endpoints extra (sign, complete), no un default de librería.",
      "A column you own":
        "cover_key es un string. No hay tabla attachments a menos que la construyas. Borrar el listing no borra el objeto.",
      Variants:
        "Los thumbnails son un worker (Pillow, libvips) que corres en upload o en el primer read. Nada llamado :card existe hasta que lo inventas.",
    },
    velocity: {
      rails:
        "has_one_attached es toda la feature para muchos productos. Direct uploads y variants ya están diseñados.",
      fastapi:
        "Sign, PUT, record, delete y thumbnail son cuatro historias. Bien si los files son un side path; doloroso si son el producto.",
    },
    control: {
      rails:
        "El modelo blob y las signed URLs son framework. ACL custom, cifrado o un vendor no-S3 significa pelear con ActiveStorage::Service.",
      fastapi:
        "La object key, ACL y metadata son argumentos. Multi-cloud es un swap de client. Reinventarás purge.",
    },
    refactor: {
      rails:
        "Salir de ActiveStorage es una data migration de blobs/attachments. Quedarse es barato. A medias es miseria.",
      fastapi:
        "Una class de storage service es un seam normal. Cambiar el layout de keys es un rewrite de strings, no de framework.",
    },
    runtime: {
      rails:
        "Variants on-the-fly pueden trabar un web worker. El fix es un job, que Rails encolará si usas .processed con cuidado.",
      fastapi:
        "await file.read() en un upload de 200MB es el autogol. Streaming + PUT pre-signed es tan rápido como cualquier cosa que haga Rails.",
    },
    verdict:
      "Si los uploads son una superficie de producto, ActiveStorage es una de las killer features que le quedan a Rails. Si los uploads son una signed URL a un bucket que ya corres, FastAPI se quita del camino — que es el mejor tipo de nada.",
  },
  search: {
    title: "Search",
    summary:
      "Rails suele empezar con pg_search o un gem que sincroniza a OpenSearch vía callbacks. FastAPI habla con el search engine como un client en write y en query — el índice es otro datastore, no una feature de ActiveRecord.",
    railsPhil: "Un scope que resulta rankear",
    fastPhil: "Un segundo write",
    railsHood: {
      tsvector:
        "pg_search emite una query full-text. Una generated column + índice GIN (o el extra de pg_search) es la forma de producción; el gem no grita si te lo saltas.",
      "Reindex job":
        "Si superas Postgres, un callback encola un rebuild del documento. El HTTP request no espera a OpenSearch.",
      "The model is the document":
        "as_indexed_json es un método del record. Cambiar la shape del documento es un cambio de modelo más un rake task de reindex.",
    },
    fastHood: {
      "Dual write":
        "Después del commit indexas. El fallo significa que Postgres y search divergen hasta un repair job. No hay callback que olvidar — igual puedes olvidar el await.",
      "Document schema":
        "ListingDoc es un modelo Pydantic. Se le permite diferir de Listing. Ese es el punto de un search document.",
      "IDs then hydrate":
        "Search devuelve ids; SQLAlchemy carga filas. El orden de ranking se reaplica en Python. Ves el join entre dos stores.",
    },
    velocity: {
      rails:
        "pg_search en un par de columnas es un sábado. Suficiente para muchos SaaS sin un segundo cluster.",
      fastapi:
        "Una query OpenSearch que funciona no es difícil; mantenerla en sync con writes es el proyecto de verdad.",
    },
    control: {
      rails:
        "Cuando sí añades OpenSearch, los callbacks del gem pueden esconder cambios de mapping hasta que una query se rompe.",
      fastapi:
        "El mapping y el query body están en el repo. El trabajo de relevance se ve como trabajo de relevance.",
    },
    refactor: {
      rails: "De pg_search a Searchkick es un rewrite del modelo. La capa HTTP apenas se mueve.",
      fastapi:
        "El search service ya es un módulo. Cambiar a Meilisearch es un client y un dump de documentos.",
    },
    runtime: {
      rails:
        "Postgres FTS es operacionalmente barato y CPU-bound en corpora grandes. El acantilado es real, la historia de ops es simple.",
      fastapi:
        "Un engine dedicado escala mejor la relevance y cuesta un cluster. Hidratar desde Postgres después de search es un round-trip extra que elegiste.",
    },
    verdict:
      "Quédate en Postgres FTS mientras sea honesto. Cuando te vas, el modelo 'segundo write' de FastAPI es el que querías desde el principio — Rails puede hacerlo, solo que no se ve así en el tutorial.",
  },
  "load-balancer": {
    title: "Load Balancer",
    summary:
      "El balancer es metal agnóstico al stack. Lo que cambia es lo que pones detrás: procesos Puma clustered con sticky sessions opcionales para ActionCable, versus workers Uvicorn que se quedan stateless si te apegaste a JWT.",
    railsPhil: "Processes + threads, sticky si debes",
    fastPhil: "Procesos stateless, share nothing",
    railsHood: {
      "Cluster mode":
        "preload_app! hace fork de workers. Las connections deben restablecerse al boot o los children comparten sockets y corrompen tráfico.",
      "Sticky sessions":
        "Cookie sessions sobreviven cualquier worker. ActionCable in-process no — el LB debe pinear sockets o corres un cable host dedicado.",
      Health:
        "Un endpoint /up (Rails 8) es el probe. El LB no sabe de jobs ni del Redis que también necesitas.",
    },
    fastHood: {
      "One loop per worker":
        "Los workers Uvicorn no comparten memoria. Un dict a nivel de módulo 'para presence' es una mentira per-process. Redis es la verdad compartida.",
      "JWT is LB-friendly":
        "Sin sticky sessions para auth. Los WebSockets igual necesitan pinning o un broker. La misma decisión de topología que Cable, sin una cookie que lo esconda.",
      Health:
        "Escribes /health. Incluye un ping a Postgres y Redis si quieres que el LB te saque cuando una dependencia muere.",
    },
    velocity: {
      rails: "El config default de Puma más /up ya tiene forma de producción out of the box.",
      fastapi:
        "Eliges gunicorn vs uvicorn, número de workers y una health route. Corto, pero no defaulted.",
    },
    control: {
      rails:
        "La mezcla thread + process es especialidad de Puma. Mal setear RAILS_MAX_THREADS vs DB pool y haces deadlock.",
      fastapi:
        "La matemática de workers es processes × event loop. Los deadlocks son más raros; los globals compartidos accidentales son el footgun.",
    },
    refactor: {
      rails:
        "Mover Cable fuera del web process es el paso de scale habitual. El resto de la app no se entera.",
      fastapi:
        "Mover sockets fuera de Uvicorn es el mismo paso. Como el fan-out ya era un broker, el movimiento es más pequeño.",
    },
    runtime: {
      rails:
        "El throughput MRI está acotado por procesos. Los threads de Puma ayudan al IO. Endpoints CPU-heavy necesitan más workers, más RAM.",
      fastapi:
        "Async IO brilla con mucha espera. Loops de CPU apretados bloquean el event loop — córrelos en un threadpool u otro servicio.",
    },
    verdict:
      "El Load Balancer no le importa tu lenguaje. Le importa si guardaste algo en memoria del proceso. Las cookies de Rails son portables; los sockets de Rails no. Los JWT de FastAPI son portables; los module globals de FastAPI no.",
  },
  cdn: {
    title: "CDN",
    summary:
      "El edge cache se sienta delante de ambos stacks. Rails fingerprinta assets con Propshaft/Sprockets. FastAPI o sirve static files hasheados o, más a menudo, no los sirve en absoluto — la SPA ya está en el CDN.",
    railsPhil: "URLs fingerprinted desde la app",
    fastPhil: "Normalmente la SPA no está en este proceso",
    railsHood: {
      "Digest in the filename":
        "application-abc123.css. El CDN puede cachear para siempre porque el siguiente deploy es una URL nueva. Los helpers de Rails emiten el digest.",
      asset_host:
        "image_tag y stylesheet_link_tag prefixean el CDN. No reescribes URLs a mano.",
    },
    fastHood: {
      "Mount is optional":
        "Las APIs a menudo sirven cero bytes de CSS. El origin del CDN es object storage o un host frontend, no Uvicorn.",
      Headers:
        "Pones Cache-Control en las responses que quieres cached (un GET público de metadata de un short link, quizá). Nada infiere immutable desde un digest.",
    },
    velocity: {
      rails: "Helpers + digest + asset_host es un path resuelto para apps server-rendered.",
      fastapi:
        "Si no tienes assets, no hay nada que resolver. Si los tienes, inventas hashing.",
    },
    control: {
      rails: "El asset pipeline es un mundo. Escaparlo (Vite, esbuild) es común y un poco extraoficial.",
      fastapi: "No hay pipeline. El tooling frontend es la app de otro. La API se queda siendo una API.",
    },
    refactor: {
      rails: "Moverse a un JS bundler es un sendero conocido.",
      fastapi: "No hay nada que mover.",
    },
    runtime: {
      rails: "Una vez fingerprinted, el hit rate del CDN es la historia, no Ruby.",
      fastapi:
        "Igual, si pones los headers. Fácil de olvidar en JSON que debería cachearse en el edge.",
    },
    verdict:
      "Un CDN no es una feature de Rails ni de FastAPI. Rails te empujará hacia uno para assets. FastAPI no mencionará assets. Diseña las cache keys en el lienzo de cualquier modo.",
  },
  client: {
    title: "Client",
    summary:
      "El browser no le importa qué stack elegiste. Rails a menudo entrega HTML (Hotwire) o una SPA same-origin. FastAPI casi siempre entrega JSON a un frontend separado. Esa elección reescribe auth, CSRF y cómo dibujas este nodo.",
    railsPhil: "La app puede renderizar la página",
    fastPhil: "La app es una JSON API",
    railsHood: {
      "Same origin":
        "Cookie session, token CSRF en meta y requests Turbo comparten el host. El LB ve un origin.",
      "Progressive enhancement":
        "Un form funciona sin JS. Eso no es nostalgia; es un failure mode más simple que una pantalla SPA blanca.",
    },
    fastHood: {
      "CORS is real":
        "El browser no enviará tu JSON a menos que la API lo diga. allow_credentials + origin wildcard es un bug, no un atajo.",
      "Bearer in JS":
        "Tokens en memoria ganan a localStorage. Refresh cookies en un origin dedicado son un proyecto de diseño. Nada de esto es default.",
    },
    velocity: {
      rails: "Un repo, un deploy, forms que funcionan. El primer producto a menudo sale más rápido como HTML.",
      fastapi:
        "Dos repos, CORS y un build frontend. El primer producto a menudo se ve más 'app' antes si ya tienes un equipo SPA.",
    },
    control: {
      rails:
        "Hotwire acopla UX al server. Un client móvil entonces necesita una API con la que no empezaste.",
      fastapi:
        "La API es el producto. Web, mobile y partners consumen el mismo contrato. Ese era el punto.",
    },
    refactor: {
      rails: "Añadir una SPA después es un segundo client y un rethink de CSRF/session.",
      fastapi: "Añadir páginas server-rendered después es raro — probablemente nunca lo harás.",
    },
    runtime: {
      rails:
        "HTML over the wire puede ser menos round-trips. Cachear en CDN es más difícil que para una SPA hasheada.",
      fastapi:
        "La SPA es estática en el edge; la API es charlatana. Diseñas para waterfalls o los obtienes.",
    },
    verdict:
      "Dibuja este nodo con honestidad. Si Rails sirve HTML, el client y la API son el mismo proceso. Si FastAPI sirve JSON, el client es otro origin y CORS pertenece al lienzo.",
  },
};
