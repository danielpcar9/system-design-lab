import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { KindIcon } from "@/components/lab/kind-icon";
import {
  fill,
  interviewOverlay,
  scoreNotes,
  t,
  trackKindLabel,
  UI,
  type Locale,
} from "@/lib/i18n";
import {
  expectedMonthlyAiCost,
  expectedQps,
  expectedStorageGb,
  INTERVIEWS,
  LEVEL_BAR,
  PROFILE_META,
  scriptsForTrack,
  stepsFor,
  type InterviewScript,
} from "@/lib/lab/interview";
import { KIND_META } from "@/lib/lab/meta";
import { useLabStore } from "@/lib/lab/store";
import type { ComponentKind, InterviewLevel, InterviewTrack } from "@/lib/lab/types";
import { cn } from "@/lib/utils";

const LEVELS: InterviewLevel[] = ["junior", "mid", "senior", "staff", "ai-engineer"];

function scoreScript(
  script: InterviewScript,
  checks: Record<string, boolean>,
  kinds: Set<ComponentKind>,
  qps: number,
  level: InterviewLevel,
  locale: Locale,
): { score: number; notes: string[] } {
  const notes: string[] = [];
  const copy = scoreNotes(locale);
  let score = 0;
  const frHit = script.fr.filter((x) => checks[x.id]).length;
  const nfrHit = script.nfr.filter((x) => checks[x.id]).length;
  score += Math.round((frHit / script.fr.length) * 16);
  score += Math.round((nfrHit / script.nfr.length) * 16);
  if (frHit === script.fr.length && nfrHit === script.nfr.length) {
    notes.push(copy.scopeComplete);
  } else {
    notes.push(copy.nameRemaining);
  }

  const expect = expectedQps(script.envelope);
  const ratio = qps / Math.max(expect, 1);
  if (ratio > 0.5 && ratio < 2) {
    score += 16;
    notes.push(script.track === "agentic" ? copy.tokenQps : copy.envelopeQps);
  } else {
    notes.push(copy.expectedQps(expect.toLocaleString()));
  }

  const covered = script.expectedKinds.filter((k) => kinds.has(k)).length;
  score += Math.round((covered / script.expectedKinds.length) * 20);
  const missing = script.expectedKinds.filter((k) => !kinds.has(k));
  if (missing.length) {
    notes.push(copy.hldMissing(missing.map((k) => KIND_META[k].title).join(", ")));
  } else {
    notes.push(copy.hldMatch);
  }

  const diveHit = script.dive.filter((x) => checks[x.id]).length;
  score += Math.round((diveHit / script.dive.length) * 18);
  if (diveHit < script.dive.length) {
    notes.push(script.track === "agentic" ? copy.diveAgentic : copy.diveBackend);
  } else {
    notes.push(copy.diveDone);
  }

  const spofHit = script.spof.filter((x) => checks[x.id]).length;
  score += Math.round((spofHit / script.spof.length) * 14);
  if (spofHit < script.spof.length) {
    notes.push(script.track === "agentic" ? copy.spofAgentic : copy.spofBackend);
  }

  if (
    (level === "staff" || level === "ai-engineer") &&
    missing.length === 0 &&
    spofHit === script.spof.length &&
    diveHit === script.dive.length
  ) {
    score += 4;
  }
  return { score: Math.min(100, score), notes };
}

function familyCard(family: "compute" | "speed" | "agentic") {
  if (family === "compute") return "border-cobalt/50 bg-cobalt-dim";
  if (family === "speed") return "border-magenta/50 bg-magenta-dim";
  return "border-violet/50 bg-violet-dim";
}

function familyText(family: "compute" | "speed" | "agentic") {
  if (family === "compute") return "text-cobalt";
  if (family === "speed") return "text-magenta";
  return "text-violet";
}

function levelLabel(locale: Locale, l: InterviewLevel): string {
  if (l === "ai-engineer") return t(locale, UI.aiEngineer);
  if (l === "junior") return t(locale, UI.junior);
  if (l === "mid") return t(locale, UI.mid);
  if (l === "senior") return t(locale, UI.senior);
  return t(locale, UI.staff);
}

function stepTitle(locale: Locale, id: string, track: InterviewTrack): string {
  if (id === "req") return t(locale, UI.stepReq);
  if (id === "envelope") {
    return track === "agentic" ? t(locale, UI.stepTokenEnvelope) : t(locale, UI.stepEnvelope);
  }
  if (id === "hld") return t(locale, UI.stepHld);
  if (id === "dive") return t(locale, UI.stepDive);
  return track === "agentic" ? t(locale, UI.stepResilience) : t(locale, UI.stepSpof);
}

function profileBlurb(locale: Locale, id: InterviewLevel): string {
  if (id === "senior") return t(locale, UI.profileSenior);
  if (id === "staff") return t(locale, UI.profileStaff);
  return t(locale, UI.profileAi);
}

export function InterviewPanel({
  scenarioId,
  presentKinds,
}: {
  scenarioId: string;
  presentKinds: ComponentKind[];
}) {
  const locale = useLabStore((s) => s.locale);
  const script = INTERVIEWS[scenarioId];
  const overlay = interviewOverlay(scenarioId, locale);
  const step = useLabStore((s) => s.interviewStep);
  const setStep = useLabStore((s) => s.setInterviewStep);
  const level = useLabStore((s) => s.interviewLevel);
  const setLevel = useLabStore((s) => s.setInterviewLevel);
  const track = useLabStore((s) => s.interviewTrack);
  const setTrack = useLabStore((s) => s.setInterviewTrack);
  const checks = useLabStore((s) => s.interviewChecks);
  const toggleCheck = useLabStore((s) => s.toggleCheck);
  const envelope = useLabStore((s) => s.envelope);
  const setEnvelope = useLabStore((s) => s.setEnvelope);

  const steps = stepsFor(script?.track ?? track);
  const current = steps[step] ?? steps[0];
  const alts = scriptsForTrack(track).filter((s) => s.scenarioId !== scenarioId);

  if (!script) {
    return <p className="p-4 text-sm text-muted">{t(locale, UI.noScript)}</p>;
  }

  const prompt = overlay?.prompt ?? script.prompt;

  if (script.track !== track) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4">
        <TrackPicker locale={locale} track={track} onChange={setTrack} />
        <p className="text-sm leading-relaxed text-muted">
          {fill(t(locale, UI.wrongTrack), {
            kind: trackKindLabel(locale, script.track),
            track: track === "agentic" ? t(locale, UI.aiEngineer) : "Backend",
          })}
        </p>
        <ul className="flex flex-col gap-2">
          {alts.map((s) => (
            <li key={s.scenarioId}>
              <Link
                to="/lab/$scenarioId"
                params={{ scenarioId: s.scenarioId }}
                className="block rounded-lg border border-border px-3 py-3 text-sm text-fg hover:border-border-strong"
              >
                {interviewOverlay(s.scenarioId, locale)?.prompt ?? s.prompt}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const qps = expectedQps({
    ...script.envelope,
    dau: envelope.dau,
    reqPerUser: envelope.reqPerUser,
    peakX: envelope.peakX,
  });
  const storage = expectedStorageGb({
    ...script.envelope,
    dau: envelope.dau,
    reqPerUser: envelope.reqPerUser,
    peakX: envelope.peakX,
  });
  const aiUsd = expectedMonthlyAiCost(
    { ...script.envelope, dau: envelope.dau, reqPerUser: envelope.reqPerUser, peakX: envelope.peakX },
    qps,
  );
  const result = scoreScript(script, checks, new Set(presentKinds), qps, level, locale);
  const bar = LEVEL_BAR[level];
  const fr = script.fr.map((x) => ({ id: x.id, label: overlay?.fr[x.id] ?? x.label }));
  const nfr = script.nfr.map((x) => ({ id: x.id, label: overlay?.nfr[x.id] ?? x.label }));

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-subtle">
          {script.track === "agentic"
            ? t(locale, UI.interviewKickerAgentic)
            : t(locale, UI.interviewKickerBackend)}
        </p>
        <h2 className="mt-1 font-serif text-2xl italic">{prompt}</h2>
        <p className="mt-2 text-sm text-muted">
          {script.track === "agentic"
            ? t(locale, UI.interviewLeadAgentic)
            : t(locale, UI.interviewLeadBackend)}
        </p>
      </header>

      <TrackPicker locale={locale} track={track} onChange={setTrack} />

      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLevel(l)}
            className={cn(
              "h-10 rounded-full border px-3 text-xs capitalize",
              level === l ? "border-accent bg-elevated text-fg" : "border-border text-muted",
            )}
          >
            {levelLabel(locale, l)}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(i)}
            className={cn(
              "h-10 shrink-0 rounded-sm border px-3 text-xs",
              i === step ? "border-accent text-fg" : "border-border text-muted",
            )}
          >
            {s.kicker} {stepTitle(locale, s.id, script.track)}
          </button>
        ))}
      </div>

      {current.id === "req" && (
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.functional)}</p>
            <div className="mt-2">
              <Checklist items={fr} checks={checks} onToggle={toggleCheck} />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-subtle">
              {t(locale, UI.nonFunctional)}
            </p>
            <div className="mt-2">
              <Checklist items={nfr} checks={checks} onToggle={toggleCheck} />
            </div>
          </div>
        </div>
      )}
      {current.id === "envelope" && (
        <div className="flex flex-col gap-3">
          <label className="text-sm text-muted">
            {t(locale, UI.dau)}
            <input
              type="number"
              className="mt-1 h-10 w-full rounded-sm border border-border bg-bg px-3 text-fg"
              value={envelope.dau}
              onChange={(e) => setEnvelope({ dau: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="text-sm text-muted">
            {t(locale, UI.reqPerUser)}
            <input
              type="number"
              className="mt-1 h-10 w-full rounded-sm border border-border bg-bg px-3 text-fg"
              value={envelope.reqPerUser}
              onChange={(e) => setEnvelope({ reqPerUser: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="text-sm text-muted">
            {t(locale, UI.peakX)}
            <input
              type="number"
              className="mt-1 h-10 w-full rounded-sm border border-border bg-bg px-3 text-fg"
              value={envelope.peakX}
              onChange={(e) => setEnvelope({ peakX: Number(e.target.value) || 0 })}
            />
          </label>
          <p className="font-mono text-sm text-fg">
            {fill(t(locale, UI.peakQps), { qps: qps.toLocaleString(), gb: storage })}
          </p>
          {script.track === "agentic" && (
            <p className="font-mono text-sm text-violet">
              {fill(t(locale, UI.tokenLine), {
                tok: script.envelope.tokensPerReq?.toLocaleString() ?? 0,
                usd: aiUsd.toLocaleString(),
              })}
            </p>
          )}
          <p className="text-xs text-subtle">
            {fill(t(locale, UI.targetQps), { n: expectedQps(script.envelope).toLocaleString() })}
          </p>
        </div>
      )}
      {current.id === "hld" && (
        <div>
          <p className="text-sm leading-relaxed text-muted">{t(locale, UI.hldLead)}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {script.expectedKinds.map((k) => (
              <li key={k} className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-2 text-fg">
                  <KindIcon kind={k} className="size-3.5 text-subtle" />
                  {KIND_META[k].title}
                </span>
                <span className={presentKinds.includes(k) ? "text-ok" : "text-fail"}>
                  {presentKinds.includes(k) ? t(locale, UI.onCanvas) : t(locale, UI.missing)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {current.id === "dive" && (
        <ul className="flex flex-col gap-3">
          {script.dive.map((item) => {
            const on = Boolean(checks[item.id]);
            const dive = overlay?.dive[item.id];
            return (
              <li key={item.id} className="rounded-lg border border-border p-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-accent"
                    checked={on}
                    onChange={() => toggleCheck(item.id)}
                  />
                  <span>
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-subtle">
                      <KindIcon kind={item.kind} className="size-3.5" />
                      {KIND_META[item.kind].title}
                    </span>
                    <span className="mt-1 block text-sm text-fg">
                      {dive?.question ?? item.question}
                    </span>
                  </span>
                </label>
                {on && (
                  <div className="mt-3 grid gap-2">
                    <p className="text-sm leading-relaxed">
                      <span className="text-magenta">Rails. </span>
                      <span className="text-muted">{dive?.rails ?? item.rails}</span>
                    </p>
                    <p className="text-sm leading-relaxed">
                      <span className="text-cobalt">FastAPI. </span>
                      <span className="text-muted">{dive?.fastapi ?? item.fastapi}</span>
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {current.id === "spof" && (
        <ul className="flex flex-col gap-2">
          {script.spof.map((item) => {
            const sp = overlay?.spof[item.id];
            return (
              <li key={item.id}>
                <label className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-accent"
                    checked={Boolean(checks[item.id])}
                    onChange={() => toggleCheck(item.id)}
                  />
                  <span>
                    <span className="block text-sm text-fg">{sp?.label ?? item.label}</span>
                    <span className="mt-1 block text-sm text-muted">
                      {sp?.mitigation ?? item.mitigation}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          {t(locale, UI.back)}
        </Button>
        <Button
          onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
          disabled={step === steps.length - 1}
        >
          {t(locale, UI.next)}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-elevated p-4">
        <p className="text-xs uppercase tracking-wide text-subtle">
          {fill(t(locale, UI.barLabel), { level: levelLabel(locale, level), bar })}
        </p>
        <p className="mt-1 font-mono text-3xl tabular-nums text-fg">{result.score}</p>
        <p className={cn("mt-1 text-sm", result.score >= bar ? "text-ok" : "text-fail")}>
          {result.score >= bar ? t(locale, UI.hireable) : t(locale, UI.belowBar)}
        </p>
        <ul className="mt-3 flex flex-col gap-1">
          {result.notes.map((n) => (
            <li key={n} className="text-sm leading-relaxed text-muted">
              {n}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.profileCards)}</p>
        <div className="mt-2 grid gap-2">
          {PROFILE_META.map((p) => {
            const pBar = LEVEL_BAR[p.id];
            const hire = result.score >= pBar;
            return (
              <article
                key={p.id}
                className={cn("rounded-lg border p-3", familyCard(p.family))}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className={cn("text-sm font-medium", familyText(p.family))}>
                    {p.id === "ai-engineer" ? t(locale, UI.aiEngineer) : p.title}
                  </h3>
                  <span className={cn("font-mono text-xs tabular-nums", hire ? "text-ok" : "text-fail")}>
                    {hire ? t(locale, UI.hire) : t(locale, UI.noHire)} · {pBar}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{profileBlurb(locale, p.id)}</p>
                <p className="mt-2 text-xs leading-relaxed text-fg">
                  {p.id === "ai-engineer" && script.track !== "agentic"
                    ? t(locale, UI.backendForAi)
                    : hire
                      ? fill(t(locale, UI.scoreClears), { score: result.score, title: p.title })
                      : fill(t(locale, UI.scoreShort), {
                          score: result.score,
                          title: p.title,
                          note: result.notes[0],
                        })}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TrackPicker({
  locale,
  track,
  onChange,
}: {
  locale: Locale;
  track: InterviewTrack;
  onChange: (t: InterviewTrack) => void;
}) {
  const tracks: { id: InterviewTrack; label: string; hint: string }[] = [
    { id: "backend", label: t(locale, UI.trackBackend), hint: t(locale, UI.trackBackendHint) },
    { id: "agentic", label: t(locale, UI.trackAgentic), hint: t(locale, UI.trackAgenticHint) },
  ];
  return (
    <div className="grid gap-2">
      {tracks.map((tr) => (
        <button
          key={tr.id}
          type="button"
          onClick={() => onChange(tr.id)}
          className={cn(
            "rounded-lg border p-3 text-left",
            track === tr.id
              ? tr.id === "agentic"
                ? "border-violet bg-violet-dim"
                : "border-cobalt bg-cobalt-dim"
              : "border-border hover:border-border-strong",
          )}
        >
          <p className="text-sm font-medium text-fg">{tr.label}</p>
          <p className="mt-1 text-xs text-muted">{tr.hint}</p>
        </button>
      ))}
    </div>
  );
}

function Checklist({
  items,
  checks,
  onToggle,
}: {
  items: { id: string; label: string }[];
  checks: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <label className="flex min-h-10 items-start gap-3 rounded-lg border border-border p-3">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-accent"
              checked={Boolean(checks[item.id])}
              onChange={() => onToggle(item.id)}
            />
            <span className="text-sm text-fg">{item.label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
