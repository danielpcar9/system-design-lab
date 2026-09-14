import { useEffect, useMemo, useState } from "react";
import { CodeEditor } from "@/components/lab/code-editor";
import { Button } from "@/components/ui/button";
import { fill, t, UI } from "@/lib/i18n";
import {
  exercisesFor,
  nextRecommended,
  scenarioMastery,
  type Exercise,
  type Mastery,
} from "@/lib/lab/curriculum";
import {
  allPassed,
  failedIds,
  frequentErrorIds,
  hiddenResults,
  runExerciseTests,
  tipFor,
  visibleResults,
} from "@/lib/lab/practice-validate";
import { draftKey, practiceStatusOf, useLabStore } from "@/lib/lab/store";
import type { ComponentKind, StackId } from "@/lib/lab/types";
import { cn } from "@/lib/utils";

function masteryCopy(status: Mastery) {
  if (status === "mastered") return UI.practiceMastered;
  if (status === "in-progress") return UI.practiceInProgress;
  return UI.practiceNotStarted;
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-subtle">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function PracticePanel({ scenarioId, kind }: { scenarioId: string; kind: ComponentKind }) {
  const locale = useLabStore((s) => s.locale);
  const stack = useLabStore((s) => s.practiceStack);
  const setStack = useLabStore((s) => s.setPracticeStack);
  const progress = useLabStore((s) => s.practiceProgress);
  const drafts = useLabStore((s) => s.practiceDrafts);
  const setDraft = useLabStore((s) => s.setPracticeDraft);
  const record = useLabStore((s) => s.recordPracticeResult);
  const list = useMemo(() => exercisesFor(scenarioId), [scenarioId]);
  const statusOf = (id: string) => practiceStatusOf(progress, id);
  const recommended = nextRecommended(scenarioId, statusOf);
  const [exerciseId, setExerciseId] = useState(recommended?.id ?? list[0]?.id ?? "");
  const [hintLevel, setHintLevel] = useState(0);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const match = list.find((item) => item.kind === kind);
    setExerciseId(match?.id ?? list[0]?.id ?? "");
    setChecked(false);
    setHintLevel(0);
  }, [scenarioId, kind, list]);

  const exercise: Exercise | undefined = list.find((item) => item.id === exerciseId) ?? list[0];
  const key = exercise ? draftKey(exercise.id, stack) : "";
  const code = exercise ? (drafts[key] ?? exercise.starters[stack]) : "";

  const results = useMemo(
    () => (exercise ? runExerciseTests(exercise, code, stack) : []),
    [exercise, code, stack],
  );
  const visible = visibleResults(results);
  const hidden = hiddenResults(results);
  const passed = allPassed(results);
  const recordState = exercise ? progress[exercise.id] : undefined;
  const frequent = frequentErrorIds(recordState?.failHistory ?? [])
    .map((id) => tipFor(id))
    .filter(Boolean)
    .slice(0, 3);
  const sceneMastery = scenarioMastery(scenarioId, statusOf);

  function setCode(next: string) {
    if (!exercise) return;
    setDraft(draftKey(exercise.id, stack), next);
    setChecked(false);
  }

  function checkAnswer() {
    if (!exercise) return;
    setChecked(true);
    record(exercise.id, allPassed(runExerciseTests(exercise, code, stack)), failedIds(results));
  }

  function pick(next: Exercise) {
    setExerciseId(next.id);
    setChecked(false);
    setHintLevel(0);
  }

  if (!exercise) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4">
        <h2 className="font-serif text-2xl italic">{t(locale, UI.practiceTitle)}</h2>
        <p className="text-sm text-muted">{t(locale, UI.practiceNoExercise)}</p>
      </div>
    );
  }

  const filename = stack === "rails" ? "links_controller.rb" : "main.py";
  const language = stack === "rails" ? "ruby" : "python";

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.practiceKicker)}</p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-2xl italic">{t(locale, exercise.title)}</h2>
          <span
            className={cn(
              "text-xs uppercase tracking-wide",
              sceneMastery === "mastered"
                ? "text-ok"
                : sceneMastery === "in-progress"
                  ? "text-sun"
                  : "text-subtle",
            )}
          >
            {t(locale, masteryCopy(sceneMastery))}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t(locale, exercise.challenge)}</p>
      </header>

      {list.length > 1 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.practiceSelect)}</p>
          <div className="mt-2 flex flex-wrap gap-2" role="tablist" aria-label={t(locale, UI.practiceSelect)}>
            {list.map((item) => {
              const status = statusOf(item.id);
              const selected = item.id === exercise.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => pick(item)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left text-xs",
                    selected ? "border-accent bg-elevated text-fg" : "border-border text-muted hover:text-fg",
                  )}
                >
                  <span className="block font-medium">{t(locale, item.title)}</span>
                  <span
                    className={cn(
                      "mt-0.5 block uppercase tracking-wide",
                      status === "mastered" ? "text-ok" : status === "in-progress" ? "text-sun" : "text-subtle",
                    )}
                  >
                    {t(locale, masteryCopy(status))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <details className="rounded-lg border border-border bg-elevated p-4">
        <summary className="cursor-pointer text-sm font-medium text-fg">
          {t(locale, UI.practiceLearnKicker)}
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ListBlock title={t(locale, UI.practiceObjectives)} items={exercise.objectives.map((item) => t(locale, item))} />
          <ListBlock title={t(locale, UI.practicePrereqs)} items={exercise.prerequisites.map((item) => t(locale, item))} />
          <ListBlock title={t(locale, UI.practiceSuccess)} items={exercise.success.map((item) => t(locale, item))} />
          <div>
            <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.practiceConcepts)}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {exercise.concepts.map((concept) => (
                <li
                  key={concept.id}
                  className="rounded-full border border-border px-2 py-1 text-xs text-muted"
                >
                  {t(locale, concept.label)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>

      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label={t(locale, UI.lensAria)}>
        {(["rails", "fastapi"] as StackId[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={stack === id}
            onClick={() => {
              setStack(id);
              setChecked(false);
            }}
            className={cn(
              "rounded-lg border p-3 text-left text-sm",
              stack === id
                ? id === "rails"
                  ? "border-rails bg-rails/10 text-fg"
                  : "border-fastapi bg-fastapi/10 text-fg"
                : "border-border text-muted",
            )}
          >
            {id === "rails" ? t(locale, UI.practiceRails) : t(locale, UI.practiceFastapi)}
          </button>
        ))}
      </div>

      <CodeEditor
        value={code}
        onChange={setCode}
        language={language}
        label={t(locale, exercise.title)}
        filename={filename}
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={checkAnswer}>{t(locale, UI.practiceCheck)}</Button>
        <Button
          variant="secondary"
          onClick={() => {
            setCode(exercise.starters[stack]);
            setChecked(false);
          }}
        >
          {t(locale, UI.practiceReset)}
        </Button>
        {hintLevel < exercise.hints.length && (
          <button
            type="button"
            onClick={() => setHintLevel((value) => Math.min(exercise.hints.length, value + 1))}
            className="rounded-md px-3 text-xs text-cobalt hover:underline"
          >
            {hintLevel === 0 ? t(locale, UI.practiceHint) : t(locale, UI.practiceMoreHint)}
          </button>
        )}
        {recommended && recommended.id !== exercise.id && (
          <button
            type="button"
            onClick={() => pick(recommended)}
            className="rounded-md px-3 text-xs text-cobalt hover:underline"
          >
            {t(locale, statusOf(recommended.id) === "in-progress" ? UI.practiceRetry : UI.practiceNext)}:{" "}
            {t(locale, recommended.title)}
          </button>
        )}
      </div>

      {hintLevel > 0 && (
        <ol className="space-y-2 rounded-lg border border-cobalt/30 bg-cobalt-dim p-3 text-sm leading-relaxed text-muted">
          {exercise.hints.slice(0, hintLevel).map((hint, index) => (
            <li key={index}>
              <span className="font-mono text-xs text-subtle">{index + 1}.</span> {t(locale, hint)}
            </li>
          ))}
        </ol>
      )}

      {checked && (
        <section className="rounded-lg border border-border bg-elevated p-4" aria-live="polite">
          <p className={cn("font-serif text-lg italic", passed ? "text-ok" : "text-sun")}>
            {visible.filter((item) => item.ok).length}/{visible.length} ·{" "}
            {t(locale, passed ? UI.practiceComplete : UI.practiceNeedsWork)}
          </p>
          <ul className="mt-3 space-y-2">
            {visible.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm",
                  item.ok ? "border-ok/30 text-ok" : "border-fail/30 text-fail",
                )}
              >
                {item.ok ? "✓" : "○"} {t(locale, item.label)}
                {!item.ok && tipFor(item.id) && (
                  <p className="mt-1 text-xs leading-relaxed text-muted">{t(locale, tipFor(item.id)!)}</p>
                )}
              </li>
            ))}
          </ul>
          {hidden.length > 0 && (
            <p className={cn("mt-3 text-xs", hidden.every((item) => item.ok) ? "text-ok" : "text-fail")}>
              {hidden.every((item) => item.ok)
                ? fill(t(locale, UI.practiceHiddenPass), { n: hidden.length })
                : t(locale, UI.practiceHiddenFail)}
            </p>
          )}
          <p className="mt-3 text-xs text-subtle">{t(locale, UI.practiceCheckpointNote)}</p>
          {recordState && (
            <p className="mt-1 text-xs text-subtle">
              {fill(t(locale, UI.practiceAttempts), { n: recordState.attempts })}
            </p>
          )}
        </section>
      )}

      {frequent.length > 0 && (
        <section>
          <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.practiceFrequent)}</p>
          <ul className="mt-2 space-y-1 text-sm leading-relaxed text-muted">
            {frequent.map((tip) => (
              <li key={tip!.en}>{t(locale, tip!)}</li>
            ))}
          </ul>
        </section>
      )}

      {recordState?.status === "mastered" && (
        <details className="rounded-lg border border-ok/30 bg-ok-dim p-4" open>
          <summary className="cursor-pointer text-sm font-medium text-fg">
            {t(locale, UI.practiceReflection)}
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t(locale, exercise.reflection)}</p>
        </details>
      )}
    </div>
  );
}
