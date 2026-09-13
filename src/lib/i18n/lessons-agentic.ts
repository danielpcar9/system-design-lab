import type { LessonEs } from "./lessons-types";

export const LESSONS_ES_AGENTIC: Record<string, LessonEs> = {
  "vector-db": {
    title: "Vector Database",
    summary:
      "Los embeddings viven al lado, no dentro, de la source of truth. Rails suele guardar vectores en Postgres vía neighbor/pgvector. FastAPI habla con Qdrant o Pinecone como un servicio ANN dedicado — retrieve, luego generate.",
    railsPhil: "El índice es una columna",
    fastPhil: "Un servicio que consultas",
    railsHood: {
      "pgvector index":
        "CREATE INDEX USING hnsw (embedding vector_cosine_ops). El planner, no Ruby, hace el ANN.",
      "neighbor gem":
        "has_neighbors añade nearest_neighbors. Tú igual llamas al embedder — Rails no vectoriza un string.",
    },
    fastHood: {
      "Separate ANN cluster":
        "Qdrant/Pinecone poseen HNSW. SQL nunca ve el vector. Dual-write + un repair job los mantienen honestos.",
      "Payload vs embedding":
        "El hit carga chunk text y un source_id. El LLM nunca busca el passage en SQL.",
    },
    velocity: {
      rails: "Una columna extra y un gem. Bien hasta que el corpus supera al primary.",
      fastapi: "Un segundo servicio el día uno. Correcto para RAG a volumen de tickets.",
    },
    control: {
      rails: "ANN y OLTP comparten caja. Un rebuild puede trabar checkouts.",
      fastapi: "Que Qdrant muera no se lleva billing. Operas dos cosas.",
    },
    refactor: {
      rails: "Extraer pgvector a Qdrant es un data move que los modelos pelearán.",
      fastapi: "La función retrieve() ya es el seam.",
    },
    runtime: {
      rails: "HNSW en Postgres es rápido a decenas de millones, no miles de millones.",
      fastapi: "ANN dedicado escala independiente del WAL.",
    },
    verdict:
      "Dibuja un Vector DB cuando la generación debe estar grounded. Rails lo dejará en SQL hasta que duela. FastAPI asumirá Qdrant. Los entrevistadores quieren el chunking y la cita, no el logo.",
  },
  "agent-memory": {
    title: "Memoria del agente",
    summary:
      "La working memory de una session no es la fila del ticket. Rails la aparca en Solid Cache / Redis con TTL. FastAPI usa un Redis hash keyed por thread_id — los checkpoints de LangGraph van aquí, no en la context window del LLM.",
    railsPhil: "TTL es el schema",
    fastPhil: "Un thread_id que pasas",
    railsHood: {
      "Window, not archive":
        "Quédate con los últimos N turnos. El transcript del ticket vive en SQL. Memory es la sliding window que mandas al modelo.",
      "No cookie session":
        "No metas la conversación en cookie_store. El tamaño y el PII te morderán.",
    },
    fastHood: {
      "Checkpoint vs transcript":
        "Los checkpoints LangGraph (channel values) van a Redis/Postgres. El log visible al usuario es otra tabla.",
      "PII redaction":
        "Redacta antes de RPUSH. La window del modelo nunca debe contener un número de tarjeta que ya recortaste en el gateway.",
    },
    velocity: {
      rails: "Rails.cache.write es una línea. Fácil de confundir con el body del ticket.",
      fastapi: "Nombras la key y el trim. Más lento, honesto.",
    },
    control: {
      rails:
        "El config del cache store decide Redis vs memory. MemoryStore en prod es un fail silencioso.",
      fastapi: "El client Redis está en la signature.",
    },
    refactor: {
      rails: "Mover el tamaño de window es una constant. Mover a SQL para audit es un segundo write.",
      fastapi: "Los mismos dos writes, ya separados.",
    },
    runtime: {
      rails: "Las lists Redis están bien. No replayees 200 turnos en el prompt.",
      fastapi: "ltrim es el presupuesto de contexto. Resume turnos viejos en un job.",
    },
    verdict:
      "Agent memory es una sliding window con TTL, no un segundo cerebro. Rails lo esconde detrás de cache. FastAPI hace visibles las list ops. Ambos fallan si concatenas todo el thread en el prompt.",
  },
  "llm-gateway": {
    title: "LLM Gateway",
    summary:
      "Nunca dejes que cada servicio hable con OpenAI directo. Un gateway (LiteLLM, un router fino ruby-openai) posee keys, model routing, retries y spend. Modelos cheap para classify; capable para generate.",
    railsPhil: "Un client, muchos modelos",
    fastPhil: "Un origin compatible con OpenAI",
    railsHood: {
      "Single API key":
        "El proceso gateway guarda el secret. Los app servers reciben un token interno. La rotación es un solo lugar.",
      "Timeout + fallback":
        "Un completion colgado ocupa un thread Puma. Timeout, luego un modelo más pequeño o una respuesta cached.",
    },
    fastHood: {
      LiteLLM:
        "Los providers se ven como OpenAI. Routing, fallbacks y spend viven en el proxy, no en cada router.",
      "No SDK sprawl":
        "Los servicios llaman un base_url. Añadir Claude es una fila de config, no un gem nuevo en doce repos.",
    },
    velocity: {
      rails: "Un PORO y el gem openai. Bien para una app.",
      fastapi: "LiteLLM es un deployable. Más pesado, y es la respuesta contratable.",
    },
    control: {
      rails: "Cada app Rails con su propia key es cómo las facturas te sorprenden.",
      fastapi: "El proxy es el presupuesto. Las listas de modelos se revisan como infra.",
    },
    refactor: {
      rails: "Extraer el PORO a un sidecar es un servicio nuevo que pospusiste.",
      fastapi: "Empezaste con el sidecar.",
    },
    runtime: {
      rails: "Un timeout en el request path igual quema un thread.",
      fastapi: "Los completions async se solapan. Igual pon un timeout en el await.",
    },
    verdict:
      "Un LLM gateway es un API Gateway para tokens. Rails puede fingirlo con un service object. FastAPI + LiteLLM es lo que dibujas cuando importan costo, routing y keys. Los entrevistadores quieren el modelo fallback.",
  },
  sandbox: {
    title: "Code Sandbox",
    summary:
      "Los agentes que escriben o corren código no deben compartir kernel con la API. Rails aísla vía un job worker sin credenciales. FastAPI usa un subprocess restringido o un container desechable. Red y filesystem son la superficie de ataque.",
    railsPhil: "Un worker sin secrets",
    fastPhil: "Un child que puedes matar",
    railsHood: {
      "Separate queue":
        "Los workers sandbox no tienen DATABASE_URL más allá de un token write-back. Un jailbreak no puede dumpear el primary.",
      "Timeout is a kill":
        "Timeout.timeout más un cgroup a nivel de proceso. Un loop Ruby apretado no yield.",
    },
    fastHood: {
      "-I isolated":
        "Sin user site, sin imports ambientales. Mejor: un microVM gVisor/Firecracker. RestrictedPython no es un security boundary.",
      "No credentials in env":
        "La imagen sandbox no recibe la LLM key. Los resultados vuelven por una queue, no por el heap del parent.",
    },
    velocity: {
      rails: "Una class Job se ve como cualquier otra. Fácil olvidar que es input hostil.",
      fastapi: "Ves el subprocess. Más difícil pretender que eval está bien.",
    },
    control: {
      rails: "$SAFE se fue. El aislamiento es ops (cgroup, seccomp), no un gem.",
      fastapi: "La misma historia de ops. El child process es la superficie de review.",
    },
    refactor: {
      rails: "Pasar de eval a un container es un cambio de imagen del worker.",
      fastapi: "El mismo cambio de imagen. Empieza con el container.",
    },
    runtime: {
      rails: "Un job sandbox atascado es un thread Sidekiq. Cota la concurrencia.",
      fastapi: "asyncio.wait_for más kill. Igual cota children concurrentes.",
    },
    verdict:
      "Si el agente puede correr código, el sandbox es un security boundary, no una feature. Dibújalo. Rails lo esconderá como un job. FastAPI mostrará el subprocess. Los entrevistadores quieren el kill switch y los secrets ausentes.",
  },
  "token-limiter": {
    title: "Token Rate Limiter",
    summary:
      "Los RPS limiters detienen floods HTTP. Los token limiters detienen floods de factura. Rails cuenta tokens en Redis por tenant. FastAPI + LiteLLM presupuesta en el gateway. Ambos deben fail closed cuando Redis está caído.",
    railsPhil: "Admitir por tokens, no por requests",
    fastPhil: "El spend es una cuota",
    railsHood: {
      "Not Rack::Attack":
        "Attack keys por IP y route. El presupuesto de tokens keys por tenant y tokens estimados de prompt+completion.",
      "Fail closed":
        "Si Redis no está, rechaza el completion. Fail-open es cómo un fin de semana cuesta cinco cifras.",
    },
    fastHood: {
      "Estimate then settle":
        "Reserva max_tokens por adelantado, refund lo no usado al final del stream. Si no, un client lento acapara el cap.",
      "Gateway enforcement":
        "LiteLLM max_budget / rpm es el backstop. incrby a nivel de app es la policy de producto.",
    },
    velocity: {
      rails: "increment en cache. Lo keyarás mal una vez.",
      fastapi: "incrby en la dependency. El mismo bug, más visible.",
    },
    control: {
      rails: "Fail-open es el instinto default con cache.fetch.",
      fastapi: "Raise 429 es una línea que escribes. Quédate con ella.",
    },
    refactor: {
      rails: "Caps per-modelo significan más keys.",
      fastapi: "LiteLLM ya tiene rpm por modelo. Úsalo.",
    },
    runtime: {
      rails: "El limiter es Redis O(1). El costo son los tokens que no rechazaste.",
      fastapi: "Igual. Los refunds de stream necesitan un finally.",
    },
    verdict:
      "Los Token Rate Limiters son cómo duermes. Rails puede contar en Redis. FastAPI debe enforce en LiteLLM y en la app. Los entrevistadores quieren fail-closed y un cap per-tenant.",
  },
  "state-machine": {
    title: "State Machine",
    summary:
      "Los agentes de larga duración crashean. Los checkpoints de LangGraph y los workflows de Temporal son cómo reanudas. Rails puede modelar esto con AASM más un job, pero durable execution es la respuesta senior.",
    railsPhil: "El run es una fila más un workflow",
    fastPhil: "Checkpoint en cada hop",
    railsHood: {
      "AASM is not durable exec":
        "AASM es una columna. Si el worker muere a mitad de una tool, necesitas un workflow engine o reinicias desde cero.",
      "Temporal history":
        "Cada activity es replay-safe. Los side effects viven en activities, no en el método workflow.",
    },
    fastHood: {
      Checkpointer:
        "PostgresSaver escribe el estado de channel después de cada nodo. Kill -9 e invoke con el mismo thread_id para reanudar.",
      "Cycles are the product":
        "Los conditional edges son cómo acotas loops (max_steps). Loops de tools sin cota son un incidente de costo.",
    },
    velocity: {
      rails: "AASM sale hoy. Temporal es un cluster que pospondrás.",
      fastapi: "LangGraph es una librería. Temporal sigue siendo un cluster. Empieza con checkpoints.",
    },
    control: {
      rails: "Job + enum es fácil de equivocar en retries (doble llamada a tool).",
      fastapi: "Nodos idempotentes + un checkpointer hacen visible el double-apply.",
    },
    refactor: {
      rails: "Reemplazar AASM con Temporal es un rewrite del control flow.",
      fastapi: "El grafo ya es el control flow.",
    },
    runtime: {
      rails: "Los retries de Sidekiq no son replay. Los cargos duplicados ocurren aquí.",
      fastapi: "Los checkpoints cuestan un write por hop. Vale la pena a partir de una llamada a tool.",
    },
    verdict:
      "Las state machines son cómo el trabajo agéntico sobrevive un crash. Rails te mostrará un enum. FastAPI te mostrará LangGraph. Las respuestas Staff nombran el checkpointer y la cota de loop.",
  },
};
