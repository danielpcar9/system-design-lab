import { useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { fill, localizeBottleneck, localizeDiagnosis, t, UI } from "@/lib/i18n";
import { COST_PROFILES, scaleEducationalCost, type CostProfileId } from "@/lib/lab/cost-profiles";
import { KIND_META } from "@/lib/lab/meta";
import { simulate } from "@/lib/lab/simulate";
import { useLabStore } from "@/lib/lab/store";
import type { ComponentKind, LabEdge, LabNode } from "@/lib/lab/types";
import { cn } from "@/lib/utils";

function Field({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-subtle">{label}</span>
        <span className="font-mono text-xs tabular-nums text-fg">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-6 w-full cursor-pointer accent-accent"
      />
    </label>
  );
}

function Metric({
  label,
  value,
  warn,
  ok,
  accent,
}: {
  label: string;
  value: string;
  warn?: boolean;
  ok?: boolean;
  accent?: "violet" | "sun";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        warn
          ? "border-fail/40 bg-fail-dim"
          : ok
            ? "border-ok/40 bg-ok-dim"
            : accent === "violet"
              ? "border-violet/40 bg-violet-dim"
              : accent === "sun"
                ? "border-sun/40 bg-sun-dim"
                : "border-border bg-elevated",
      )}
    >
      <p className="text-xs uppercase tracking-wide text-subtle">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-xl tabular-nums",
          warn ? "text-fail" : ok ? "text-ok" : accent === "violet" ? "text-violet" : "text-fg",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function StressPanel({
  scenarioId,
  nodes,
  edges,
  onAddFix,
}: {
  scenarioId: string;
  nodes: LabNode[];
  edges: LabEdge[];
  onAddFix: (kind: ComponentKind) => void;
}) {
  const locale = useLabStore((s) => s.locale);
  const load = useLabStore((s) => s.load);
  const setLoad = useLabStore((s) => s.setLoad);
  const decisions = useLabStore((s) => s.decisions);
  const costProfile = useLabStore((s) => s.costProfile);
  const setCostProfile = useLabStore((s) => s.setCostProfile);
  const [simulating, setSimulating] = useState(false);
  const [hasSimulated, setHasSimulated] = useState(false);
  const [tick, setTick] = useState(24);
  const tokPerReq = load.tokPerReq ?? 1200;
  const reflectionKey = `sdl-reflection:${scenarioId}`;
  const [reflection, setReflection] = useState("");

  useEffect(() => {
    setReflection(window.localStorage.getItem(reflectionKey) ?? "");
  }, [reflectionKey]);

  useEffect(() => {
    if (reflection) window.localStorage.setItem(reflectionKey, reflection);
  }, [reflection, reflectionKey]);

  const result = useMemo(
    () =>
      simulate({
        scenarioId,
        nodes,
        edges,
        decisions,
        load: { ...load, tokPerReq },
      }),
    [scenarioId, nodes, edges, decisions, load, tokPerReq],
  );

  useEffect(() => {
    if (!simulating) return;
    if (tick >= 24) {
      setSimulating(false);
      return;
    }
    const id = window.setTimeout(() => setTick((t) => t + 1), 90);
    return () => window.clearTimeout(id);
  }, [simulating, tick]);

  const series = result.series.slice(0, simulating ? tick : 24);
  const diagnoses = result.diagnoses.map((d) => localizeDiagnosis(d, locale));
  const bottleneck = localizeBottleneck(result.bottleneck, locale);
  const profile = COST_PROFILES[costProfile];
  const educationalCost = scaleEducationalCost(result.cost, costProfile);
  const educationalAi = scaleEducationalCost(result.aiCost, costProfile);

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.stressKicker)}</p>
        <h2 className="mt-1 font-serif text-2xl italic">{t(locale, UI.stressTitle)}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t(locale, UI.stressLead)}
          {result.agentic ? t(locale, UI.stressLeadAgentic) : ""}
        </p>
        <div className="mt-3 rounded-lg border border-sun/30 bg-sun-dim/40 p-3">
          <p className="text-xs font-medium text-sun">{t(locale, UI.stressModelNotice)}</p>
          <details className="mt-2 text-xs text-muted">
            <summary className="cursor-pointer text-fg hover:text-sun">
              {t(locale, UI.stressAssumptions)}
            </summary>
            <p className="mt-2 leading-relaxed">{t(locale, UI.stressAssumptionsBody)}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>{t(locale, UI.stressAssumptionHeadroom)}</li>
              <li>{t(locale, UI.stressAssumptionCost)}</li>
            </ul>
          </details>
        </div>
      </header>

      <Field
        label={t(locale, UI.traffic)}
        value={load.rps}
        min={50}
        max={8000}
        step={50}
        display={`${load.rps.toLocaleString()} rps`}
        onChange={(rps) => setLoad({ rps })}
      />
      <Field
        label={t(locale, UI.readRatio)}
        value={Math.round(load.readRatio * 100)}
        min={10}
        max={99}
        step={1}
        display={`${Math.round(load.readRatio * 100)}% ${t(locale, UI.readsPct)}`}
        onChange={(n) => setLoad({ readRatio: n / 100 })}
      />
      <Field
        label={t(locale, UI.storedData)}
        value={load.dataGb}
        min={5}
        max={2000}
        step={5}
        display={`${load.dataGb} GB`}
        onChange={(dataGb) => setLoad({ dataGb })}
      />
      {result.agentic && (
        <Field
          label={t(locale, UI.tokensPerReq)}
          value={tokPerReq}
          min={200}
          max={8000}
          step={100}
          display={`${tokPerReq.toLocaleString()} tok`}
          onChange={(n) => setLoad({ tokPerReq: n })}
        />
      )}

      <div>
        <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.costProfile)}</p>
        <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t(locale, UI.costProfile)}>
          {(Object.keys(COST_PROFILES) as CostProfileId[]).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={costProfile === id}
              onClick={() => setCostProfile(id)}
              className={cn(
                "rounded-lg border p-3 text-left text-xs",
                costProfile === id ? "border-accent bg-elevated text-fg" : "border-border text-muted",
              )}
            >
              {t(locale, COST_PROFILES[id].label)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-subtle">{t(locale, profile.note)}</p>
      </div>

      <Button
        onClick={() => {
          setHasSimulated(true);
          setTick(4);
          setSimulating(true);
        }}
        disabled={simulating}
      >
        {simulating ? t(locale, UI.running) : t(locale, UI.simulateLoad)}
      </Button>

      {!hasSimulated ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm leading-relaxed text-muted">
          {t(locale, UI.simIdle)}
          {result.agentic ? t(locale, UI.simIdleAgentic) : ""}
          {t(locale, UI.simIdleTail)}
        </p>
      ) : (
        <>
          <div
            className={cn(
              "rounded-lg border p-4",
              result.collapsed ? "border-fail/50 bg-fail-dim" : "border-ok/50 bg-ok-dim",
            )}
          >
            <p className="text-xs uppercase tracking-wide text-subtle">
              {t(locale, UI.systemHealth)}
            </p>
            <p className={cn("mt-1 font-serif text-2xl italic", result.collapsed ? "text-fail" : "text-ok")}>
              {result.collapsed ? t(locale, UI.collapsed) : t(locale, UI.healthy)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {t(locale, UI.bottleneckLabel)} <span className="text-fg">{bottleneck}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Metric label="p50" value={`${result.p50} ms`} warn={result.p50 > 80} ok={result.p50 <= 40} />
            <Metric label="p95" value={`${result.p95} ms`} warn={result.p95 > 180} ok={result.p95 <= 90} />
            <Metric label="p99" value={`${result.p99} ms`} warn={result.p99 > 250} ok={result.p99 <= 120} />
            <Metric label={t(locale, UI.infraApis)} value={`$${educationalCost.toLocaleString()}/mo`} />
            <Metric
              label={t(locale, UI.availability)}
              value={`${result.availability}%`}
              warn={result.availability < 99.5}
              ok={result.availability >= 99.9}
            />
            {result.agentic && (
              <>
                <Metric
                  label={t(locale, UI.tokensSec)}
                  value={result.tokensPerSec.toLocaleString()}
                  accent="violet"
                />
                <Metric
                  label={t(locale, UI.llmP99)}
                  value={`${result.llmP99} ms`}
                  warn={result.llmP99 > 1200}
                  ok={result.llmP99 <= 700}
                  accent="violet"
                />
                <Metric
                  label={t(locale, UI.aiApis)}
                  value={`$${educationalAi.toLocaleString()}/mo`}
                  warn={result.aiCost > 80_000}
                  accent="sun"
                />
                <Metric
                  label={t(locale, UI.utilization)}
                  value={`${result.utilization}`}
                  warn={result.utilization > 1}
                  ok={result.utilization < 0.75}
                />
              </>
            )}
          </div>

          <div className="h-36 rounded-lg border border-border bg-bg p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <XAxis dataKey="t" hide />
                <YAxis hide domain={[0, "auto"]} />
                <Tooltip
                  contentStyle={{
                    background: "#121214",
                    border: "1px solid rgb(242 241 234 / 0.12)",
                    fontSize: 12,
                    color: "#f2f1ea",
                  }}
                  labelFormatter={() => "latency"}
                  formatter={(v) => [`${v} ms`, "p"]}
                />
                <Line
                  type="monotone"
                  dataKey="ms"
                  stroke={result.collapsed ? "#ef4444" : "#10b981"}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="font-mono text-xs text-subtle">
            {fill(t(locale, UI.capacityLine), {
              n: result.capacity.toLocaleString(),
              u: result.utilization,
            })}
          </p>

          <ul className="flex flex-col gap-3">
            {diagnoses.length === 0 && (
              <li className="text-sm text-muted">{t(locale, UI.noDiagnosis)}</li>
            )}
            {diagnoses.map((d) => (
              <li key={d.id} className="rounded-lg border border-border bg-elevated p-3">
                <p className="text-sm font-medium text-fg">{d.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{d.body}</p>
                {d.fixKind && (
                  <button
                    type="button"
                    onClick={() => onAddFix(d.fixKind!)}
                    className="mt-2 h-10 text-xs text-cobalt hover:underline"
                  >
                    {fill(t(locale, UI.addToCanvas), { title: KIND_META[d.fixKind].title })}
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted">
            <p>{t(locale, UI.costPostgres)} · {profile.postgres}</p>
            <p>{t(locale, UI.costRedis)} · {profile.redis}</p>
            <p>{t(locale, UI.costWorkers)} · {profile.workers}</p>
            <p>{t(locale, UI.costApi)} · {profile.api}</p>
          </div>
          <p className="text-xs leading-relaxed text-subtle">{t(locale, UI.costProfileNote)}</p>

          <details className="rounded-lg border border-border bg-elevated p-4">
            <summary className="cursor-pointer text-sm font-medium text-fg">
              {t(locale, UI.patternTitle)}
            </summary>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-relaxed text-muted">
              <li>{t(locale, UI.patternTimeouts)}</li>
              <li>{t(locale, UI.patternRetries)}</li>
              <li>{t(locale, UI.patternIdempotency)}</li>
              <li>{t(locale, UI.patternBreaker)}</li>
              <li>{t(locale, UI.patternBulkhead)}</li>
            </ul>
          </details>

          <details className="rounded-lg border border-border bg-elevated p-4">
            <summary className="cursor-pointer text-sm font-medium text-fg">
              {t(locale, UI.reflectionTitle)}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t(locale, UI.reflectionPrompt)}</p>
            <textarea
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              className="mt-3 min-h-28 w-full resize-y rounded-md border border-border bg-bg p-3 text-sm text-fg outline-none focus:border-accent"
              placeholder={t(locale, UI.reflectionPlaceholder)}
              aria-label={t(locale, UI.reflectionTitle)}
            />
            {reflection && <p className="mt-2 text-xs text-subtle">{t(locale, UI.reflectionSaved)}</p>}
          </details>
        </>
      )}
    </div>
  );
}
