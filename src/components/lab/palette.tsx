import { KindIcon } from "@/components/lab/kind-icon";
import { t, UI } from "@/lib/i18n";
import { KIND_META } from "@/lib/lab/meta";
import { PALETTE_KINDS } from "@/lib/lab/scenarios";
import { useLabStore } from "@/lib/lab/store";
import type { KindFamily, ScenarioTrack } from "@/lib/lab/types";
import type { EdgeFeedbackTone } from "@/lib/lab/graph";
import { cn } from "@/lib/utils";

function familyText(family: KindFamily): string {
  if (family === "compute") return "text-cobalt";
  if (family === "speed") return "text-magenta";
  if (family === "persist") return "text-sun";
  return "text-violet";
}

function familyBorder(family: KindFamily): string {
  if (family === "compute") return "hover:border-cobalt/50";
  if (family === "speed") return "hover:border-magenta/50";
  if (family === "persist") return "hover:border-sun/50";
  return "hover:border-violet/50";
}

export function ComponentPalette({
  connectMode,
  onToggleConnect,
  onAdd,
  track,
}: {
  connectMode: boolean;
  onToggleConnect: () => void;
  onAdd: (kind: (typeof PALETTE_KINDS)[number]) => void;
  track?: ScenarioTrack;
}) {
  const locale = useLabStore((s) => s.locale);
  const kinds = [...PALETTE_KINDS].sort((a, b) => {
    const af = KIND_META[a].family === "agentic" ? 0 : 1;
    const bf = KIND_META[b].family === "agentic" ? 0 : 1;
    if (track === "agentic") return af - bf;
    return bf - af;
  });

  return (
    <div className="flex min-w-0 w-full flex-nowrap items-center gap-2 overflow-x-auto">
      <button
        type="button"
        onClick={onToggleConnect}
        className={cn(
          "h-10 shrink-0 rounded-sm border px-3 text-xs font-medium",
          connectMode
            ? "border-cobalt bg-cobalt-dim text-cobalt"
            : "border-border text-muted hover:text-fg",
        )}
      >
        {connectMode ? t(locale, UI.linking) : t(locale, UI.linkNodes)}
      </button>
      {kinds.map((kind) => {
        const family = KIND_META[kind].family;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onAdd(kind)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-sm border border-border px-3 text-xs text-muted hover:text-fg",
              familyBorder(family),
            )}
          >
            <KindIcon kind={kind} className={cn("size-3.5", familyText(family))} />
            {KIND_META[kind].title}
          </button>
        );
      })}
    </div>
  );
}

export function EdgeInspector({
  label,
  flow,
  sync,
  onCycle,
  onDelete,
  feedback,
}: {
  label: string;
  flow: string;
  sync: string;
  onCycle: () => void;
  onDelete: () => void;
  feedback: { tone: EdgeFeedbackTone; reason: string };
}) {
  const locale = useLabStore((s) => s.locale);
  const feedbackStyle =
    feedback.tone === "good"
      ? "border-cobalt/30 bg-cobalt-dim/40 text-cobalt"
      : feedback.tone === "bad"
        ? "border-magenta/30 bg-magenta-dim/30 text-magenta"
        : "border-sun/30 bg-sun-dim/30 text-sun";
  const feedbackLabel =
    feedback.tone === "good"
      ? t(locale, UI.edgeFeedbackGood)
      : feedback.tone === "bad"
        ? t(locale, UI.edgeFeedbackBad)
        : t(locale, UI.edgeFeedbackWarn);
  return (
    <div className="w-full rounded-lg border border-border bg-elevated px-3 py-2 sm:max-w-xl">
      <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.selectedEdge)}</p>
      <p className="mt-1 text-sm text-fg">{label}</p>
      <p className="mt-1 font-mono text-xs text-muted">
        {flow} · {sync}
      </p>
      <div className={cn("mt-2 rounded-md border px-2.5 py-2 text-xs leading-relaxed", feedbackStyle)}>
        <p className="font-medium">{feedbackLabel}</p>
        <p className="mt-0.5 text-fg/80">{feedback.reason}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onCycle}
        className="mt-2 h-10 rounded-sm border border-border px-3 text-xs text-fg hover:border-border-strong"
      >
        {t(locale, UI.cycleFlow)}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="mt-2 h-10 rounded-sm border border-magenta/40 px-3 text-xs text-magenta hover:bg-magenta-dim/30"
      >
        {t(locale, UI.unlinkEdge)}
      </button>
      </div>
    </div>
  );
}

export function ConnectionGuide() {
  const locale = useLabStore((s) => s.locale);
  return (
    <details className="rounded-lg border border-border bg-elevated px-3 py-2 text-xs text-muted">
      <summary className="cursor-pointer list-none font-medium text-fg">{t(locale, UI.connectionGuideTitle)}</summary>
      <ol className="mt-2 grid gap-1.5 leading-relaxed sm:grid-cols-2">
        <li>1. {t(locale, UI.connectionGuideStepOne)}</li>
        <li>2. {t(locale, UI.connectionGuideStepTwo)}</li>
        <li>3. {t(locale, UI.connectionGuideStepThree)}</li>
        <li>4. {t(locale, UI.connectionGuideStepFour)}</li>
      </ol>
      <p className="mt-2 border-t border-border pt-2 text-subtle">{t(locale, UI.connectionGuideHint)}</p>
    </details>
  );
}
