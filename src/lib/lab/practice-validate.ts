import type { Bilingual } from "../i18n/locale.ts";
import { ERROR_TIPS, type Exercise, type ExerciseTest } from "./curriculum.ts";
import type { StackId } from "./types.ts";

export type TestResult = {
  id: string;
  visible: boolean;
  label: Bilingual;
  ok: boolean;
};

export function runExerciseTests(exercise: Exercise, code: string, stack: StackId): TestResult[] {
  return exercise.tests.map((test) => evaluateTest(test, code, stack));
}

export function evaluateTest(test: ExerciseTest, code: string, stack: StackId): TestResult {
  const trimmed = code.trim();
  return {
    id: test.id,
    visible: test.visible,
    label: test.label,
    ok: trimmed.length > 0 && test.match(code, stack),
  };
}

export function visibleResults(results: TestResult[]): TestResult[] {
  return results.filter((item) => item.visible);
}

export function hiddenResults(results: TestResult[]): TestResult[] {
  return results.filter((item) => !item.visible);
}

export function failedIds(results: TestResult[]): string[] {
  return results.filter((item) => !item.ok).map((item) => item.id);
}

export function allPassed(results: TestResult[]): boolean {
  return results.length > 0 && results.every((item) => item.ok);
}

export function tipFor(testId: string): Bilingual | undefined {
  return ERROR_TIPS[testId];
}

export function frequentErrorIds(history: string[][]): string[] {
  const counts = new Map<string, number>();
  for (const round of history) {
    for (const id of round) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
