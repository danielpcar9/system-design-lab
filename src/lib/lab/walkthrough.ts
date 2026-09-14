import type { Bilingual } from "@/lib/i18n/locale";

export type LabEndpoints = {
  fastapi: string;
  rails: string;
  jaeger: string;
};

export const DEFAULT_LAB_ENDPOINTS: LabEndpoints = {
  fastapi: "http://localhost:58000",
  rails: "http://localhost:53000",
  jaeger: "http://localhost:16686",
};

export type WalkthroughStepId =
  | "exercise"
  | "fastapi"
  | "rails"
  | "jaeger"
  | "redis"
  | "bench";

export type WalkthroughStep = {
  id: WalkthroughStepId;
  title: Bilingual;
  why: Bilingual;
  do: Bilingual;
  expect: Bilingual;
};

export const WALKTHROUGH: WalkthroughStep[] = [
  {
    id: "exercise",
    title: { en: "Write the contract", es: "Escribe el contrato" },
    why: {
      en: "An interview answer starts as code you can defend, not as a running cluster.",
      es: "Una respuesta de entrevista empieza como código que puedes defender, no como un clúster corriendo.",
    },
    do: {
      en: "Open Practice and complete “Create a short link”: POST /links, unique code, 201, collision as 409.",
      es: "Abre Practicar y completa “Crear un link corto”: POST /links, código único, 201, colisión como 409.",
    },
    expect: {
      en: "Visible + hidden source checks pass. The browser still does not execute your snippet.",
      es: "Pasan los checks visibles y ocultos. El navegador sigue sin ejecutar tu snippet.",
    },
  },
  {
    id: "fastapi",
    title: { en: "Hit FastAPI", es: "Pega FastAPI" },
    why: {
      en: "The same contract now runs for real: validation, mint, persist, JSON envelope.",
      es: "El mismo contrato ahora corre de verdad: validación, mint, persist, envelope JSON.",
    },
    do: {
      en: "POST {url} to FastAPI (or open /docs). Then follow GET /r/:code and read X-Request-Id.",
      es: "Haz POST {url} a FastAPI (o abre /docs). Luego sigue GET /r/:code y lee X-Request-Id.",
    },
    expect: {
      en: "201 { code, url }. Invalid URL → 422 { error }. Known code → 302 with Location.",
      es: "201 { code, url }. URL inválida → 422 { error }. Código conocido → 302 con Location.",
    },
  },
  {
    id: "rails",
    title: { en: "Hit Rails with the same body", es: "Pega Rails con el mismo body" },
    why: {
      en: "If the contract is shared, the framework is a detail. A nested {link:{url}} body would be a leak.",
      es: "Si el contrato es compartido, el framework es un detalle. Un body {link:{url}} sería una fuga.",
    },
    do: {
      en: "POST the exact same JSON to Rails. Compare code shape, 302, and request id — not slogans.",
      es: "Haz POST del mismo JSON a Rails. Compara forma del code, 302 y request id — no eslóganes.",
    },
    expect: {
      en: "Same 201 / 422 / 302. A second POST without Idempotency-Key mints a new code.",
      es: "Mismos 201 / 422 / 302. Un segundo POST sin Idempotency-Key acuña un código nuevo.",
    },
  },
  {
    id: "jaeger",
    title: { en: "Read the trace", es: "Lee la traza" },
    why: {
      en: "A log line cannot tell you whether Redis or PostgreSQL owned the milliseconds.",
      es: "Una línea de log no te dice si Redis o PostgreSQL se comieron los milisegundos.",
    },
    do: {
      en: "Local Compose only: open Jaeger, pick url-shortener-fastapi or url-shortener-rails, find your request id. Render has no collector — that is the production default.",
      es: "Solo Compose local: abre Jaeger, elige url-shortener-fastapi o url-shortener-rails, busca tu request id. Render no tiene collector — ese es el default de production.",
    },
    expect: {
      en: "POST shows SQL insert. First GET shows Redis miss then SQL. Second GET is Redis-only.",
      es: "POST muestra el insert SQL. El primer GET muestra miss de Redis y luego SQL. El segundo GET es solo Redis.",
    },
  },
  {
    id: "redis",
    title: { en: "Turn Redis off", es: "Apaga Redis" },
    why: {
      en: "Fail-open means redirects survive a cache outage. Fail-closed would 500 the hot path.",
      es: "Fail-open significa que los redirects sobreviven una caída de cache. Fail-closed haría 500 del hot path.",
    },
    do: {
      en: "Local only: stop Redis or set LAB_FAULTS=1 LAB_ENV=lab LAB_FAULT_REDIS=1. Replay GET /r/:code. Never enable faults on Render.",
      es: "Solo local: para Redis o pon LAB_FAULTS=1 LAB_ENV=lab LAB_FAULT_REDIS=1. Repite GET /r/:code. Nunca actives fallos en Render.",
    },
    expect: {
      en: "Still 302 from PostgreSQL. Jaeger shows the Redis span erroring, then SQL. p99 worse, availability of redirects intact.",
      es: "Sigue el 302 desde PostgreSQL. Jaeger muestra el span de Redis en error y luego SQL. p99 peor, disponibilidad de redirects intacta.",
    },
  },
  {
    id: "bench",
    title: { en: "Compare the measurement", es: "Compara la medición" },
    why: {
      en: "Stress in the studio is a hypothesis. The bench is a measurement on one host. Neither is a cloud invoice.",
      es: "Stress en el studio es una hipótesis. El bench es una medición en un host. Ninguno es una factura cloud.",
    },
    do: {
      en: "Run the educational GET bench against /health, then against a hot /r/:code (cache warm) vs a cold code. Open Stress and pick a cost profile.",
      es: "Corre el bench educativo GET contra /health, luego contra un /r/:code caliente (cache warm) vs un código frío. Abre Stress y elige un perfil de coste.",
    },
    expect: {
      en: "Warm redirect is cheaper than create. Numbers move with Docker Desktop, GIL vs Puma, and cache. Do not pick a winner.",
      es: "El redirect caliente es más barato que el create. Los números se mueven con Docker Desktop, GIL vs Puma y el cache. No elijas un ganador.",
    },
  },
];

export function trimBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function swaggerUrl(fastapi: string): string {
  return `${trimBase(fastapi)}/docs`;
}

export function jaegerSearchUrl(jaeger: string, service: string): string {
  const base = trimBase(jaeger);
  return `${base}/search?service=${encodeURIComponent(service)}`;
}
