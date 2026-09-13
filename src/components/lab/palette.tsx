import { KindIcon } from "@/components/lab/kind-icon";
import { t, UI } from "@/lib/i18n";
import { KIND_META } from "@/lib/lab/meta";
import { PALETTE_KINDS } from "@/lib/lab/scenarios";
import { useLabStore } from "@/lib/lab/store";
import type { KindFamily, ScenarioTrack } from "@/lib/lab/types";
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
}: {
  label: string;
  flow: string;
  sync: string;
  onCycle: () => void;
}) {
  const locale = useLabStore((s) => s.locale);
  return (
    <div className="rounded-lg border border-border bg-elevated px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.selectedEdge)}</p>
      <p className="mt-1 text-sm text-fg">{label}</p>
      <p className="mt-1 font-mono text-xs text-muted">
        {flow} · {sync}
      </p>
      <button
        type="button"
        onClick={onCycle}
        className="mt-2 h-10 rounded-sm border border-border px-3 text-xs text-fg hover:border-border-strong"
      >
        {t(locale, UI.cycleFlow)}
      </button>
    </div>
  );
}
