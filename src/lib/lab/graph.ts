import { BOARD_H, BOARD_W, NODE_H, NODE_W } from "./layout";
import type { Bilingual } from "@/lib/i18n/locale";
import type { ComponentKind, FlowKind, LabEdge, LabNode, Scenario, SyncKind } from "./types";

export function edgeKey(scenarioId: string, from: string, to: string): string {
  return `${scenarioId}:${from}->${to}`;
}

export function resolveGraph(
  scenario: Scenario,
  extraNodes: LabNode[],
  extraEdges: LabEdge[],
  edgeMeta: Record<string, { flow: FlowKind; sync: SyncKind }>,
  removedEdges: Record<string, boolean> = {},
): { nodes: LabNode[]; edges: LabEdge[] } {
  const nodes = [...scenario.nodes, ...extraNodes];
  const seen = new Set<string>();
  const edges: LabEdge[] = [];
  for (const e of [...scenario.edges, ...extraEdges]) {
    const k = `${e.from}->${e.to}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (removedEdges[edgeKey(scenario.id, e.from, e.to)]) continue;
    const meta = edgeMeta[edgeKey(scenario.id, e.from, e.to)];
    edges.push({
      ...e,
      flow: meta?.flow ?? e.flow ?? "mixed",
      sync: meta?.sync ?? e.sync ?? "sync",
    });
  }
  return { nodes, edges };
}

export type EdgeFeedbackTone = "good" | "warn" | "bad";

export type EdgeFeedback = {
  tone: EdgeFeedbackTone;
  reason: Bilingual;
};

const storageKinds = new Set<ComponentKind>(["cache", "database", "nosql", "graph", "replica"]);
const workerKinds = new Set<ComponentKind>(["jobs", "queue"]);
const entryKinds = new Set<ComponentKind>(["client", "cdn"]);

/** Teaches the direction of a request without pretending there is only one valid architecture. */
export function edgeFeedback(edge: LabEdge, nodes: LabNode[]): EdgeFeedback {
  const from = nodes.find((node) => node.id === edge.from);
  const to = nodes.find((node) => node.id === edge.to);
  const flow = edge.flow ?? "mixed";
  const sync = edge.sync ?? "sync";

  if (!from || !to) {
    return {
      tone: "warn",
      reason: {
        en: "Check that both ends still exist. This connection is not part of the current graph.",
        es: "Comprueba que los dos extremos sigan existiendo. Esta conexión no pertenece al grafo actual.",
      },
    };
  }
  if (from.id === to.id) {
    return {
      tone: "bad",
      reason: {
        en: "A component should not call itself here. Choose a different destination.",
        es: "Un componente no debería llamarse a sí mismo aquí. Elige otro destino.",
      },
    };
  }
  if (entryKinds.has(from.kind) && (storageKinds.has(to.kind) || workerKinds.has(to.kind))) {
    return {
      tone: "bad",
      reason: {
        en: "The client should go through the API or gateway. Direct database/queue access bypasses validation, auth, and rate limits.",
        es: "El cliente debería pasar por la API o el gateway. Acceder directamente a la base de datos o cola se salta validación, auth y rate limits.",
      },
    };
  }
  if (workerKinds.has(to.kind) && sync === "sync") {
    return {
      tone: "bad",
      reason: {
        en: "A job or queue is normally background work. Make this edge async so the user does not wait for it.",
        es: "Un job o una cola normalmente es trabajo en segundo plano. Haz esta conexión async para que el usuario no espere.",
      },
    };
  }
  if (!workerKinds.has(to.kind) && sync === "async") {
    return {
      tone: "warn",
      reason: {
        en: "Async is useful when the caller does not need the result now. Explain what consumes this event and when it is safe to be eventual.",
        es: "Async sirve cuando quien llama no necesita el resultado ahora. Explica quién consume este evento y por qué puede ser eventual.",
      },
    };
  }
  if (storageKinds.has(to.kind) && flow === "read") {
    return {
      tone: "good",
      reason: {
        en: "Good read path: the service asks a cache or database for existing data.",
        es: "Buen camino de lectura: el servicio pide datos existentes a la caché o a la base de datos.",
      },
    };
  }
  if (storageKinds.has(to.kind) && flow === "write") {
    return {
      tone: "good",
      reason: {
        en: "Good write path: the service owns validation and persists the change in storage.",
        es: "Buen camino de escritura: el servicio valida y persiste el cambio en almacenamiento.",
      },
    };
  }
  if (workerKinds.has(to.kind) && sync === "async") {
    return {
      tone: "good",
      reason: {
        en: "Good async path: the request can finish while the worker records analytics or performs slow work.",
        es: "Buen camino async: la petición puede terminar mientras el worker registra analíticas o hace trabajo lento.",
      },
    };
  }
  return {
    tone: "warn",
    reason: {
      en: "This can be valid, but say what crosses the boundary and why this component calls that one.",
      es: "Puede ser válido, pero explica qué cruza este límite y por qué este componente llama a aquel.",
    },
  };
}

export function nextFlow(flow: FlowKind, sync: SyncKind): { flow: FlowKind; sync: SyncKind } {
  if (flow === "mixed" && sync === "sync") return { flow: "read", sync: "sync" };
  if (flow === "read") return { flow: "write", sync: "sync" };
  if (flow === "write" && sync === "sync") return { flow: "write", sync: "async" };
  if (flow === "write" && sync === "async") return { flow: "mixed", sync: "async" };
  return { flow: "mixed", sync: "sync" };
}

export function placeNode(existing: LabNode[], kind: ComponentKind): LabNode {
  const id = `${kind}-${Math.random().toString(36).slice(2, 7)}`;
  const cols = 4;
  for (let i = 0; i < 24; i += 1) {
    const x = 16 + (i % cols) * (NODE_W + 20);
    const y = 16 + Math.floor(i / cols) * (NODE_H + 24);
    if (x + NODE_W > BOARD_W - 8 || y + NODE_H > BOARD_H - 8) continue;
    const hit = existing.some((n) => Math.abs(n.x - x) < NODE_W - 8 && Math.abs(n.y - y) < NODE_H - 8);
    if (!hit) return { id, kind, x, y };
  }
  return { id, kind, x: 16, y: 16 };
}
