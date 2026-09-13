import { CodeBlock, StackColumn } from "@/components/lab/code-block";
import { setupPhilosophy, t, UI } from "@/lib/i18n";
import { SETUP } from "@/lib/lab/setup";
import { useLabStore } from "@/lib/lab/store";
import type { Lens } from "@/lib/lab/types";
import { cn } from "@/lib/utils";

export function SetupEnvironment({ lens }: { lens: Lens }) {
  const locale = useLabStore((s) => s.locale);
  const showRails = lens !== "fastapi";
  const showFast = lens !== "rails";
  return (
    <section className="mb-6 rounded-lg border border-border bg-elevated p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-subtle">
        {t(locale, UI.setupKicker)}
      </p>
      <h3 className="mt-1 font-serif text-xl italic text-fg">{t(locale, UI.setupTitle)}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t(locale, UI.setupLead)}</p>
      <div
        className={cn(
          "mt-4 grid gap-5",
          showRails && showFast ? "xl:grid-cols-2" : "grid-cols-1",
        )}
      >
        {showRails && (
          <StackColumn
            stack="rails"
            label={SETUP.rails.label}
            philosophy={setupPhilosophy(locale, "rails", SETUP.rails.philosophy)}
          >
            <div className="flex flex-col gap-3">
              {SETUP.rails.snippets.map((s) => (
                <CodeBlock key={s.filename} snippet={s} stack="rails" />
              ))}
            </div>
          </StackColumn>
        )}
        {showFast && (
          <StackColumn
            stack="fastapi"
            label={SETUP.fastapi.label}
            philosophy={setupPhilosophy(locale, "fastapi", SETUP.fastapi.philosophy)}
          >
            <div className="flex flex-col gap-3">
              {SETUP.fastapi.snippets.map((s) => (
                <CodeBlock key={s.filename} snippet={s} stack="fastapi" />
              ))}
            </div>
          </StackColumn>
        )}
      </div>
    </section>
  );
}
