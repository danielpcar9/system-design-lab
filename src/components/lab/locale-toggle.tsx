import { LOCALES, t, UI, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";



export function LocaleToggle({
  value,
  onChange,
}: {
  value: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <div
      className="inline-flex h-10 shrink-0 items-center rounded-md border border-border bg-elevated p-1"
      role="radiogroup"
      aria-label={t(value, UI.localeAria)}
    >
      {LOCALES.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            "h-8 min-w-10 rounded-sm px-2.5 text-xs font-medium tracking-wide transition-[color,background-color] duration-150",
            value === opt.id ? "bg-surface text-fg" : "text-muted hover:text-fg",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
