import type { ReactNode } from "react";
import { tokenize } from "@/lib/lab/highlighter";
import type { CodeSnippet } from "@/lib/lab/types";
import { cn } from "@/lib/utils";

export function CodeBlock({
  snippet,
  stack,
}: {
  snippet: CodeSnippet;
  stack: "rails" | "fastapi";
}) {
  const lines = tokenize(snippet.code, snippet.language);
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-md border border-border bg-bg",
        stack === "rails" ? "border-t-2 border-t-rails" : "border-t-2 border-t-fastapi",
      )}
    >
      <figcaption className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-xs text-muted">{snippet.filename}</span>
        <span
          className={cn(
            "text-[10px] uppercase tracking-[0.14em]",
            stack === "rails" ? "text-rails" : "text-fastapi",
          )}
        >
          {snippet.language}
        </span>
      </figcaption>
      <pre className="overflow-x-auto p-3 text-[12px] leading-5 font-mono">
        <code>
          {lines.map((tokens, i) => (
            <span key={i} className="flex">
              <span className="mr-4 w-6 shrink-0 select-none text-right text-subtle">
                {i + 1}
              </span>
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
    </figure>
  );
}

export function StackColumn({
  stack,
  label,
  philosophy,
  children,
}: {
  stack: "rails" | "fastapi";
  label: string;
  philosophy: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 flex flex-col gap-3">
      <header>
        <p
          className={cn(
            "text-[10px] uppercase tracking-[0.16em]",
            stack === "rails" ? "text-rails" : "text-fastapi",
          )}
        >
          {stack === "rails" ? "Ruby on Rails" : "FastAPI"}
        </p>
        <h3 className="mt-1 font-serif text-xl text-fg italic">{label}</h3>
      </header>
      <p className="text-xs text-muted leading-relaxed">{philosophy}</p>
      {children}
    </div>
  );
}
