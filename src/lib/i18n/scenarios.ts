export type ScenarioOverlay = {
  name: string;
  prompt: string;
  kicker: string;
  brief: string;
  load: string;
  constraint: string;
};

export const SCENARIO_ES: Record<string, ScenarioOverlay> = {
  "url-shortener": {
    name: "URL Shortener",
    prompt: "Diseña un acortador de URLs",
    kicker: "Contratable · redirects",
    brief:
      "Servicio clase TinyURL: encodea una URL larga, 302 los códigos calientes y nunca dejes que analytics bloquee el redirect.",
    load: "50k redirects/min pico · 10ms p99 en cache hits",
    constraint: "El path de redirect no puede esperar a un job, una session ni un lock.",
  },
  "social-feed": {
    name: "Twitter Feed",
    prompt: "Diseña el home feed de Twitter",
    kicker: "Contratable · fan-out",
    brief:
      "Timeline de grafo de follows. Los posts ordinarios hacen fan-out on write hacia caches por usuario. Los posts de celebrities caen a un hybrid read path. Search es un segundo store.",
    load: "2M DAU · picos de write a la hora",
    constraint: "El HTTP request de create-post no debe esperar al fan-out de followers.",
  },
  "realtime-chat": {
    name: "WhatsApp",
    prompt: "Diseña WhatsApp",
    kicker: "Contratable · presence",
    brief:
      "Entrega 1:1 y de grupo, presence e historial. HTTP persiste; la capa de socket hace fan-out. Auth en el upgrade es parte del diseño.",
    load: "80k sockets concurrentes · send en ráfagas",
    constraint: "No guardes el roster de la sala en la memoria de un web worker.",
  },
  uber: {
    name: "Uber",
    prompt: "Diseña Uber",
    kicker: "Contratable · dispatch",
    brief:
      "Los riders piden, los drivers mandan location, un matcher los empareja, los trips persisten. Location es caliente y lossy; el registro del trip no.",
    load: "Ciudad en pico · pings de driver a 1Hz",
    constraint: "La location en vivo no debe compartir WAL con las filas de billing del trip.",
  },
  "rag-support": {
    name: "RAG Support Agent",
    prompt: "Diseña un agente autónomo de soporte con RAG",
    kicker: "AI Engineer · RAG",
    brief:
      "Llega un ticket. El agente recupera política de un vector store, guarda session memory, llama a un LLM a través de un gateway y nunca quema el presupuesto de tokens en un loop.",
    load: "4k tickets/hora · respuestas grounded · citas obligatorias",
    constraint: "El modelo no puede ver PII ni el corpus entero. Retrieval es obligatorio antes de generate.",
  },
  "agentic-pipeline": {
    name: "Agentic Pipeline",
    prompt: "Diseña un pipeline agéntico de ejecución con tools externas",
    kicker: "AI Engineer · tools",
    brief:
      "Un planner descompone una tarea, una state machine hace checkpoint de cada hop, las tools corren en un sandbox y un model router elige cheap vs capable. El trabajo de larga duración sobrevive un crash.",
    load: "800 runs concurrentes · tools multi-step · jobs de minutos",
    constraint: "El I/O de tools nunca se ejecuta en el API worker. El estado debe reanudarse tras un proceso killed.",
  },
};
