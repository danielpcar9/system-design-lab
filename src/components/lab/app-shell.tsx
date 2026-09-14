import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { CheatSheetButton, CheatSheetDock } from "@/components/lab/cheatsheets";
import { LensToggle } from "@/components/lab/lens-toggle";
import { LocaleToggle } from "@/components/lab/locale-toggle";
import { t, UI } from "@/lib/i18n";
import { useLabStore } from "@/lib/lab/store";

export function AppShell({
  children,
  kicker,
  title,
  back,
}: {
  children: ReactNode;
  kicker?: string;
  title?: string;
  back?: boolean;
}) {
  const locale = useLabStore((s) => s.locale);
  const setLocale = useLabStore((s) => s.setLocale);
  const lens = useLabStore((s) => s.lens);
  const setLens = useLabStore((s) => s.setLens);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#main"
        className="skip-link"
      >
        {t(locale, UI.skipToMain)}
      </a>
      <header className="sticky top-0 z-20 border-b border-border bg-bg/92">
        <div className="mx-auto flex max-w-7xl min-w-0 items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex items-center gap-3">
            {back && (
              <Link
                to="/"
                className="inline-flex size-10 items-center justify-center rounded-sm text-muted hover:bg-elevated hover:text-fg"
                aria-label={t(locale, UI.backAria)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M10 3L5 8l5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            )}
            <Link to="/" className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-subtle">
                {kicker ?? t(locale, UI.brandKicker)}
              </p>
              <p className="truncate font-serif text-xl italic text-fg">
                {title ?? t(locale, UI.brandTitle)}
              </p>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CheatSheetButton />
            <LocaleToggle value={locale} onChange={setLocale} />
            <LensToggle value={lens} onChange={setLens} />
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <CheatSheetDock />
    </div>
  );
}
