import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { KindIcon } from "@/components/lab/kind-icon";
import { t, UI } from "@/lib/i18n";
import { BOARD_H, BOARD_W, NODE_H, NODE_W } from "@/lib/lab/layout";
import { KIND_META } from "@/lib/lab/meta";
import { posKey, useLabStore } from "@/lib/lab/store";
import type { FlowKind, KindFamily, LabEdge, LabNode, Lens, SyncKind } from "@/lib/lab/types";
import { cn } from "@/lib/utils";

function nodePos(
  scenarioId: string,
  node: LabNode,
  positions: Record<string, { x: number; y: number }>,
) {
  return positions[posKey(scenarioId, node.id)] ?? { x: node.x, y: node.y };
}

function strokeFor(flow: FlowKind): string {
  if (flow === "read") return "rgb(46 97 246 / 0.9)";
  if (flow === "write") return "rgb(255 32 112 / 0.9)";
  return "rgb(242 241 234 / 0.32)";
}

function pathFor(pa: { x: number; y: number }, pb: { x: number; y: number }): string {
  const goingDown = pb.y > pa.y + NODE_H / 2 && Math.abs(pb.x - pa.x) < NODE_W;
  const goingUp = pa.y > pb.y + NODE_H / 2 && Math.abs(pb.x - pa.x) < NODE_W;
  const startX = goingDown || goingUp ? pa.x + NODE_W / 2 : pa.x + NODE_W;
  const startY = goingDown ? pa.y + NODE_H : goingUp ? pa.y : pa.y + NODE_H / 2;
  const endX = goingDown || goingUp ? pb.x + NODE_W / 2 : pb.x;
  const endY = goingDown ? pb.y : goingUp ? pb.y + NODE_H : pb.y + NODE_H / 2;
  const dx = Math.max(40, Math.abs(endX - startX) / 2);
  const dy = Math.max(28, Math.abs(endY - startY) / 2);
  if (goingDown || goingUp) {
    return `M ${startX} ${startY} C ${startX} ${startY + (goingDown ? dy : -dy)}, ${endX} ${endY + (goingDown ? -dy : dy)}, ${endX} ${endY}`;
  }
  return `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;
}

function EdgeLayer({
  scenarioId,
  nodes,
  edges,
  positions,
  selectedEdge,
  onSelectEdge,
}: {
  scenarioId: string;
  nodes: LabNode[];
  edges: LabEdge[];
  positions: Record<string, { x: number; y: number }>;
  selectedEdge: string | null;
  onSelectEdge: (from: string, to: string) => void;
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return (
    <svg className="absolute inset-0" width={BOARD_W} height={BOARD_H} aria-hidden="true">
      {edges.map((edge) => {
        const a = byId.get(edge.from);
        const b = byId.get(edge.to);
        if (!a || !b) return null;
        const pa = nodePos(scenarioId, a, positions);
        const pb = nodePos(scenarioId, b, positions);
        const d = pathFor(pa, pb);
        const id = `${edge.from}->${edge.to}`;
        const selected = selectedEdge === id;
        const flow = edge.flow ?? "mixed";
        const sync = edge.sync ?? "sync";
        return (
          <g key={id}>
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth="14"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectEdge(edge.from, edge.to);
              }}
            />
            <path
              d={d}
              fill="none"
              stroke={strokeFor(flow)}
              strokeWidth={selected ? 2.5 : 1.5}
              strokeDasharray={sync === "async" ? "6 5" : undefined}
              className="pointer-events-none"
            />
          </g>
        );
      })}
    </svg>
  );
}

function familyIconClass(family: KindFamily): string {
  if (family === "compute") return "text-cobalt";
  if (family === "speed") return "text-magenta";
  if (family === "persist") return "text-sun";
  return "text-violet";
}

function NodeCard({
  node,
  scenarioId,
  selected,
  linking,
  lens,
  scaleRef,
  onSelect,
}: {
  node: LabNode;
  scenarioId: string;
  selected: boolean;
  linking: boolean;
  lens: Lens;
  scaleRef: MutableRefObject<number>;
  onSelect: (id: string) => void;
}) {
  const setNodePosition = useLabStore((s) => s.setNodePosition);
  const skipClick = useRef(false);
  const dragging = useRef<{
    pointerId: number;
    ox: number;
    oy: number;
    sx: number;
    sy: number;
  } | null>(null);
  const meta = KIND_META[node.kind];
  const positions = useLabStore((s) => s.positions);
  const pos = nodePos(scenarioId, node, positions);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragging.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const scale = scaleRef.current || 1;
      const nx = Math.max(8, Math.min(BOARD_W - NODE_W - 8, d.sx + (e.clientX - d.ox) / scale));
      const ny = Math.max(8, Math.min(BOARD_H - NODE_H - 8, d.sy + (e.clientY - d.oy) / scale));
      if (Math.abs(e.clientX - d.ox) + Math.abs(e.clientY - d.oy) > 4) skipClick.current = true;
      setNodePosition(posKey(scenarioId, node.id), nx, ny);
    };
    const onUp = (e: PointerEvent) => {
      if (dragging.current?.pointerId === e.pointerId) dragging.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [node.id, scenarioId, scaleRef, setNodePosition]);

  return (
    <button
      type="button"
      data-family={meta.family}
      data-selected={selected ? "true" : "false"}
      aria-label={meta.title}
      aria-pressed={selected}
      onClick={() => {
        if (skipClick.current) {
          skipClick.current = false;
          return;
        }
        onSelect(node.id);
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        skipClick.current = false;
        dragging.current = {
          pointerId: e.pointerId,
          ox: e.clientX,
          oy: e.clientY,
          sx: pos.x,
          sy: pos.y,
        };
      }}
      style={{ left: pos.x, top: pos.y, width: NODE_W, height: NODE_H }}
      className={cn(
        "node-card absolute flex flex-col items-start justify-center rounded-lg border px-3 text-left transition-[border-color,background-color,box-shadow] duration-150",
        linking && "border-violet",
      )}
    >
      <span className="node-bar absolute left-0 top-3 bottom-3 w-0.5 rounded-full" />
      <span className="flex w-full items-center justify-between gap-2 pl-1.5">
        <span className="text-xs uppercase tracking-wide text-subtle">{meta.title}</span>
        <KindIcon kind={node.kind} className={cn("size-3.5 shrink-0", familyIconClass(meta.family))} />
      </span>
      {lens === "split" ? (
        <span className="mt-1 flex flex-col gap-0.5 pl-1.5 text-xs leading-tight">
          <span className="text-magenta">{meta.railsLabel}</span>
          <span className="text-cobalt">{meta.fastapiLabel}</span>
        </span>
      ) : (
        <span className="mt-1 pl-1.5 text-sm font-medium text-fg leading-snug">
          {lens === "rails" ? meta.railsLabel : meta.fastapiLabel}
        </span>
      )}
    </button>
  );
}

export function ArchitectureCanvas({
  scenarioId,
  nodes = [],
  edges = [],
  selectedId,
  onSelect,
}: {
  scenarioId: string;
  nodes: LabNode[];
  edges: LabEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const lens = useLabStore((s) => s.lens);
  const positions = useLabStore((s) => s.positions);
  const selectedEdge = useLabStore((s) => s.selectedEdge);
  const setSelectedEdge = useLabStore((s) => s.setSelectedEdge);
  const connectFrom = useLabStore((s) => s.connectFrom);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const sx = el.clientWidth / BOARD_W;
      const sy = el.clientHeight / BOARD_H;
      const next = Math.min(1, Math.max(0.55, Math.min(sx, sy) * 0.98));
      scaleRef.current = next;
      setScale(next);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scenarioId, nodes.length]);

  return (
    <div
      ref={wrapRef}
      className="relative h-full min-h-64 w-full min-w-0 overflow-auto canvas-grid rounded-xl border border-border bg-bg lg:min-h-96"
    >
      <div className="relative mx-auto" style={{ width: BOARD_W * scale, height: BOARD_H * scale }}>
        <div
          className="absolute left-0 top-0"
          style={{
            width: BOARD_W,
            height: BOARD_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <EdgeLayer
            scenarioId={scenarioId}
            nodes={nodes}
            edges={edges}
            positions={positions}
            selectedEdge={selectedEdge}
            onSelectEdge={(from, to) => setSelectedEdge(`${from}->${to}`)}
          />
          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              scenarioId={scenarioId}
              selected={selectedId === node.id}
              linking={connectFrom === node.id}
              lens={lens}
              scaleRef={scaleRef}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FlowLegend() {
  const locale = useLabStore((s) => s.locale);
  const Item = ({
    flow,
    sync,
    label,
  }: {
    flow: FlowKind;
    sync: SyncKind;
    label: string;
  }) => (
    <span className="inline-flex items-center gap-2 text-xs text-muted">
      <svg width="22" height="8" aria-hidden="true">
        <line
          x1="0"
          y1="4"
          x2="22"
          y2="4"
          stroke={strokeFor(flow)}
          strokeWidth="1.5"
          strokeDasharray={sync === "async" ? "4 3" : undefined}
        />
      </svg>
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-3">
      <Item flow="read" sync="sync" label={t(locale, UI.flowRead)} />
      <Item flow="write" sync="sync" label={t(locale, UI.flowWrite)} />
      <Item flow="mixed" sync="sync" label={t(locale, UI.flowMixed)} />
      <Item flow="write" sync="async" label={t(locale, UI.flowAsync)} />
    </div>
  );
}

export function FamilyLegend() {
  const locale = useLabStore((s) => s.locale);
  const chips: { family: KindFamily; label: string; cls: string }[] = [
    { family: "compute", label: t(locale, UI.legendCompute), cls: "bg-cobalt" },
    { family: "speed", label: t(locale, UI.legendSpeed), cls: "bg-magenta" },
    { family: "persist", label: t(locale, UI.legendPersist), cls: "bg-sun" },
    { family: "agentic", label: t(locale, UI.legendAgentic), cls: "bg-violet" },
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {chips.map((c) => (
        <span key={c.family} className="inline-flex items-center gap-1.5 text-xs text-muted">
          <span className={cn("size-2 rounded-full", c.cls)} />
          {c.label}
        </span>
      ))}
    </div>
  );
}

