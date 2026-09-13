import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { t, UI } from "@/lib/i18n";
import { useLabStore } from "@/lib/lab/store";
import type { ComponentKind, StackId } from "@/lib/lab/types";
import { cn } from "@/lib/utils";

type Check = { id: string; label: string; ok: boolean };

function starter(stack: StackId, kind: ComponentKind): string {
  if (stack === "rails") {
    return `class LinksController < ApplicationController\n  def create\n    # validate params\n    # persist a unique short code\n    # return 201 or 409\n  end\nend`;
  }
  return `@router.post("/links", status_code=201)\nasync def create_link(payload: LinkIn, db: Session = Depends(get_db)):\n    # validate payload\n    # persist a unique short code\n    # return 201 or 409\n    pass`;
}

export function PracticePanel({ scenarioId, kind }: { scenarioId: string; kind: ComponentKind }) {
  const locale = useLabStore((s) => s.locale);
  const [stack, setStack] = useState<StackId>("fastapi");
  const key = `sdl-practice:${scenarioId}:${kind}:${stack}`;
  const [code, setCode] = useState("");
  const [checked, setChecked] = useState(false);
  const [hint, setHint] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    setCode(window.localStorage.getItem(key) ?? starter(stack, kind));
    setChecked(false);
  }, [key, kind, stack]);

  useEffect(() => {
    if (code) window.localStorage.setItem(key, code);
  }, [code, key]);

  const checks = useMemo<Check[]>(() => {
    const normalized = code.toLowerCase();
    return [
      { id: "contract", label: t(locale, UI.practiceContract), ok: normalized.includes("post") || normalized.includes("create") },
      { id: "failure", label: t(locale, UI.practiceFailure), ok: normalized.includes("409") || normalized.includes("conflict") || normalized.includes("recordnotunique") },
      { id: "persistence", label: t(locale, UI.practicePersistence), ok: normalized.includes("unique") || normalized.includes("commit") || normalized.includes("insert") },
      { id: "explanation", label: t(locale, UI.practiceExplanation), ok: normalized.includes("#") || normalized.includes("why") || normalized.includes("trade-off") },
    ];
  }, [code, locale]);
  const score = checks.filter((item) => item.ok).length;

  function changeStack(next: StackId) {
    setStack(next);
    setChecked(false);
  }

  function checkAnswer() {
    setAttempts((value) => value + 1);
    setChecked(true);
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.practiceKicker)}</p>
        <h2 className="mt-1 font-serif text-2xl italic">{t(locale, UI.practiceTitle)}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t(locale, UI.practiceLead)}</p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        {(["rails", "fastapi"] as StackId[]).map((id) => (
          <button key={id} type="button" onClick={() => changeStack(id)} className={cn("rounded-lg border p-3 text-left text-sm", stack === id ? id === "rails" ? "border-rails bg-rails/10 text-fg" : "border-fastapi bg-fastapi/10 text-fg" : "border-border text-muted")}>{id === "rails" ? t(locale, UI.practiceRails) : t(locale, UI.practiceFastapi)}</button>
        ))}
      </div>

      <section className="rounded-lg border border-border bg-elevated p-4">
        <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.practicePrompt)}</p>
        <p className="mt-2 text-sm leading-relaxed text-fg">{t(locale, UI.practiceExercise)}</p>
      </section>

      <textarea value={code} onChange={(event) => { setCode(event.target.value); setChecked(false); }} spellCheck={false} aria-label={t(locale, UI.practiceTitle)} className="min-h-64 w-full resize-y rounded-lg border border-border bg-bg p-4 font-mono text-xs leading-relaxed text-fg outline-none focus:border-accent" placeholder={t(locale, UI.practicePlaceholder)} />

      <div className="flex flex-wrap gap-2">
        <Button onClick={checkAnswer}>{t(locale, UI.practiceCheck)}</Button>
        <Button variant="secondary" onClick={() => { setCode(starter(stack, kind)); setChecked(false); }}>{t(locale, UI.practiceReset)}</Button>
        <button type="button" onClick={() => setHint((value) => !value)} className="rounded-md px-3 text-xs text-cobalt hover:underline">{t(locale, UI.practiceHint)}</button>
      </div>

      {hint && <p className="rounded-lg border border-cobalt/30 bg-cobalt-dim p-3 text-sm leading-relaxed text-muted">{t(locale, UI.practiceHintText)}</p>}

      {checked && (
        <section className="rounded-lg border border-border bg-elevated p-4">
          <p className={cn("font-serif text-lg italic", score === checks.length ? "text-ok" : "text-sun")}>{score}/{checks.length} · {t(locale, score === checks.length ? UI.practiceComplete : UI.practiceNeedsWork)}</p>
          <ul className="mt-3 space-y-2">{checks.map((item) => <li key={item.id} className={cn("rounded-md border px-3 py-2 text-sm", item.ok ? "border-ok/30 text-ok" : "border-fail/30 text-fail")}>{item.ok ? "✓" : "○"} {item.label}</li>)}</ul>
          <p className="mt-3 text-xs text-subtle">{t(locale, UI.practiceCheckpointNote)}</p>
          <p className="mt-1 text-xs text-subtle">Attempt {attempts} · saved locally in this browser.</p>
        </section>
      )}
    </div>
  );
}
