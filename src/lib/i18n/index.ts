import type { CheatSheet } from "@/lib/lab/cheatsheets";
import type {
  CacheStrategy,
  CapChoice,
  Diagnosis,
  InterviewTrack,
  KindFamily,
  OrmChoice,
  ScaleChoice,
  Scenario,
  StudioMode,
} from "@/lib/lab/types";
import { CHEAT_ES } from "./cheats";
import { CACHE_ES, CAP_ES, ORM_ES, SCALE_ES } from "./decisions";
import { BOTTLENECK_ES, DIAGNOSIS_ES } from "./diagnoses";
import { INTERVIEW_ES, SCORE_NOTES_ES, type InterviewOverlay } from "./interview";
import type { Locale } from "./locale";
import { t } from "./locale";
import { SCENARIO_ES } from "./scenarios";
import { SETUP_ES } from "./setup";
import { UI } from "./ui";

export type { Locale } from "./locale";
export { t, tx, LOCALES } from "./locale";
export { UI } from "./ui";
export { localizeLesson } from "./lessons";

export function localizeScenario(scenario: Scenario, locale: Locale): Scenario {
  if (locale === "en") return scenario;
  const o = SCENARIO_ES[scenario.id];
  if (!o) return scenario;
  return { ...scenario, ...o };
}

export function localizeDiagnosis(d: Diagnosis, locale: Locale): Diagnosis {
  if (locale === "en") return d;
  const o = DIAGNOSIS_ES[d.id];
  if (!o) return d;
  return { ...d, title: o.title, body: o.body };
}

export function localizeBottleneck(value: string, locale: Locale): string {
  if (locale === "en") return value;
  return BOTTLENECK_ES[value] ?? value;
}

export function localizeCheat(sheet: CheatSheet, locale: Locale): CheatSheet {
  if (locale === "en") return sheet;
  const o = CHEAT_ES[sheet.id];
  if (!o) return sheet;
  return {
    ...sheet,
    title: o.title,
    kicker: o.kicker,
    body: o.body,
    rails: o.rails ?? sheet.rails,
    fastapi: o.fastapi ?? sheet.fastapi,
  };
}

export function optionCopy<T extends string>(
  locale: Locale,
  id: T,
  fallback: { title: string; body: string },
  table: Record<string, { title: string; body: string }>,
): { id: T; title: string; body: string } {
  if (locale === "en") return { id, ...fallback };
  const o = table[id];
  return { id, title: o?.title ?? fallback.title, body: o?.body ?? fallback.body };
}

export function localizeCap(locale: Locale, id: CapChoice, fallback: { title: string; body: string }) {
  return optionCopy(locale, id, fallback, CAP_ES);
}

export function localizeCache(
  locale: Locale,
  id: CacheStrategy,
  fallback: { title: string; body: string },
) {
  return optionCopy(locale, id, fallback, CACHE_ES);
}

export function localizeOrm(locale: Locale, id: OrmChoice, fallback: { title: string; body: string }) {
  return optionCopy(locale, id, fallback, ORM_ES);
}

export function localizeScale(
  locale: Locale,
  id: ScaleChoice,
  fallback: { title: string; body: string },
) {
  return optionCopy(locale, id, fallback, SCALE_ES);
}

export function interviewOverlay(scenarioId: string, locale: Locale): InterviewOverlay | undefined {
  if (locale === "en") return undefined;
  return INTERVIEW_ES[scenarioId];
}

export function familyTitle(locale: Locale, family: KindFamily): string {
  if (family === "compute") return t(locale, UI.familyCompute);
  if (family === "speed") return t(locale, UI.familySpeed);
  if (family === "persist") return t(locale, UI.familyPersist);
  return t(locale, UI.familyAgentic);
}

export function familyHint(locale: Locale, family: KindFamily): string {
  if (family === "compute") return t(locale, UI.familyComputeHint);
  if (family === "speed") return t(locale, UI.familySpeedHint);
  if (family === "persist") return t(locale, UI.familyPersistHint);
  return t(locale, UI.familyAgenticHint);
}

export function modeLabel(locale: Locale, mode: StudioMode): string {
  if (mode === "design") return t(locale, UI.modeDesign);
  if (mode === "practice") return t(locale, UI.modePractice);
  if (mode === "stress") return t(locale, UI.modeStress);
  if (mode === "decisions") return t(locale, UI.modeDecisions);
  return t(locale, UI.modeInterview);
}

export function setupPhilosophy(locale: Locale, stack: "rails" | "fastapi", fallback: string): string {
  if (locale === "en") return fallback;
  return stack === "rails" ? SETUP_ES.railsPhil : SETUP_ES.fastapiPhil;
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

export function scoreNotes(locale: Locale) {
  if (locale === "en") {
    return {
      scopeComplete: "Functional and non-functional scope is complete.",
      nameRemaining: "Name the remaining requirements before drawing boxes.",
      tokenQps: "Token envelope QPS is in the right order of magnitude.",
      envelopeQps: "Envelope QPS is in the right order of magnitude.",
      expectedQps: (n: string) => `Expected ~${n} peak QPS from the given DAU mix.`,
      hldMissing: (names: string) => `HLD is missing ${names}.`,
      hldMatch: "High-level boxes match the hireable skeleton.",
      diveAgentic: "Deep-dive remaining agentic seams: memory, routing, sandbox, checkpoints.",
      diveBackend: "Deep-dive the remaining critical components (Rails vs FastAPI).",
      diveDone: "Deep dive covers the critical path on both stacks.",
      spofAgentic: "Call the remaining LLM failure modes and loop bounds.",
      spofBackend: "Call the remaining single points of failure.",
    };
  }
  return {
    scopeComplete: SCORE_NOTES_ES.scopeComplete,
    nameRemaining: SCORE_NOTES_ES.nameRemaining,
    tokenQps: SCORE_NOTES_ES.tokenQps,
    envelopeQps: SCORE_NOTES_ES.envelopeQps,
    expectedQps: (n: string) => fill(SCORE_NOTES_ES.expectedQps, { n }),
    hldMissing: (names: string) => fill(SCORE_NOTES_ES.hldMissing, { names }),
    hldMatch: SCORE_NOTES_ES.hldMatch,
    diveAgentic: SCORE_NOTES_ES.diveAgentic,
    diveBackend: SCORE_NOTES_ES.diveBackend,
    diveDone: SCORE_NOTES_ES.diveDone,
    spofAgentic: SCORE_NOTES_ES.spofAgentic,
    spofBackend: SCORE_NOTES_ES.spofBackend,
  };
}

export function trackKindLabel(locale: Locale, track: InterviewTrack): string {
  return track === "agentic"
    ? t(locale, { en: "agentic", es: "agéntico" })
    : t(locale, { en: "backend", es: "backend" });
}
