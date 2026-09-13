import { t, UI } from "@/lib/i18n";
import { useLabStore } from "@/lib/lab/store";
import type { DualStackLesson, Lens } from "@/lib/lab/types";
import { cn } from "@/lib/utils";

function HoodList({
  stack,
  steps,
}: {
  stack: "rails" | "fastapi";
  steps: DualStackLesson["rails"]["hood"];
}) {
  const locale = useLabStore((s) => s.locale);
  return (
    <ol className="relative ml-2 border-l border-border pl-5">
      {steps.map((step, i) => (
        <li
          key={step.layer}
          className="sdl-hood-step relative pb-5 last:pb-0"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <span
            className={cn(
              "absolute -left-[23px] top-1 size-2.5 rounded-full border",
              stack === "rails"
                ? "border-rails bg-rails-dim"
                : "border-fastapi bg-fastapi-dim",
            )}
          />
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs text-fg">{step.layer}</p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]",
                step.automatic
                  ? "bg-rails-dim text-rails"
                  : "bg-fastapi-dim text-fastapi",
              )}
            >
              {step.automatic ? t(locale, UI.automatic) : t(locale, UI.explicit)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted leading-relaxed">{step.what}</p>
        </li>
      ))}
    </ol>
  );
}

export function HoodStack({
  lesson,
  lens,
}: {
  lesson: DualStackLesson;
  lens: Lens;
}) {
  const locale = useLabStore((s) => s.locale);
  const showRails = lens !== "fastapi";
  const showFast = lens !== "rails";
  return (
    <div
      className={cn(
        "grid gap-8",
        showRails && showFast ? "lg:grid-cols-2" : "grid-cols-1",
      )}
    >
      {showRails && (
        <section>
          <p className="mb-4 text-[10px] uppercase tracking-[0.16em] text-rails">
            {t(locale, UI.hoodRails)}
          </p>
          <HoodList stack="rails" steps={lesson.rails.hood} />
        </section>
      )}
      {showFast && (
        <section>
          <p className="mb-4 text-[10px] uppercase tracking-[0.16em] text-fastapi">
            {t(locale, UI.hoodFast)}
          </p>
          <HoodList stack="fastapi" steps={lesson.fastapi.hood} />
        </section>
      )}
    </div>
  );
}
