import { CodeBlock, StackColumn } from "@/components/lab/code-block";
import { HoodStack } from "@/components/lab/hood-stack";
import { SetupEnvironment } from "@/components/lab/setup-env";
import { Tradeoffs } from "@/components/lab/tradeoffs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t, UI } from "@/lib/i18n";
import { useLabStore } from "@/lib/lab/store";
import type { DualStackLesson, InspectorTab, Lens } from "@/lib/lab/types";
import { cn } from "@/lib/utils";

export function DualStackViewer({
  lesson,
  lens,
  tab,
  onTab,
  compact,
}: {
  lesson: DualStackLesson;
  lens: Lens;
  tab: InspectorTab;
  onTab: (tab: InspectorTab) => void;
  compact?: boolean;
}) {
  const locale = useLabStore((s) => s.locale);
  const showRails = lens !== "fastapi";
  const showFast = lens !== "rails";

  return (
    <div className="flex min-h-0 flex-col">
      <header className={cn("px-4 pt-3", compact && "px-0 pt-0")}>
        <p className="text-[10px] uppercase tracking-[0.18em] text-subtle">
          {t(locale, UI.codeHoodKicker)}
        </p>
        <h2 className="mt-1 font-serif text-2xl italic text-fg">{lesson.title}</h2>
        <p className="mt-2 max-w-prose text-sm text-muted leading-relaxed">{lesson.summary}</p>
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) => onTab(v as InspectorTab)}
        className={cn("mt-4 px-4 pb-6", compact && "px-0")}
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="code">{t(locale, UI.tabCode)}</TabsTrigger>
          <TabsTrigger value="hood">{t(locale, UI.tabHood)}</TabsTrigger>
          <TabsTrigger value="tradeoffs">{t(locale, UI.tabTradeoffs)}</TabsTrigger>
        </TabsList>

        <TabsContent value="code">
          <SetupEnvironment lens={lens} />
          <div
            className={cn(
              "grid gap-5",
              showRails && showFast ? "xl:grid-cols-2" : "grid-cols-1",
            )}
          >
            {showRails && (
              <StackColumn
                stack="rails"
                label={lesson.rails.label}
                philosophy={lesson.rails.philosophy}
              >
                <div className="flex flex-col gap-3">
                  {lesson.rails.snippets.map((s) => (
                    <CodeBlock key={s.filename} snippet={s} stack="rails" />
                  ))}
                </div>
              </StackColumn>
            )}
            {showFast && (
              <StackColumn
                stack="fastapi"
                label={lesson.fastapi.label}
                philosophy={lesson.fastapi.philosophy}
              >
                <div className="flex flex-col gap-3">
                  {lesson.fastapi.snippets.map((s) => (
                    <CodeBlock key={s.filename} snippet={s} stack="fastapi" />
                  ))}
                </div>
              </StackColumn>
            )}
          </div>
        </TabsContent>

        <TabsContent value="hood">
          <HoodStack lesson={lesson} lens={lens} />
        </TabsContent>

        <TabsContent value="tradeoffs">
          <Tradeoffs lesson={lesson} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
