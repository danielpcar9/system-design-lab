export type DiagnosisOverlay = { title: string; body: string };

export const DIAGNOSIS_ES: Record<string, DiagnosisOverlay> = {
  "no-cache": {
    title: "El store primario está sirviendo el read path",
    body: "SQL colapsó bajo lecturas repetidas. Añade un cache Redis (cache-aside para la hot key) o el p99 seguirá subiendo con el RPS.",
  },
  "no-replica": {
    title: "Un solo primary para un mix read-heavy",
    body: "Reads y writes comparten un writer. Añade Read Replicas, o mueve la palanca CAP hacia AP y acepta reads stale desde réplicas.",
  },
  "sync-writes": {
    title: "Writes síncronos en el request path",
    body: "Fan-out, matching o analytics sigue in-line. Ponlo en una queue (Sidekiq / ARQ+Redis o Kafka) y marca la arista async.",
  },
  "no-throttle": {
    title: "Sin admission control",
    body: "Sin Rate Limiter, el overload se vuelve 500s en vez de 429s. Rack::Attack o SlowAPI delante del origin protege la capacidad.",
  },
  "vertical-ceiling": {
    title: "El scale vertical chocó con el tamaño de la caja",
    body: "Un host Puma/Uvicorn más grande no compra otro orden de magnitud. Cambia la matriz a horizontal y añade un Load Balancer.",
  },
  "n-plus-one": {
    title: "ActiveRecord N+1 bajo contención",
    body: "La conveniencia del identity-map se vuelve query storms cuando olvidas includes(). Data Mapper (SQLAlchemy) hace visible el statement — o añade un cache para que el ORM no esté en el hot path.",
  },
  "write-back-durability": {
    title: "El cache write-back puede mentir",
    body: "Los writes hacen ack contra Redis antes de SQL. p50 rápido, durabilidad débil. Bien para counters; peligroso para payments. Prefiere cache-aside o write-through para filas source-of-truth.",
  },
  "cp-unavailable": {
    title: "CP eligió consistencia sobre servir",
    body: "Bajo partición u overload un sistema CP rechaza writes. Eso es correcto para ledgers y incorrecto para un mapa de presence de chat. Cambia a AP o añade capacidad.",
  },
  "no-socket": {
    title: "WhatsApp sin capa de socket",
    body: "Hacer polling a la API de mensajes no sostendrá 80k clients concurrentes. Añade WebSockets (ActionCable / FastAPI WS) y un broker, no otro poller REST.",
  },
  "inline-fanout": {
    title: "Fan-out en el POST /posts",
    body: "Escribir en el timeline de cada follower in-line es la trampa clásica de Twitter. Encola el fan-out (Sidekiq / ARQ) y deja el HTTP request solo para persistir.",
  },
  "sync-match": {
    title: "Dispatch sigue scoped al request",
    body: "Emparejar riders con drivers es una búsqueda sobre un índice geoespacial, no un join SQL en el POST de checkout. Encolalo y guarda la location en vivo en el nodo NoSQL/Redis.",
  },
  "location-in-sql": {
    title: "Location en vivo en el SQL primario",
    body: "Los pings de driver a 1Hz destrozarán el WAL. Deja los registros de trip en SQL; pon la última location en Redis/NoSQL.",
  },
  "follow-in-sql": {
    title: "El grafo de follows sigue siendo un join",
    body: "Friend-of-friend y vecindarios de celebrities son hops, no filas. Añade un Graph Database (o un cache de adyacencia denormalizado) antes de que el join SQL se vuelva el p99.",
  },
  "media-in-sql": {
    title: "Media sentada en la tabla de mensajes",
    body: "Notas de voz e imágenes inflan el WAL del chat. Pon blobs en object storage; la fila del mensaje guarda una key. ActiveStorage o UploadFile + S3.",
  },
  "no-breaker": {
    title: "El downstream está bajo retry-storm",
    body: "Cuando el p99 explota, los clients reintentan y terminan la capacidad restante. Un Circuit Breaker suelta carga hasta que la dependencia se recupera.",
  },
  "no-vector": {
    title: "Generación sin retrieval",
    body: "El modelo responde desde los weights. Añade un Vector DB (Qdrant / pgvector) y haz retrieve antes de generate, o las citas son ficción.",
  },
  "no-memory": {
    title: "El agente es stateless entre turnos",
    body: "Cada turno del ticket reenvía todo el thread o lo olvida. Un Agent Memory / session store con sliding window mantiene el contexto fuera del dump del prompt.",
  },
  "no-llm-gw": {
    title: "Cada servicio habla con el vendor del modelo",
    body: "Keys, retries y spend están dispersos. Pon LiteLLM (o un router ruby-openai) delante y rutea classify a un modelo cheap.",
  },
  "no-token-cap": {
    title: "El gasto de tokens no tiene tope",
    body: "Los limiters de RPS no detienen a un agente verboso. Un Token Rate Limiter fail-closed sobre Redis es el fusible de la factura.",
  },
  "no-sandbox": {
    title: "Las tools corren dentro del API worker",
    body: "La ejecución de tools externas pertenece a un sandbox sin secrets y con kill timeout. Un prompt jailbroken es, de otro modo, acceso a producción.",
  },
  "no-graph": {
    title: "El trabajo de larga duración no tiene checkpoint",
    body: "Kill -9 a mitad de una tool y el run reinicia desde cero — o cobra dos veces una tool. LangGraph / Temporal con checkpointer es la respuesta senior.",
  },
  "llm-retry-storm": {
    title: "Los timeouts del LLM se reintentan a ciegas",
    body: "429s del provider más retries del client terminan el presupuesto de tokens restante. Abre el Circuit Breaker y sirve una respuesta cached degradada.",
  },
};

export const BOTTLENECK_ES: Record<string, string> = {
  "Primary database (read path)": "Base de datos primaria (read path)",
  "Uncapped token spend / LLM queue": "Gasto de tokens sin tope / cola LLM",
  "Direct model vendor (no router)": "Vendor de modelo directo (sin router)",
  "Synchronous write path": "Write path síncrono",
  "Single vertically scaled host": "Un solo host con scale vertical",
  "API workers at saturation": "API workers en saturación",
  "Cache durability / consistency": "Durabilidad / consistencia del cache",
  "None — headroom remaining": "Ninguno — queda holgura",
};
