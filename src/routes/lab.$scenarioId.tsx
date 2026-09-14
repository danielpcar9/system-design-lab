import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/lab/app-shell";
import { ArchitectureCanvas, FamilyLegend, FlowLegend } from "@/components/lab/canvas";
import { DecisionMatrix } from "@/components/lab/decision-matrix";
import { InterviewPanel } from "@/components/lab/interview-panel";
import { ComponentPalette, EdgeInspector } from "@/components/lab/palette";
import { ModeTabs } from "@/components/lab/mode-tabs";
import { PracticePanel } from "@/components/lab/practice-panel";
import { StressPanel } from "@/components/lab/stress-panel";
import { DualStackViewer } from "@/components/lab/viewer";
import { WalkthroughPanel } from "@/components/lab/walkthrough-panel";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { localizeLesson, localizeScenario, modeLabel, t, UI } from "@/lib/i18n";
import { edgeKey, nextFlow, placeNode, resolveGraph } from "@/lib/lab/graph";
import { lessonFor } from "@/lib/lab/lessons";
import { KIND_META } from "@/lib/lab/meta";
import { scenarioById, SCENARIOS } from "@/lib/lab/scenarios";
import { extraEdgesOf, extraOf, useLabStore } from "@/lib/lab/store";
import type { ComponentKind } from "@/lib/lab/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lab/$scenarioId")({
  component: LabPage,
});

function LabPage() {
  const { scenarioId } = Route.useParams();
  const raw = scenarioById(scenarioId);
  const locale = useLabStore((s) => s.locale);
  const scenario = raw ? localizeScenario(raw, locale) : undefined;
  const selectedId = useLabStore((s) => s.selectedId);
  const setSelectedId = useLabStore((s) => s.setSelectedId);
  const selectedEdge = useLabStore((s) => s.selectedEdge);
  const lens = useLabStore((s) => s.lens);
  const tab = useLabStore((s) => s.inspectorTab);
  const setTab = useLabStore((s) => s.setInspectorTab);
  const studioMode = useLabStore((s) => s.studioMode);
  const setStudioMode = useLabStore((s) => s.setStudioMode);
  const connectMode = useLabStore((s) => s.connectMode);
  const setConnectMode = useLabStore((s) => s.setConnectMode);
  const connectFrom = useLabStore((s) => s.connectFrom);
  const setConnectFrom = useLabStore((s) => s.setConnectFrom);
  const extraNodes = useLabStore((s) => s.extraNodes);
  const extraEdges = useLabStore((s) => s.extraEdges);
  const edgeMeta = useLabStore((s) => s.edgeMeta);
  const addNode = useLabStore((s) => s.addNode);
  const addEdge = useLabStore((s) => s.addEdge);
  const setEdgeMeta = useLabStore((s) => s.setEdgeMeta);
  const setInterviewTrack = useLabStore((s) => s.setInterviewTrack);
  const [sheetOpen, setSheetOpen] = useState(false);

  const graph = useMemo(() => {
    if (!raw) return { nodes: [], edges: [] };
    return resolveGraph(
      raw,
      extraOf(extraNodes, raw.id),
      extraEdgesOf(extraEdges, raw.id),
      edgeMeta,
    );
  }, [raw, extraNodes, extraEdges, edgeMeta]);

  useEffect(() => {
    if (!raw) return;
    const exists = graph.nodes.some((n) => n.id === selectedId);
    if (!exists) setSelectedId("api");
  }, [raw, graph.nodes, selectedId, setSelectedId]);

  useEffect(() => {
    if (!raw) return;
    setInterviewTrack(raw.track === "agentic" ? "agentic" : "backend");
  }, [scenarioId, raw, setInterviewTrack]);

  const node = useMemo(
    () => graph.nodes.find((n) => n.id === selectedId) ?? graph.nodes[0],
    [graph.nodes, selectedId],
  );
  const lesson = node ? localizeLesson(lessonFor(node.kind), locale) : null;
  const edge = graph.edges.find((e) => `${e.from}->${e.to}` === selectedEdge);

  if (!scenario || !raw) return <Navigate to="/" />;

  function select(id: string) {
    if (connectMode) {
      if (!connectFrom) {
        setConnectFrom(id);
        return;
      }
      if (connectFrom !== id) {
        addEdge(raw!.id, {
          from: connectFrom,
          to: id,
          flow: "mixed",
          sync: "sync",
        });
      }
      setConnectFrom(null);
      return;
    }
    setSelectedId(id);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setSheetOpen(true);
    }
  }

  function addKind(kind: ComponentKind) {
    addNode(raw!.id, placeNode(graph.nodes, kind));
  }

  const inspector =
    studioMode === "practice" ? (
      <PracticePanel scenarioId={raw.id} kind={node?.kind ?? "api"} />
    ) : studioMode === "walkthrough" ? (
      <WalkthroughPanel
        scenarioId={raw.id}
        onPractice={() => setStudioMode("practice")}
        onStress={() => setStudioMode("stress")}
      />
    ) : studioMode === "stress" ? (
      <StressPanel
        scenarioId={raw.id}
        nodes={graph.nodes}
        edges={graph.edges}
        onAddFix={(kind) => {
          addKind(kind);
          setStudioMode("design");
        }}
      />
    ) : studioMode === "decisions" ? (
      <DecisionMatrix />
    ) : studioMode === "interview" ? (
      <InterviewPanel
        scenarioId={raw.id}
        presentKinds={graph.nodes.map((n) => n.kind)}
      />
    ) : (
      lesson && <DualStackViewer lesson={lesson} lens={lens} tab={tab} onTab={setTab} />
    );

  const sheetTitle =
    studioMode === "design"
      ? node
        ? KIND_META[node.kind].title
        : t(locale, UI.component)
      : modeLabel(locale, studioMode);

  return (
    <AppShell back kicker={scenario.kicker} title={scenario.name}>
      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-3 px-4 py-3 lg:h-[calc(100dvh-64px)]">
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-3xl text-sm leading-relaxed text-muted">
            <span className="text-fg">{scenario.prompt}.</span> {scenario.brief}{" "}
            <span className="font-mono text-xs text-subtle">{scenario.load}</span>
          </p>
          <p className="max-w-3xl rounded-md border border-sun/25 bg-sun-dim/30 px-3 py-2 text-xs leading-relaxed text-muted">
            <span className="font-medium text-sun">{t(locale, UI.constraintLabel)}:</span>{" "}
            {scenario.constraint}
          </p>
          <div className="flex w-full min-w-0 gap-2 overflow-x-auto pb-0.5 lg:w-auto">
            {SCENARIOS.map((s) => {
              const loc = localizeScenario(s, locale);
              return (
                <Link
                  key={s.id}
                  to="/lab/$scenarioId"
                  params={{ scenarioId: s.id }}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-2 text-xs",
                    s.id === scenario.id
                      ? s.track === "agentic"
                        ? "border-violet bg-violet-dim text-fg"
                        : "border-accent bg-elevated text-fg"
                      : s.track === "agentic"
                        ? "border-violet/30 text-muted hover:text-fg"
                        : "border-border text-muted hover:text-fg",
                  )}
                >
                  {loc.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ModeTabs value={studioMode} onChange={setStudioMode} />
        </div>

        {studioMode === "design" && (
          <ComponentPalette
            connectMode={connectMode}
            onToggleConnect={() => setConnectMode(!connectMode)}
            onAdd={(kind) => addKind(kind)}
            track={raw.track}
          />
        )}

        <div className="grid min-h-0 min-w-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
          <div className="flex min-h-0 min-w-0 flex-col gap-2">
            <ArchitectureCanvas
              scenarioId={raw.id}
              nodes={graph.nodes}
              edges={graph.edges}
              selectedId={node?.id ?? null}
              onSelect={select}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col gap-2">
                <FlowLegend />
                <FamilyLegend />
              </div>
              {edge && (
                <EdgeInspector
                  label={`${KIND_META[graph.nodes.find((n) => n.id === edge.from)?.kind ?? "api"].title} → ${KIND_META[graph.nodes.find((n) => n.id === edge.to)?.kind ?? "api"].title}`}
                  flow={edge.flow ?? "mixed"}
                  sync={edge.sync ?? "sync"}
                  onCycle={() => {
                    const nxt = nextFlow(edge.flow ?? "mixed", edge.sync ?? "sync");
                    setEdgeMeta(edgeKey(raw.id, edge.from, edge.to), nxt.flow, nxt.sync);
                  }}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-2 lg:hidden">
              {graph.nodes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => select(n.id)}
                  className={
                    n.id === node?.id
                      ? "rounded-full border border-accent bg-elevated px-3 py-2 text-xs text-fg"
                      : "rounded-full border border-border px-3 py-2 text-xs text-muted"
                  }
                >
                  {KIND_META[n.kind].title}
                </button>
              ))}
            </div>
          </div>

          <aside className="hidden min-h-0 overflow-y-auto rounded-xl border border-border bg-surface lg:block">
            {inspector}
          </aside>
        </div>

        <button
          type="button"
          className="lg:hidden rounded-lg border border-border bg-elevated px-4 py-3 text-left"
          onClick={() => setSheetOpen(true)}
        >
          <p className="text-xs uppercase tracking-wide text-subtle">
            {studioMode === "design" ? t(locale, UI.inspect) : modeLabel(locale, studioMode)}
          </p>
          <p className="text-sm text-fg">
            {studioMode === "design"
              ? node
                ? KIND_META[node.kind].title
                : t(locale, UI.selectNode)
              : t(locale, UI.openPanel)}
          </p>
        </button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent title={sheetTitle}>{sheetOpen ? inspector : null}</SheetContent>
      </Sheet>
    </AppShell>
  );
}
