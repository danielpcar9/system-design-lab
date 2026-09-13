import { t, UI } from "@/lib/i18n";
import { useLabStore } from "@/lib/lab/store";
import type { Lens } from "@/lib/lab/types";
import { cn } from "@/lib/utils";

export function LensToggle({
  value,
  onChange,
}: {
  value: Lens;
  onChange: (lens: Lens) => void;
}) {
  const locale = useLabStore((s) => s.locale);
  const options: { id: Lens; label: string }[] = [
    { id: "rails", label: "Rails" },
    { id: "split", label: t(locale, UI.split) },
    { id: "fastapi", label: "FastAPI" },
  ];

  return (
    <div
      className="inline-flex h-10 shrink-0 items-center rounded-md border border-border bg-elevated p-1"
      role="radiogroup"
      aria-label={t(locale, UI.lensAria)}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            "h-8 min-w-16 rounded-sm px-3 text-xs font-medium transition-[color,background-color] duration-150",
            value === opt.id
              ? opt.id === "rails"
                ? "bg-rails-dim text-rails"
                : opt.id === "fastapi"
                  ? "bg-fastapi-dim text-fastapi"
                  : "bg-surface text-fg"
              : "text-muted hover:text-fg",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
