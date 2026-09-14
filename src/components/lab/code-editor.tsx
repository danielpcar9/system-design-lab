import { useRef } from "react";
import { tokenize } from "@/lib/lab/highlighter";
import type { SnippetLang } from "@/lib/lab/highlighter";
import { cn } from "@/lib/utils";

export function CodeEditor({
  value,
  onChange,
  language,
  label,
  filename,
}: {
  value: string;
  onChange: (next: string) => void;
  language: SnippetLang;
  label: string;
  filename: string;
}) {
  const lines = tokenize(value || " ", language);
  const preRef = useRef<HTMLPreElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  function syncScroll() {
    const pre = preRef.current;
    const area = areaRef.current;
    if (!pre || !area) return;
    pre.scrollTop = area.scrollTop;
    pre.scrollLeft = area.scrollLeft;
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-bg focus-within:border-accent">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-xs text-muted">{filename}</span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-subtle">{language}</span>
      </div>
      <div className="relative min-h-64">
        <pre
          ref={preRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden p-3 font-mono text-[12px] leading-5"
        >
          <code>
            {lines.map((tokens, i) => (
              <span key={i} className="flex">
                <span className="mr-4 w-6 shrink-0 select-none text-right text-subtle">{i + 1}</span>
                <span className="whitespace-pre">
                  {tokens.map((tok, j) => (
                    <span key={j} className={`tok-${tok.k}`}>
                      {tok.t}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </code>
        </pre>
        <textarea
          ref={areaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={syncScroll}
          spellCheck={false}
          aria-label={label}
          className={cn(
            "relative min-h-64 w-full resize-y overflow-auto bg-transparent p-3 pl-[3.25rem]",
            "font-mono text-[12px] leading-5 text-transparent caret-fg outline-none",
          )}
        />
      </div>
    </div>
  );
}
