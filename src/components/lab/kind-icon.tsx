import {
  Boxes,
  Brain,
  Copy,
  Cylinder,
  Database,
  Gauge,
  GitFork,
  Globe,
  HardDrive,
  KeyRound,
  Network,
  Radio,
  Route,
  Scale,
  Search,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  Terminal,
  Timer,
  Unplug,
  Waypoints,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ComponentKind } from "@/lib/lab/types";

const ICONS: Record<ComponentKind, LucideIcon> = {
  client: Smartphone,
  cdn: Globe,
  "load-balancer": Scale,
  gateway: Waypoints,
  api: Boxes,
  auth: KeyRound,
  authorization: Shield,
  database: Database,
  nosql: Cylinder,
  graph: GitFork,
  replica: Copy,
  cache: Zap,
  jobs: Timer,
  queue: Workflow,
  "rate-limit": Gauge,
  files: HardDrive,
  websocket: Radio,
  search: Search,
  "circuit-breaker": Unplug,
  "vector-db": Sparkles,
  "agent-memory": Brain,
  "llm-gateway": Route,
  sandbox: Terminal,
  "token-limiter": Gauge,
  "state-machine": Network,
};

export function KindIcon({
  kind,
  className,
}: {
  kind: ComponentKind;
  className?: string;
}) {
  const Icon = ICONS[kind] ?? Share2;
  return <Icon className={className} strokeWidth={1.5} aria-hidden="true" />;
}
