import { Sheet, SheetContent } from "@/components/ui/sheet";
import { localizeCheat, t, UI } from "@/lib/i18n";
import { CHEATSHEETS } from "@/lib/lab/cheatsheets";
import { useLabStore } from "@/lib/lab/store";
import { cn } from "@/lib/utils";

export function CheatSheetButton() {
  const locale = useLabStore((s) => s.locale);
  const setCheatOpen = useLabStore((s) => s.setCheatOpen);
  return (
    <button
      type="button"
      onClick={() => setCheatOpen(true)}
      className="h-10 shrink-0 rounded-sm border border-border px-3 text-xs text-muted hover:text-fg"
    >
      <span className="sm:hidden">{t(locale, UI.cheatSheetsShort)}</span>
      <span className="hidden sm:inline">{t(locale, UI.cheatSheets)}</span>
    </button>
  );
}

export function CheatSheetDock() {
  const locale = useLabStore((s) => s.locale);
  const open = useLabStore((s) => s.cheatOpen);
  const setOpen = useLabStore((s) => s.setCheatOpen);
  const id = useLabStore((s) => s.cheatId);
  const setId = useLabStore((s) => s.setCheatId);
  const sheets = CHEATSHEETS.map((c) => localizeCheat(c, locale));
  const active = sheets.find((c) => c.id === id) ?? sheets[0];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent title={t(locale, UI.cheatSheets)} side="right">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap gap-2">
            {sheets.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setId(c.id)}
                className={cn(
                  "h-10 rounded-full border px-3 text-xs",
                  active.id === c.id
                    ? "border-accent bg-elevated text-fg"
                    : "border-border text-muted",
                )}
              >
                {c.title}
              </button>
            ))}
          </div>
          <p className="text-xs uppercase tracking-wide text-subtle">{active.kicker}</p>
          <h3 className="font-serif text-2xl italic text-fg">{active.title}</h3>
          <ul className="flex flex-col gap-2">
            {active.body.map((line) => (
              <li key={line} className="text-sm leading-relaxed text-muted">
                {line}
              </li>
            ))}
          </ul>
          {active.rails && (
            <p className="text-sm leading-relaxed">
              <span className="text-rails">Rails. </span>
              <span className="text-muted">{active.rails}</span>
            </p>
          )}
          {active.fastapi && (
            <p className="text-sm leading-relaxed">
              <span className="text-fastapi">FastAPI. </span>
              <span className="text-muted">{active.fastapi}</span>
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
