import type { LessonEs } from "./lessons-types";

export const LESSONS_ES_EXTRA: Record<string, LessonEs> = {
  gateway: {
    title: "API Gateway",
    summary:
      "El edge delante de muchos servicios: TLS, routing, nibble de auth, Rate Limiter. Rails a menudo es la app detrás de Nginx. FastAPI es lo mismo, más podrías terminar JWT en el gateway antes de que Uvicorn corra.",
    railsPhil: "La app sigue siendo un origin",
    fastPhil: "Los servicios ya están partidos",
    railsHood: {
      "Nginx / Envoy":
        "No es Ruby. Health checks, retries y sanitizing de headers ocurren antes de que Rack vea el env.",
      "One monolith origin":
        "La convención te evita necesitar un gateway hasta que partes servicios. Eso es una feature hasta que no lo es.",
    },
    fastHood: {
      "ASGI middleware":
        "Puedes poner auth, tracing y 429s aquí. Un gateway de verdad (Kong, Envoy) sigue siendo mejor en TLS y retries.",
      "Many uvicorn targets":
        "Los servicios FastAPI se multiplican. El gateway es cómo un client móvil sigue viendo un host.",
    },
    velocity: {
      rails: "Sáltate el gateway hasta que tengas dos deployables.",
      fastapi: "Dibujas el gateway el día uno porque la SPA ya habla con un origin de API.",
    },
    control: {
      rails: "El config de Nginx es ops, no el repo Rails, a menos que poseas el chart.",
      fastapi: "El middleware es código. Policy as code es más fácil de revisar — y más fácil de equivocar.",
    },
    refactor: {
      rails: "Extraer un servicio después significa introducir el gateway que te saltaste.",
      fastapi: "El gateway ya estaba; añadir un servicio es otra route.",
    },
    runtime: {
      rails: "Un hop menos.",
      fastapi: "Un hop más, retries más baratos, mejor shed.",
    },
    verdict:
      "Un gateway no es una feature del framework. Rails te deja posponerlo. FastAPI asume que ya tienes un edge. Dibújalo cuando tengas más de un origin o cuando TLS y 429s no deban vivir en el proceso de la app.",
  },
  queue: {
    title: "Message Queue",
    summary:
      "El buffer entre 'aceptado' y 'hecho'. Rails suele significar Redis lists vía Sidekiq. FastAPI significa Redis, RabbitMQ o Kafka — eliges un broker y un proceso consumer.",
    railsPhil: "El adapter es la queue",
    fastPhil: "Un proceso que corres",
    railsHood: {
      "Redis list / Kafka gem":
        "Sidekiq hace RPOPBRPOP de una queue key. Kafka (Karafka) es opt-in cuando superas jobs at-least-once.",
      "ActiveJob adapter":
        "perform_later esconde el broker. Cambiar Redis a Kafka es un adapter más un rewrite de semántica (ordering, replay).",
    },
    fastHood: {
      "Broker choice":
        "Redis streams, Rabbit o Kafka. Ordering y replay son propiedades del broker, no de FastAPI.",
      "Consumer group":
        "Escalas consumers. Las idempotency keys son tuyas. No hay after_commit que esconda un double publish.",
    },
    velocity: {
      rails: "Sidekiq es la queue de la mayoría de shops Rails. Suficiente hasta que no lo es.",
      fastapi: "Nombras el broker el día uno. Correcto, y más lento al primer job.",
    },
    control: {
      rails: "At-least-once + args JSON. Exactly-once es una historia que te cuentas.",
      fastapi: "La semántica Kafka está disponible si de verdad operas Kafka.",
    },
    refactor: {
      rails: "ActiveJob te deja cambiar backends hasta que la semántica diverge.",
      fastapi: "El módulo consumer ya es el seam.",
    },
    runtime: {
      rails: "Redis es rápido y operacionalmente barato. Kafka es una plataforma.",
      fastapi: "Los mismos brokers. Los consumers Python solapan IO bien.",
    },
    verdict:
      "Usa una queue cuando el HTTP request no debe esperar. Rails lo convierte en una class Job. FastAPI lo convierte en un consumer. La pregunta de entrevista es la arista: márcala async en el lienzo.",
  },
  nosql: {
    title: "NoSQL / KV",
    summary:
      "Datos calientes, sin forma o geoespaciales que no deben compartir WAL con filas de billing. Rails habla con Redis/Mongo vía gems. FastAPI usa redis-py o Motor y un documento Pydantic.",
    railsPhil: "Un segundo client en el modelo",
    fastPhil: "Un documento que defines",
    railsHood: {
      "Separate process, separate failure":
        "Que Redis se caiga no hace rollback de la fila Trip a menos que lo envuelvas. La mayoría de apps no lo hacen.",
      "GEO commands":
        "Nearby drivers es una query Redis GEO, no un where de ActiveRecord. El ORM no conoce esta tabla.",
    },
    fastHood: {
      "No identity map":
        "No hay modelo DriverLocation a menos que escribas uno. Bytes in, bytes out, más un índice GEO.",
      "TTL is the schema":
        "Presence expira porque pones ex=30. Olvídalo y el GEO set se llena de ghosts.",
    },
    velocity: {
      rails: "Un gem Redis y un PORO. Rápido de añadir; fácil de pretender que sigue siendo ActiveRecord.",
      fastapi: "Las mismas llamadas Redis, menos ilusiones.",
    },
    control: {
      rails: "Mezclar documentos Mongoid con AR en un request es sopa de sessions.",
      fastapi: "Dos clients, dos sessions explícitas. Más claro bajo review.",
    },
    refactor: {
      rails: "Extraer location de SQL es un data move que los modelos pelearán.",
      fastapi: "Si empezaste con una función ping, SQL nunca tuvo estos datos.",
    },
    runtime: {
      rails: "GEOADD es lo mismo en ambos stacks. La victoria es no poner pings a 1Hz en Postgres.",
      fastapi: "asyncio solapa los pings. El mismo Redis.",
    },
    verdict:
      "NoSQL en este lienzo significa 'no es la source of truth del dinero'. Rails te dejará esconderlo detrás de un modelo. FastAPI no. Los entrevistadores quieren oír qué datos se pueden evaporar.",
  },
  replica: {
    title: "Read Replica",
    summary:
      "Otra copia de SQL que sirve reads. Rails 6+ tiene connected_to :reading. FastAPI bindea un segundo Engine y lo eliges per statement — nada reruteará un SELECT por ti.",
    railsPhil: "Cambio de rol",
    fastPhil: "Un segundo bind",
    railsHood: {
      "Automatic vs block":
        "Un middleware puede mandar GET a la réplica. Writes en un GET (counters sin sidekiq) explotarán. La forma block es la honesta.",
      Lag: "read_your_own_writes no está garantizado. Rails no esperará al replay. Tú manejas stickiness después de un POST.",
    },
    fastHood: {
      "Depends(get_read_db)":
        "Los list endpoints toman la session de réplica. Los write endpoints toman primary. Mézclalos y obtienes un bug confuso, no una sorpresa del framework.",
      "Lag is yours":
        "Después de un write, lee de primary o espera el LSN. Ningún middleware adivinará.",
    },
    velocity: {
      rails: "Una entrada YAML y un role block. El middleware GET-to-replica viene en las guías.",
      fastapi: "Dos URLs, dos session dependencies. Corto, y te vas a saltar un endpoint.",
    },
    control: {
      rails: "El routing implícito de GET es conveniente y es cómo escribes a una réplica por accidente.",
      fastapi: "La dependency es la policy.",
    },
    refactor: {
      rails: "Mover una query a primary es cambiar un block.",
      fastapi: "Mover una query es cambiar un Depends.",
    },
    runtime: {
      rails: "Las réplicas multiplican capacidad de read. El lag es física.",
      fastapi: "El mismo Postgres, el mismo lag, menos writes sorpresa a la réplica.",
    },
    verdict:
      "Las réplicas son cómo sobrevives un mix read-heavy sin un primary más grande. Rails ruteará GETs si se lo permites. FastAPI no. De cualquier modo, dibuja la réplica en el lienzo para que el motor de stress la cuente.",
  },
  "circuit-breaker": {
    title: "Circuit Breaker",
    summary:
      "Deja de llamar a una dependencia enferma. Rails usa semian/circuitbox alrededor de Redis y SQL. FastAPI envuelve el await con aiobreaker o un counter hecho a mano. Ambos son explícitos comparados con la mayor parte de Rails.",
    railsPhil: "Un wrapper alrededor del client",
    fastPhil: "Decorar la llamada",
    railsHood: {
      "Resource ticket":
        "Semian hace bulkhead para que un Redis lento no se lleve cada connection AR. Esto es Rails de producción, no el tutorial.",
      "Open circuit":
        "Tras N errores el gem raise sin pegar a la red. Haces rescue y sirves stale o 503.",
    },
    fastHood: {
      "Decorator state":
        "El breaker es process-local a menos que guardes counts en Redis. FastAPI multi-worker necesita un counter compartido o cada worker suelta a tiempos distintos.",
      Fallback:
        "except CircuitBreakerError: return stale. Escribes el fallback. No hay rescue_from a menos que lo añadas.",
    },
    velocity: {
      rails: "Un initializer de gem cubre Redis y MySQL con un patrón.",
      fastapi: "Un decorator por call site a menos que envuelvas el client una vez.",
    },
    control: {
      rails: "Tickets y umbrales son config. Bien hasta que necesitas un breaker per-tenant.",
      fastapi: "Una función. Per-tenant es otro argumento.",
    },
    refactor: {
      rails: "Los clients construidos fuera del gem se saltan el breaker. Fácil de perder.",
      fastapi: "Grep el decorator. El mismo miss, más visible.",
    },
    runtime: {
      rails: "Los bulkheads salvan el proceso. El gem está battle-tested a escala Shopify.",
      fastapi: "asyncio + un breaker basta si el counter está compartido.",
    },
    verdict:
      "Los breakers son cómo fallas abierto o cerrado a propósito. Añade este nodo cuando el stress test muestra un retry storm. Rails tiene un gem; FastAPI tiene un decorator. La entrevista quiere el fallback, no el nombre de la librería.",
  },
  graph: {
    title: "Graph Database",
    summary:
      "Grafos de follows, friend-of-friend y vecindarios de dispatch. Rails habla con Neo4j a través de ActiveGraph (un wrapper con forma ActiveRecord). FastAPI usa el driver oficial y Cypher que escribes tú — sin identity map, sin callbacks.",
    railsPhil: "El nodo es un modelo",
    fastPhil: "Cypher es la query",
    railsHood: {
      "Cypher under the model":
        "has_many :following compila a un MATCH (n)-[:FOLLOWS]->(m) que nunca ves a menos que lo loguees. Paths de longitud variable se esconden en associations nombradas.",
      "Session per request":
        "Un Rack middleware abre una session Neo4j, similar a AR. Rescue y retry son gems, no tu código, hasta que no lo son.",
    },
    fastHood: {
      "No identity map":
        "Las filas son dicts. Pydantic puede envolverlas si quieres un documento, pero el driver no trackea nodos dirty ni emite MERGE por ti.",
      "Session + await":
        "Abres, corres, cierras. Bloquear el loop ASGI con un driver sync es el bug clásico de producción.",
    },
    velocity: {
      rails: "Las associations se sienten como ActiveRecord. Rápido para esbozar un grafo de follows.",
      fastapi: "Escribes Cypher el día uno. Primer path más lento, menos walks N+1 sorpresa.",
    },
    control: {
      rails: "La profundidad MATCH oculta es cómo recorres el grafo entero por accidente.",
      fastapi: "El query string es la superficie de review.",
    },
    refactor: {
      rails: "Renombrar un relationship type es un modelo más una migration de edges.",
      fastapi: "La misma migration, pero los callers ya nombraron el type en Cypher.",
    },
    runtime: {
      rails: "ActiveGraph igual pega al mismo Neo4j. El costo es el object mapping.",
      fastapi: "Menos mapping, el mismo plan Cypher. Async se solapa bien con walks IO-bound.",
    },
    verdict:
      "Pon un Graph Database en el lienzo cuando los hops importan más que las filas — grafos de follows, nearby drivers, anillos de fraude. Rails lo vestirá de modelo. FastAPI dejará Cypher a la vista. Los entrevistadores quieren el presupuesto de hops, no el nombre del gem.",
  },
};
