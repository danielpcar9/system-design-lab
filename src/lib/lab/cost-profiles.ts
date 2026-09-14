export type CostProfileId = "small" | "medium" | "large";

export const COST_PROFILES: Record<
  CostProfileId,
  { label: { en: string; es: string }; postgres: number; redis: number; workers: number; api: number; note: { en: string; es: string } }
> = {
  small: {
    label: { en: "Small", es: "Pequeño" },
    postgres: 1,
    redis: 0.4,
    workers: 0.5,
    api: 0.8,
    note: {
      en: "Single-region toy load. Relative units, not dollars.",
      es: "Carga de juguete en una región. Unidades relativas, no dólares.",
    },
  },
  medium: {
    label: { en: "Medium", es: "Mediano" },
    postgres: 2.2,
    redis: 1,
    workers: 1.4,
    api: 1.6,
    note: {
      en: "Read replicas + a cache box. Still an educational estimate.",
      es: "Read replicas + una caja de cache. Sigue siendo una estimación educativa.",
    },
  },
  large: {
    label: { en: "Large", es: "Grande" },
    postgres: 4.5,
    redis: 2.1,
    workers: 3.2,
    api: 3.8,
    note: {
      en: "Multi-AZ sketch. Not a cloud invoice.",
      es: "Bosquejo multi-AZ. No es una factura cloud.",
    },
  },
};

export function scaleEducationalCost(base: number, profile: CostProfileId): number {
  const p = COST_PROFILES[profile];
  const mix = (p.postgres + p.redis + p.workers + p.api) / 4;
  return Math.round(base * mix);
}
