export type Locale = "en" | "es";

export const LOCALES: { id: Locale; label: string }[] = [
  { id: "es", label: "ES" },
  { id: "en", label: "EN" },
];

export function tx(locale: Locale, en: string, es: string): string {
  return locale === "es" ? es : en;
}

export type Bilingual = { en: string; es: string };

export function t(locale: Locale, copy: Bilingual): string {
  return locale === "es" ? copy.es : copy.en;
}
