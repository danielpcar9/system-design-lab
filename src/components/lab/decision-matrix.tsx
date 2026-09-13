import {
  CACHE_OPTIONS,
  CAP_OPTIONS,
  ORM_OPTIONS,
  SCALE_OPTIONS,
} from "@/lib/lab/decisions";
import { localizeCache, localizeCap, localizeOrm, localizeScale, t, UI } from "@/lib/i18n";
import { useLabStore } from "@/lib/lab/store";
import { cn } from "@/lib/utils";

function Group<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { id: T; title: string; body: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs uppercase tracking-wide text-subtle">{title}</legend>
      <div className="mt-2 grid gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-lg border p-3 text-left transition-[border-color] duration-150",
              value === opt.id
                ? "border-accent bg-elevated"
                : "border-border hover:border-border-strong",
            )}
          >
            <p className="text-sm font-medium text-fg">{opt.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{opt.body}</p>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function DecisionMatrix() {
  const locale = useLabStore((s) => s.locale);
  const decisions = useLabStore((s) => s.decisions);
  const setDecision = useLabStore((s) => s.setDecision);
  const lens = useLabStore((s) => s.lens);
  const setLens = useLabStore((s) => s.setLens);
  const lensName = lens === "split" ? t(locale, UI.split) : lens === "rails" ? "Rails" : "FastAPI";

  return (
    <div className="flex flex-col gap-6 px-4 py-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-subtle">{t(locale, UI.decisionsKicker)}</p>
        <h2 className="mt-1 font-serif text-2xl italic">{t(locale, UI.decisionsTitle)}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t(locale, UI.decisionsLead)}</p>
      </header>
      <Group
        title={t(locale, UI.capTitle)}
        options={CAP_OPTIONS.map((o) => localizeCap(locale, o.id, o))}
        value={decisions.cap}
        onChange={(cap) => setDecision("cap", cap)}
      />
      <Group
        title={t(locale, UI.cacheStrategy)}
        options={CACHE_OPTIONS.map((o) => localizeCache(locale, o.id, o))}
        value={decisions.cache}
        onChange={(cache) => setDecision("cache", cache)}
      />
      <Group
        title={t(locale, UI.ormTitle)}
        options={ORM_OPTIONS.map((o) => localizeOrm(locale, o.id, o))}
        value={decisions.orm}
        onChange={(orm) => {
          setDecision("orm", orm);
          setLens(orm === "active-record" ? "rails" : "fastapi");
        }}
      />
      <p className="text-xs text-subtle">
        {t(locale, UI.lensNow).replace("{lens}", lensName)}
      </p>
      <Group
        title={t(locale, UI.scaling)}
        options={SCALE_OPTIONS.map((o) => localizeScale(locale, o.id, o))}
        value={decisions.scale}
        onChange={(scale) => setDecision("scale", scale)}
      />
    </div>
  );
}
