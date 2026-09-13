export type AxisEs = { rails: string; fastapi: string };

export type LessonEs = {
  title: string;
  summary: string;
  railsPhil: string;
  fastPhil: string;
  railsHood: Record<string, string>;
  fastHood: Record<string, string>;
  velocity: AxisEs;
  control: AxisEs;
  refactor: AxisEs;
  runtime: AxisEs;
  verdict: string;
};
