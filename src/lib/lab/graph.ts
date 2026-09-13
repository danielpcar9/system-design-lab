import { BOARD_H, BOARD_W, NODE_H, NODE_W } from "./layout";
import type { ComponentKind, FlowKind, LabEdge, LabNode, Scenario, SyncKind } from "./types";

export function edgeKey(scenarioId: string, from: string, to: string): string {
  return `${scenarioId}:${from}->${to}`;
}

export function resolveGraph(
  scenario: Scenario,
  extraNodes: LabNode[],
  extraEdges: LabEdge[],
  edgeMeta: Record<string, { flow: FlowKind; sync: SyncKind }>,
): { nodes: LabNode[]; edges: LabEdge[] } {
  const nodes = [...scenario.nodes, ...extraNodes];
  const seen = new Set<string>();
  const edges: LabEdge[] = [];
  for (const e of [...scenario.edges, ...extraEdges]) {
    const k = `${e.from}->${e.to}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const meta = edgeMeta[edgeKey(scenario.id, e.from, e.to)];
    edges.push({
      ...e,
      flow: meta?.flow ?? e.flow ?? "mixed",
      sync: meta?.sync ?? e.sync ?? "sync",
    });
  }
  return { nodes, edges };
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
