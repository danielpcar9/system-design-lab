import { t, UI } from "@/lib/i18n";
import { useLabStore } from "@/lib/lab/store";
import type { AxisWinner, DualStackLesson } from "@/lib/lab/types";
import { cn } from "@/lib/utils";

function Marker({ winner }: { winner: AxisWinner }) {
  const pos =
    winner === "rails" ? "left-[8%]" : winner === "fastapi" ? "left-[92%]" : "left-1/2";
  return (
    <div className="relative mt-3 h-1 rounded-full bg-elevated">
      <span className="absolute inset-y-0 left-0 w-1/2 rounded-l-full bg-rails/25" />
      <span className="absolute inset-y-0 right-0 w-1/2 rounded-r-full bg-fastapi/25" />
      <span
        className={cn(
          "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border-strong bg-accent",
          pos,
        )}
      />
    </div>
  );
}

export function Tradeoffs({ lesson }: { lesson: DualStackLesson }) {
  const locale = useLabStore((s) => s.locale);
  const axes = [
    { key: "velocity" as const, label: t(locale, UI.axisVelocity) },
    { key: "control" as const, label: t(locale, UI.axisControl) },
    { key: "refactor" as const, label: t(locale, UI.axisRefactor) },
    { key: "runtime" as const, label: t(locale, UI.axisRuntime) },
  ];

  return (
    <div className="flex flex-col gap-6">
      {axes.map((axis) => {
        const data = lesson.tradeoffs[axis.key];
        return (
          <section key={axis.key} className="rounded-lg border border-border bg-elevated p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-fg">{axis.label}</h3>
              <span className="text-[10px] uppercase tracking-[0.14em] text-subtle">
                {data.winner === "tie"
                  ? t(locale, UI.tie)
                  : data.winner === "rails"
                    ? "Rails"
                    : "FastAPI"}
              </span>
            </div>
            <Marker winner={data.winner} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <p className="text-sm text-muted leading-relaxed">
                <span className="block text-[10px] uppercase tracking-[0.14em] text-rails mb-1">
                  Rails
                </span>
                {data.rails}
              </p>
              <p className="text-sm text-muted leading-relaxed">
                <span className="block text-[10px] uppercase tracking-[0.14em] text-fastapi mb-1">
                  FastAPI
                </span>
                {data.fastapi}
              </p>
            </div>
          </section>
        );
      })}
      <p className="border-t border-border pt-4 font-serif text-lg italic leading-snug text-fg">
        {lesson.tradeoffs.verdict}
      </p>
    </div>
  );
}
