import type { DualStackLesson } from "@/lib/lab/types";
import { LESSONS_ES_AGENTIC } from "./lessons-agentic";
import { LESSONS_ES_CORE } from "./lessons-core";
import { LESSONS_ES_EXTRA } from "./lessons-extra";
import { LESSONS_ES_MORE } from "./lessons-more";
import type { LessonEs } from "./lessons-types";
import type { Locale } from "./locale";

export const LESSONS_ES: Record<string, LessonEs> = {
  ...LESSONS_ES_CORE,
  ...LESSONS_ES_MORE,
  ...LESSONS_ES_EXTRA,
  ...LESSONS_ES_AGENTIC,
};

export function localizeLesson(lesson: DualStackLesson, locale: Locale): DualStackLesson {
  if (locale === "en") return lesson;
  const o = LESSONS_ES[lesson.kind];
  if (!o) return lesson;
  return {
    ...lesson,
    title: o.title,
    summary: o.summary,
    rails: {
      ...lesson.rails,
      philosophy: o.railsPhil,
      hood: lesson.rails.hood.map((step) => ({
        ...step,
        what: o.railsHood[step.layer] ?? step.what,
      })),
    },
    fastapi: {
      ...lesson.fastapi,
      philosophy: o.fastPhil,
      hood: lesson.fastapi.hood.map((step) => ({
        ...step,
        what: o.fastHood[step.layer] ?? step.what,
      })),
    },
    tradeoffs: {
      velocity: { ...lesson.tradeoffs.velocity, ...o.velocity },
      control: { ...lesson.tradeoffs.control, ...o.control },
      refactor: { ...lesson.tradeoffs.refactor, ...o.refactor },
      runtime: { ...lesson.tradeoffs.runtime, ...o.runtime },
      verdict: o.verdict,
    },
  };
}
