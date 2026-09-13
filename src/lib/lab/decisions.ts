import type { CacheStrategy, CapChoice, Decisions, OrmChoice, ScaleChoice } from "./types";

export const DEFAULT_DECISIONS: Decisions = {
  cap: "cp",
  cache: "aside",
  orm: "active-record",
  scale: "vertical",
};

export const CAP_OPTIONS: { id: CapChoice; title: string; body: string }[] = [
  {
    id: "cp",
    title: "CP — consistency first",
    body: "Refuse writes if the replica or quorum is behind. Correct for ledgers, trips, short-link uniqueness. Availability dips under partition.",
  },
  {
    id: "ap",
    title: "AP — availability first",
    body: "Keep serving, repair later. Correct for presence, feed fan-out, location pings. Readers may see last-write-wins.",
  },
];

export const CACHE_OPTIONS: { id: CacheStrategy; title: string; body: string }[] = [
  {
    id: "aside",
    title: "Cache-aside",
    body: "App reads cache, on miss loads SQL and SETs. You own bust-on-write. Default for hot redirect keys and timelines.",
  },
  {
    id: "through",
    title: "Write-through",
    body: "Writes go to cache and SQL in the same request. Slower writes, fewer ghosts. Good when the row must not vanish.",
  },
  {
    id: "back",
    title: "Write-back",
    body: "Writes ack against cache; a flusher hits SQL later. Fast p50, weak durability. Counters yes, payments no.",
  },
];

export const ORM_OPTIONS: { id: OrmChoice; title: string; body: string }[] = [
  {
    id: "active-record",
    title: "Active Record",
    body: "The model is the row. Rails default. High velocity, N+1 if you forget includes, callbacks fire on every save.",
  },
  {
    id: "data-mapper",
    title: "Data Mapper",
    body: "SQLAlchemy 2.0 / Pydantic. The statement is the query. More typing, fewer surprise queries, better under the stress engine at high RPS.",
  },
];

export const SCALE_OPTIONS: { id: ScaleChoice; title: string; body: string }[] = [
  {
    id: "vertical",
    title: "Vertical",
    body: "Bigger box, more Puma/Uvicorn workers on one host. Cheap until the box is the bottleneck. The stress engine will say so.",
  },
  {
    id: "horizontal",
    title: "Horizontal",
    body: "More hosts behind the load balancer, stateless JWT or sticky cookies. Costs more, survives one dying box.",
  },
];
