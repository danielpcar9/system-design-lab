import { Link } from "@tanstack/react-router";
import { DualStackViewer } from "@/components/lab/viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { familyHint, familyTitle, fill, localizeLesson, localizeScenario, t, UI } from "@/lib/i18n";
import { nextGlobal, scenarioMastery, type Mastery } from "@/lib/lab/curriculum";
import { lessonFor } from "@/lib/lab/lessons";
import { FAMILY_META } from "@/lib/lab/meta";
import { SCENARIOS } from "@/lib/lab/scenarios";
import { practiceStatusOf, useLabStore } from "@/lib/lab/store";
import type { KindFamily, StudioMode } from "@/lib/lab/types";
import { cn } from "@/lib/utils";

const FAMILY_ORDER: KindFamily[] = ["compute", "speed", "persist", "agentic"];

const LEARNING_PATH: Array<{
  number: string;
  title: keyof typeof UI;
  body: keyof typeof UI;
  done: keyof typeof UI;
  scenarioId: string;
  mode: StudioMode;
}> = [
  { number: "01", title: "pathCanvas", body: "pathCanvasBody", done: "pathCanvasDone", scenarioId: "url-shortener", mode: "design" },
  { number: "02", title: "pathPractice", body: "pathPracticeBody", done: "pathPracticeDone", scenarioId: "url-shortener", mode: "practice" },
  { number: "03", title: "pathStress", body: "pathStressBody", done: "pathStressDone", scenarioId: "url-shortener", mode: "stress" },
  { number: "04", title: "pathDecisions", body: "pathDecisionsBody", done: "pathDecisionsDone", scenarioId: "url-shortener", mode: "decisions" },
  { number: "05", title: "pathInterview", body: "pathInterviewBody", done: "pathInterviewDone", scenarioId: "url-shortener", mode: "interview" },
];

export function Landing() {
  const locale = useLabStore((s) => s.locale);
  const lens = useLabStore((s) => s.lens);
  const tab = useLabStore((s) => s.inspectorTab);
  const setTab = useLabStore((s) => s.setInspectorTab);
  const setStudioMode = useLabStore((s) => s.setStudioMode);
  const progress = useLabStore((s) => s.practiceProgress);
  const statusOf = (id: string) => practiceStatusOf(progress, id);
  const continueExercise = nextGlobal(statusOf);
  const authLesson = localizeLesson(lessonFor("auth"), locale);
  const classic = SCENARIOS.filter((s) => s.track === "classic").map((s) =>
    localizeScenario(s, locale),
  );
  const agentic = SCENARIOS.filter((s) => s.track === "agentic").map((s) =>
    localizeScenario(s, locale),
  );

  const pillars = [
    { kicker: "01", title: t(locale, UI.pillar1Title), body: t(locale, UI.pillar1Body) },
    { kicker: "02", title: t(locale, UI.pillar2Title), body: t(locale, UI.pillar2Body) },
    { kicker: "03", title: t(locale, UI.pillar3Title), body: t(locale, UI.pillar3Body) },
    { kicker: "04", title: t(locale, UI.pillar4Title), body: t(locale, UI.pillar4Body) },
  ];

  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:pt-16">
        <div className="sdl-stagger max-w-3xl">
          <Badge>{t(locale, UI.landingBadge)}</Badge>
          <h1 className="mt-5 font-serif text-5xl italic leading-tight text-fg sm:text-6xl">
            {t(locale, UI.landingH1)}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {t(locale, UI.landingLead)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link
                to="/lab/$scenarioId"
                params={{ scenarioId: "url-shortener" }}
                onClick={() => setStudioMode("design")}
              >
                {t(locale, UI.openStudio)}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link
                to="/lab/$scenarioId"
                params={{ scenarioId: "url-shortener" }}
                onClick={() => setStudioMode("walkthrough")}
              >
                {t(locale, UI.qaCta)}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link
                to="/lab/$scenarioId"
                params={{ scenarioId: "rag-support" }}
                onClick={() => setStudioMode("interview")}
              >
                {t(locale, UI.aiInterviewCta)}
              </Link>
            </Button>
            {continueExercise && (
              <Button variant="secondary" asChild>
                <Link
                  to="/lab/$scenarioId"
                  params={{ scenarioId: continueExercise.scenarioId }}
                  onClick={() => setStudioMode("practice")}
                >
                  {fill(t(locale, UI.practiceContinue), { title: t(locale, continueExercise.title) })}
                </Link>
              </Button>
            )}
          </div>
        </div>

        <ul className="mt-10 flex flex-wrap gap-x-5 gap-y-2">
          {FAMILY_ORDER.map((id) => (
            <li key={id} className="inline-flex items-center gap-2 text-sm text-muted">
              <span className={cn("size-2 rounded-full", FAMILY_META[id].swatch)} />
              <span className="text-fg">{familyTitle(locale, id)}</span>
              <span className="hidden sm:inline">· {familyHint(locale, id)}</span>
            </li>
          ))}
          <li className="inline-flex items-center gap-2 text-sm text-muted">
            <span className="size-2 rounded-full bg-ok" />
            <span className="text-fg">{t(locale, UI.healthy)}</span>
            <span className="size-2 rounded-full bg-fail" />
            <span className="text-fg">{t(locale, UI.bottleneck)}</span>
          </li>
        </ul>

        <dl className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <div
              key={p.kicker}
              className="sdl-stagger rounded-xl border border-border bg-surface p-5"
              style={{ animationDelay: `${120 + i * 80}ms` }}
            >
              <dt className="text-xs uppercase tracking-wide text-subtle">
                {p.kicker} · {p.title}
              </dt>
              <dd className="mt-3 text-sm leading-relaxed text-muted">{p.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-y border-border bg-bg">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.learningPath)}</p>
            <h2 className="mt-2 font-serif text-3xl italic">{t(locale, UI.learningPathLead)}</h2>
          </div>
          <ol className="mt-8 divide-y divide-border border-y border-border">
            {LEARNING_PATH.map((step) => (
              <li key={step.number} className="grid gap-4 py-6 sm:grid-cols-[4rem_1fr_auto] sm:items-start">
                <span className="font-mono text-sm text-violet">{step.number} / 05</span>
                <div>
                  <h3 className="font-serif text-xl italic text-fg">{t(locale, UI[step.title])}</h3>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{t(locale, UI[step.body])}</p>
                  <p className="mt-3 max-w-2xl text-xs leading-relaxed text-subtle">
                    <span className="font-medium text-fg">{t(locale, UI.pathDoneLabel)}:</span>{" "}
                    {t(locale, UI[step.done])}
                  </p>
                </div>
                <Button variant="secondary" size="sm" asChild>
                  <Link
                    to="/lab/$scenarioId"
                    params={{ scenarioId: step.scenarioId }}
                    onClick={() => setStudioMode(step.mode)}
                  >
                    {t(locale, UI.pathOpen)}
                  </Link>
                </Button>
              </li>
            ))}
          </ol>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="border-l-2 border-accent pl-4">
              <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.pathRuleLabel)}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(locale, UI.pathRuleBody)}</p>
            </div>
            <div className="border-l-2 border-violet pl-4">
              <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.pathCoachLabel)}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(locale, UI.pathCoachBody)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.flowGuideKicker)}</p>
            <h2 className="mt-2 font-serif text-3xl italic">{t(locale, UI.flowGuideTitle)}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{t(locale, UI.flowGuideLead)}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ["bg-blue-400", "flowReadTitle", "flowReadBody"],
              ["bg-fail", "flowWriteTitle", "flowWriteBody"],
              ["border border-dashed border-violet bg-violet/10", "flowAsyncTitle", "flowAsyncBody"],
            ] as const).map(([swatch, title, body]) => (
              <div key={title} className="border border-border bg-bg p-4">
                <div className="flex items-center gap-2">
                  <span className={cn("size-3 rounded-full", swatch)} />
                  <h3 className="text-sm font-medium text-fg">{t(locale, UI[title])}</h3>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted">{t(locale, UI[body])}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-bg">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.redirectLessonKicker)}</p>
            <h2 className="mt-2 font-serif text-3xl italic">{t(locale, UI.redirectLessonTitle)}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t(locale, UI.redirectLessonLead)}</p>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {([
              ["redirectStepOne", "redirectStepOneBody"],
              ["redirectStepTwo", "redirectStepTwoBody"],
              ["redirectStepThree", "redirectStepThreeBody"],
            ] as const).map(([title, body], index) => (
              <div key={title} className="border-t-2 border-border pt-4">
                <p className="font-mono text-xs text-violet">0{index + 1}</p>
                <h3 className="mt-2 text-sm font-medium text-fg">{t(locale, UI[title])}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted">{t(locale, UI[body])}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.liveViewer)}</p>
              <h2 className="mt-2 font-serif text-3xl italic">{t(locale, UI.authentication)}</h2>
            </div>
            <p className="max-w-md text-sm text-muted">{t(locale, UI.authViewerLead)}</p>
          </div>
          <div className="mt-8 rounded-xl border border-border bg-bg p-4 sm:p-6">
            <DualStackViewer
              lesson={authLesson}
              lens={lens}
              tab={tab}
              onTab={setTab}
              compact
            />
          </div>
        </div>
      </section>

      <section id="labs" className="mx-auto max-w-7xl px-4 py-16">
        <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.hireablePrompts)}</p>
        <h2 className="mt-2 font-serif text-3xl italic">{t(locale, UI.backendLabs)}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {classic.map((s) => (
            <LabCard
              key={s.id}
              id={s.id}
              kicker={s.kicker}
              prompt={s.prompt}
              brief={s.brief}
              load={s.load}
              openLabel={t(locale, UI.openCanvas)}
              mastery={scenarioMastery(s.id, statusOf)}
            />
          ))}
        </div>

        <p className="mt-14 text-xs uppercase tracking-wide text-violet">{t(locale, UI.aiEngineer)}</p>
        <h2 className="mt-2 font-serif text-3xl italic">{t(locale, UI.agenticLabs)}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {agentic.map((s) => (
            <LabCard
              key={s.id}
              id={s.id}
              kicker={s.kicker}
              prompt={s.prompt}
              brief={s.brief}
              load={s.load}
              openLabel={t(locale, UI.openCanvas)}
              mastery={scenarioMastery(s.id, statusOf)}
              agentic
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function LabCard({
  id,
  kicker,
  prompt,
  brief,
  load,
  openLabel,
  agentic,
  mastery,
}: {
  id: string;
  kicker: string;
  prompt: string;
  brief: string;
  load: string;
  openLabel: string;
  agentic?: boolean;
  mastery: Mastery;
}) {
  const locale = useLabStore((s) => s.locale);
  const masteryLabel =
    mastery === "mastered"
      ? t(locale, UI.practiceMastered)
      : mastery === "in-progress"
        ? t(locale, UI.practiceInProgress)
        : t(locale, UI.practiceNotStarted);
  return (
    <Link
      to="/lab/$scenarioId"
      params={{ scenarioId: id }}
      className={cn(
        "group rounded-xl border bg-surface p-5 transition-[border-color] duration-150 hover:border-border-strong",
        agentic ? "border-violet/35" : "border-border",
      )}
    >
      <p className="flex items-center justify-between gap-2">
        <span className={cn("text-xs uppercase tracking-wide", agentic ? "text-violet" : "text-subtle")}>
          {kicker}
        </span>
        <span
          className={cn(
            "text-[10px] uppercase tracking-wide",
            mastery === "mastered" ? "text-ok" : mastery === "in-progress" ? "text-sun" : "text-subtle",
          )}
        >
          {masteryLabel}
        </span>
      </p>
      <h3 className="mt-2 font-serif text-2xl italic text-fg">{prompt}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{brief}</p>
      <p className="mt-4 font-mono text-xs text-subtle">{load}</p>
      <span className="mt-4 inline-flex text-sm text-fg group-hover:underline">{openLabel}</span>
    </Link>
  );
}
