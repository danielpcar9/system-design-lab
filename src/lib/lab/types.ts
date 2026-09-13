export type StackId = "rails" | "fastapi";
export type Lens = "split" | StackId;
export type InspectorTab = "code" | "hood" | "tradeoffs";
export type StudioMode = "design" | "stress" | "decisions" | "interview";
export type FlowKind = "read" | "write" | "mixed";
export type SyncKind = "sync" | "async";
export type CapChoice = "cp" | "ap";
export type CacheStrategy = "aside" | "through" | "back";
export type OrmChoice = "active-record" | "data-mapper";
export type ScaleChoice = "vertical" | "horizontal";
export type InterviewLevel = "junior" | "mid" | "senior" | "staff" | "ai-engineer";
export type InterviewTrack = "backend" | "agentic";
export type KindFamily = "compute" | "speed" | "persist" | "agentic";
export type ScenarioTrack = "classic" | "agentic";

export type ComponentKind =
  | "client"
  | "cdn"
  | "load-balancer"
  | "gateway"
  | "api"
  | "auth"
  | "authorization"
  | "database"
  | "nosql"
  | "graph"
  | "replica"
  | "cache"
  | "jobs"
  | "queue"
  | "rate-limit"
  | "files"
  | "websocket"
  | "search"
  | "circuit-breaker"
  | "vector-db"
  | "agent-memory"
  | "llm-gateway"
  | "sandbox"
  | "token-limiter"
  | "state-machine";

export type CodeSnippet = {
  filename: string;
  language: "ruby" | "python" | "sh";
  code: string;
};

export type HoodStep = {
  layer: string;
  what: string;
  automatic: boolean;
};

export type AxisWinner = StackId | "tie";

export type TradeoffAxis = {
  rails: string;
  fastapi: string;
  winner: AxisWinner;
};

export type DualStackLesson = {
  kind: ComponentKind;
  title: string;
  summary: string;
  rails: {
    label: string;
    philosophy: string;
    snippets: CodeSnippet[];
    hood: HoodStep[];
  };
  fastapi: {
    label: string;
    philosophy: string;
    snippets: CodeSnippet[];
    hood: HoodStep[];
  };
  tradeoffs: {
    velocity: TradeoffAxis;
    control: TradeoffAxis;
    refactor: TradeoffAxis;
    runtime: TradeoffAxis;
    verdict: string;
  };
};

export type LabNode = {
  id: string;
  kind: ComponentKind;
  x: number;
  y: number;
};

export type LabEdge = {
  from: string;
  to: string;
  flow?: FlowKind;
  sync?: SyncKind;
};

export type Scenario = {
  id: string;
  name: string;
  prompt: string;
  kicker: string;
  brief: string;
  load: string;
  constraint: string;
  track: ScenarioTrack;
  nodes: LabNode[];
  edges: LabEdge[];
};

export type Decisions = {
  cap: CapChoice;
  cache: CacheStrategy;
  orm: OrmChoice;
  scale: ScaleChoice;
};

export type LoadInputs = {
  rps: number;
  readRatio: number;
  dataGb: number;
  tokPerReq: number;
};

export type Diagnosis = {
  id: string;
  title: string;
  body: string;
  fixKind?: ComponentKind;
};

export type SimResult = {
  p50: number;
  p99: number;
  cost: number;
  availability: number;
  capacity: number;
  utilization: number;
  collapsed: boolean;
  bottleneck: string;
  diagnoses: Diagnosis[];
  series: { t: number; ms: number }[];
  tokensPerSec: number;
  llmP99: number;
  aiCost: number;
  agentic: boolean;
};
