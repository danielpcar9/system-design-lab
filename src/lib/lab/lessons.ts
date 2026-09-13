import type { ComponentKind, DualStackLesson } from "./types";
import { LESSONS_AGENTIC } from "./lessons-agentic";
import { LESSONS_CORE } from "./lessons-core";
import { LESSONS_EXTRA } from "./lessons-extra";
import { LESSONS_MORE } from "./lessons-more";

export const LESSONS: DualStackLesson[] = [
  ...LESSONS_CORE,
  ...LESSONS_MORE,
  ...LESSONS_EXTRA,
  ...LESSONS_AGENTIC,
];

const BY_KIND = new Map<ComponentKind, DualStackLesson>(
  LESSONS.map((lesson) => [lesson.kind, lesson]),
);

export function lessonFor(kind: ComponentKind): DualStackLesson {
  const lesson = BY_KIND.get(kind);
  if (!lesson) {
    throw new Error(`No dual-stack lesson for ${kind}`);
  }
  return lesson;
}

export const KIND_ORDER: ComponentKind[] = [
  "auth",
  "database",
  "jobs",
  "rate-limit",
  "cache",
  "api",
  "gateway",
  "authorization",
  "websocket",
  "files",
  "search",
  "queue",
  "nosql",
  "graph",
  "replica",
  "circuit-breaker",
  "load-balancer",
  "cdn",
  "client",
  "vector-db",
  "agent-memory",
  "llm-gateway",
  "sandbox",
  "token-limiter",
  "state-machine",
];
