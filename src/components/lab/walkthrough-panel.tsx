import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { t, UI } from "@/lib/i18n";
import { practiceStatusOf, useLabStore } from "@/lib/lab/store";
import {
  WALKTHROUGH,
  jaegerSearchUrl,
  swaggerUrl,
  trimBase,
} from "@/lib/lab/walkthrough";
import { cn } from "@/lib/utils";

type Probe = {
  ok: boolean;
  text: string;
};

async function postLink(base: string, url: string): Promise<Probe> {
  const response = await fetch(`${trimBase(base)}/links`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const requestId = response.headers.get("x-request-id") ?? "";
  return {
    ok: response.status === 201 && typeof body.code === "string",
    text: `${response.status} ${JSON.stringify(body)}${requestId ? ` · ${requestId}` : ""}`,
  };
}

async function followRedirect(base: string, code: string): Promise<Probe> {
  const response = await fetch(`${trimBase(base)}/r/${encodeURIComponent(code)}`, {
    redirect: "manual",
  });
  const location = response.headers.get("location") ?? "";
  return {
    ok: response.status === 302 && location.length > 0,
    text: `${response.status} Location=${location || "—"}`,
  };
}

function codeFrom(text: string): string | null {
  const match = text.match(/"code"\s*:\s*"([^"]+)"/);
  return match?.[1] ?? null;
}

export function WalkthroughPanel({
  scenarioId,
  onPractice,
  onStress,
}: {
  scenarioId: string;
  onPractice: () => void;
  onStress: () => void;
}) {
  const locale = useLabStore((s) => s.locale);
  const step = useLabStore((s) => s.walkthroughStep);
  const setStep = useLabStore((s) => s.setWalkthroughStep);
  const checks = useLabStore((s) => s.walkthroughChecks);
  const toggle = useLabStore((s) => s.toggleWalkthroughCheck);
  const endpoints = useLabStore((s) => s.labEndpoints);
  const setEndpoints = useLabStore((s) => s.setLabEndpoints);
  const progress = useLabStore((s) => s.practiceProgress);
  const mastered = practiceStatusOf(progress, "shortener-create") === "mastered";

  const [targetUrl, setTargetUrl] = useState("https://example.com/article");
  const [fastapiResult, setFastapiResult] = useState<string | null>(null);
  const [railsResult, setRailsResult] = useState<string | null>(null);
  const [busy, setBusy] = useState<"fastapi" | "rails" | null>(null);

  const current = WALKTHROUGH[Math.min(Math.max(step, 0), WALKTHROUGH.length - 1)];
  const seen = Boolean(checks[current.id] || (current.id === "exercise" && mastered));
  const doneCount = useMemo(() => {
    return WALKTHROUGH.filter((item) => checks[item.id] || (item.id === "exercise" && mastered)).length;
  }, [checks, mastered]);

  if (scenarioId !== "url-shortener") {
    return (
      <div className="flex flex-col gap-4 px-4 py-4">
        <p className="text-sm leading-relaxed text-muted">{t(locale, UI.qaWrongLab)}</p>
      </div>
    );
  }

  async function runStack(stack: "fastapi" | "rails") {
    setBusy(stack);
    const base = stack === "fastapi" ? endpoints.fastapi : endpoints.rails;
    try {
      const created = await postLink(base, targetUrl);
      const code = codeFrom(created.text);
      const redirected = code ? await followRedirect(base, code) : { ok: false, text: "no code" };
      const line = `${created.text}\n${redirected.text}`;
      if (stack === "fastapi") setFastapiResult(line);
      else setRailsResult(line);
      if (created.ok && redirected.ok && !checks[stack]) toggle(stack);
    } catch (error) {
      const message = error instanceof Error ? error.message : "network error";
      if (stack === "fastapi") setFastapiResult(message);
      else setRailsResult(message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.qaKicker)}</p>
        <h2 className="mt-1 font-serif text-2xl italic">{t(locale, UI.qaTitle)}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t(locale, UI.qaLead)}</p>
        <p className="mt-2 font-mono text-xs text-subtle">{doneCount}/{WALKTHROUGH.length}</p>
      </header>

      <section className="border-l-2 border-accent bg-elevated p-4" aria-labelledby="workday-ticket-title">
        <p className="font-mono text-[11px] uppercase tracking-wide text-accent">{t(locale, UI.workdayKicker)}</p>
        <h3 id="workday-ticket-title" className="mt-2 text-sm font-medium text-fg">
          {t(locale, UI.workdayTitle)}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t(locale, UI.workdayLead)}</p>
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
          {([
            ["workdayContext", "workdayContextBody"],
            ["workdayDeliverable", "workdayDeliverableBody"],
            ["workdayFeedback", "workdayFeedbackBody"],
          ] as const).map(([term, description]) => (
            <div key={term}>
              <dt className="font-medium text-fg">{t(locale, UI[term])}</dt>
              <dd className="mt-1 leading-relaxed text-subtle">{t(locale, UI[description])}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ol className="flex flex-wrap gap-1" aria-label={t(locale, UI.qaTitle)}>
        {WALKTHROUGH.map((item, index) => {
          const complete = Boolean(checks[item.id] || (item.id === "exercise" && mastered));
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setStep(index)}
                aria-current={item.id === current.id ? "step" : undefined}
                className={cn(
                  "size-8 rounded-sm border text-xs tabular-nums",
                  item.id === current.id
                    ? "border-accent bg-elevated text-fg"
                    : complete
                      ? "border-ok/40 bg-ok-dim text-ok"
                      : "border-border text-muted",
                )}
              >
                {index + 1}
              </button>
            </li>
          );
        })}
      </ol>

      <section className="rounded-lg border border-border bg-elevated p-4">
        <p className="text-xs uppercase tracking-wide text-subtle">
          {String(step + 1).padStart(2, "0")} · {t(locale, current.title)}
        </p>
        <p className="mt-3 text-xs uppercase tracking-wide text-subtle">{t(locale, UI.qaWhy)}</p>
        <p className="mt-1 text-sm leading-relaxed text-fg">{t(locale, current.why)}</p>
        <p className="mt-3 text-xs uppercase tracking-wide text-subtle">{t(locale, UI.qaDo)}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{t(locale, current.do)}</p>
        <p className="mt-3 text-xs uppercase tracking-wide text-subtle">{t(locale, UI.qaExpect)}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{t(locale, current.expect)}</p>
      </section>

      {current.id === "exercise" && (
        <Button onClick={onPractice}>{t(locale, UI.qaOpenPractice)}</Button>
      )}

      {(current.id === "fastapi" || current.id === "rails" || current.id === "jaeger") && (
        <div className="flex flex-col gap-3">
          <label className="block text-xs uppercase tracking-wide text-subtle">
            {t(locale, UI.qaFastapi)}
            <input
              value={endpoints.fastapi}
              onChange={(event) => setEndpoints({ fastapi: event.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-border bg-bg px-3 font-mono text-xs text-fg outline-none focus:border-accent"
            />
          </label>
          <label className="block text-xs uppercase tracking-wide text-subtle">
            {t(locale, UI.qaRails)}
            <input
              value={endpoints.rails}
              onChange={(event) => setEndpoints({ rails: event.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-border bg-bg px-3 font-mono text-xs text-fg outline-none focus:border-accent"
            />
          </label>
          <label className="block text-xs uppercase tracking-wide text-subtle">
            {t(locale, UI.qaJaeger)}
            <input
              value={endpoints.jaeger}
              onChange={(event) => setEndpoints({ jaeger: event.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-border bg-bg px-3 font-mono text-xs text-fg outline-none focus:border-accent"
            />
          </label>
          <p className="text-xs leading-relaxed text-subtle">{t(locale, UI.qaEndpointsHint)}</p>
        </div>
      )}

      {(current.id === "fastapi" || current.id === "rails") && (
        <div className="flex flex-col gap-3">
          <label className="block text-xs uppercase tracking-wide text-subtle">
            {t(locale, UI.qaUrlLabel)}
            <input
              value={targetUrl}
              onChange={(event) => setTargetUrl(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-bg px-3 font-mono text-xs text-fg outline-none focus:border-accent"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => runStack(current.id === "fastapi" ? "fastapi" : "rails")}
              disabled={busy !== null}
            >
              {t(locale, UI.qaTry)}
            </Button>
            {current.id === "fastapi" && (
              <Button variant="secondary" asChild>
                <a href={swaggerUrl(endpoints.fastapi)} target="_blank" rel="noreferrer">
                  {t(locale, UI.qaOpenDocs)}
                </a>
              </Button>
            )}
          </div>
          <pre className="overflow-x-auto rounded-md border border-border bg-bg p-3 font-mono text-[11px] leading-relaxed text-muted" aria-live="polite">
            {(current.id === "fastapi" ? fastapiResult : railsResult) ?? t(locale, UI.qaCorsNote)}
          </pre>
        </div>
      )}

      {current.id === "jaeger" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs leading-relaxed text-subtle">{t(locale, UI.qaRenderNote)}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <a href={jaegerSearchUrl(endpoints.jaeger, "url-shortener-fastapi")} target="_blank" rel="noreferrer">
                {t(locale, UI.qaOpenJaeger)} · FastAPI
              </a>
            </Button>
            <Button variant="secondary" asChild>
              <a href={jaegerSearchUrl(endpoints.jaeger, "url-shortener-rails")} target="_blank" rel="noreferrer">
                {t(locale, UI.qaOpenJaeger)} · Rails
              </a>
            </Button>
          </div>
        </div>
      )}

      {current.id === "bench" && (
        <Button onClick={onStress}>{t(locale, UI.qaOpenStress)}</Button>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => toggle(current.id)}
        >
          {seen ? t(locale, UI.qaMarked) : t(locale, UI.qaMark)}
        </Button>
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep(step - 1)}>
            {t(locale, UI.back)}
          </Button>
        )}
        {step < WALKTHROUGH.length - 1 && (
          <Button onClick={() => setStep(step + 1)}>{t(locale, UI.next)}</Button>
        )}
      </div>
    </div>
  );
}
