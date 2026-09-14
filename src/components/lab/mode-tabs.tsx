import { modeLabel, t, UI } from "@/lib/i18n";
import { useLabStore } from "@/lib/lab/store";
import type { StudioMode } from "@/lib/lab/types";
import { cn } from "@/lib/utils";

const MODES: StudioMode[] = ["design", "practice", "walkthrough", "stress", "decisions", "interview"];

export function ModeTabs({
  value,
  onChange,
}: {
  value: StudioMode;
  onChange: (mode: StudioMode) => void;
}) {
  const locale = useLabStore((s) => s.locale);

  return (
    <div
      className="inline-flex h-10 items-center gap-1 overflow-x-auto rounded-md border border-border bg-elevated p-1"
      role="tablist"
      aria-label={t(locale, UI.studioAria)}
    >
      {MODES.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          tabIndex={value === id ? 0 : -1}
          onClick={() => onChange(id)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
            event.preventDefault();
            const index = MODES.indexOf(value);
            const delta = event.key === "ArrowRight" ? 1 : -1;
            const next = MODES[(index + delta + MODES.length) % MODES.length];
            onChange(next);
          }}
          className={cn(
            "h-8 shrink-0 rounded-sm px-3 text-xs font-medium transition-[color,background-color] duration-150",
            value === id ? "bg-surface text-fg" : "text-muted hover:text-fg",
          )}
        >
          {modeLabel(locale, id)}
        </button>
      ))}
    </div>
  );
}
